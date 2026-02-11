const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const db = require('./database');
const { uploadTelegramPhoto } = require('./cloudinary');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const FRONTEND_URL = process.env.FRONTEND_URL;

// Создаём бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Хранилище для временных данных при добавлении товара
const tempProductData = {};

console.log('🤖 Telegram бот запущен...');

// ========== КОМАНДЫ ==========

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Сохраняем пользователя
  await db.upsertUser(userId.toString(), {
    username: msg.from.username,
    firstName: msg.from.first_name,
    lastName: msg.from.last_name,
    lastActive: new Date().toISOString()
  });
  
  await db.updateStats('userVisit', userId.toString());
  
  const welcomeMessage = `
👋 Привет, ${msg.from.first_name}!

Добро пожаловать в наш магазин стильной одежды! 

🛍️ Нажмите на кнопку ниже, чтобы открыть каталог товаров.
  `;

  const isSecureFrontend = FRONTEND_URL && FRONTEND_URL.startsWith('https://');

  // Для продакшена (https) используем Mini App кнопку
  if (isSecureFrontend) {
    await bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛍️ Открыть магазин', web_app: { url: FRONTEND_URL } }]
        ]
      }
    });
  } else {
    // Для локальной разработки (http://localhost:5173 и т.п.) Telegram не даёт web_app с http
    // Поэтому просто отправляем ссылку текстом или обычной URL-кнопкой
    let text = welcomeMessage;
    if (FRONTEND_URL) {
      text += `\nОткрой каталог по ссылке: ${FRONTEND_URL}`;
    }

    await bot.sendMessage(chatId, text);
  }
});

// Команда /admin - только для администратора
bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return bot.sendMessage(chatId, '❌ У вас нет доступа к админ-панели');
  }
  
  const adminMenu = `
🔧 <b>Админ-панель</b>

Доступные команды:

/add_product - Добавить товар
/list_products - Список всех товаров
/delete_product [ID] - Удалить товар
/edit_product [ID] - Редактировать товар
/stats - Статистика магазина
/categories - Управление категориями

Например: <code>/delete_product 1234567890</code>
  `;
  
  bot.sendMessage(chatId, adminMenu, { parse_mode: 'HTML' });
});

// ========== ДОБАВЛЕНИЕ ТОВАРА ==========

bot.onText(/\/add_product/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return bot.sendMessage(chatId, '❌ У вас нет доступа');
  }
  
  // Инициализируем временные данные
  tempProductData[chatId] = {
    step: 'name',
    photos: []
  };
  
  bot.sendMessage(chatId, '📝 <b>Добавление нового товара</b>\n\nШаг 1/5: Введите название товара:', {
    parse_mode: 'HTML'
  });
});

// Обработка текстовых сообщений для добавления товара
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) return;
  if (!tempProductData[chatId]) return;
  if (msg.text && msg.text.startsWith('/')) return; // Игнорируем команды
  
  const data = tempProductData[chatId];
  
  try {
    switch (data.step) {
      case 'name':
        if (!msg.text) return;
        data.name = msg.text;
        data.step = 'price';
        bot.sendMessage(chatId, '💰 Шаг 2/5: Введите цену (только число, например: 2999):', {
          parse_mode: 'HTML'
        });
        break;
        
      case 'price':
        if (!msg.text) return;
        const price = parseInt(msg.text);
        if (isNaN(price) || price <= 0) {
          return bot.sendMessage(chatId, '❌ Некорректная цена. Введите число:');
        }
        data.price = price;
        data.step = 'description';
        bot.sendMessage(chatId, '📄 Шаг 3/5: Введите описание товара:', {
          parse_mode: 'HTML'
        });
        break;
        
      case 'description':
        if (!msg.text) return;
        data.description = msg.text;
        data.step = 'category';
        
        bot.sendMessage(chatId, '🏷️ Шаг 4/5: Выберите категорию:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '👟 Обувь', callback_data: 'cat_Обувь' }],
              [{ text: '👕 Футболки', callback_data: 'cat_Футболки' }],
              [{ text: '🧥 Худи', callback_data: 'cat_Худи' }],
              [{ text: '🎒 Аксессуары', callback_data: 'cat_Аксессуары' }],
              [{ text: '👖 Джинсы', callback_data: 'cat_Джинсы' }],
              [{ text: '🧢 Головные уборы', callback_data: 'cat_Головные уборы' }]
            ]
          }
        });
        break;
        
      case 'photos':
        bot.sendMessage(chatId, '⏳ Пожалуйста, отправьте фото...');
        break;
    }
  } catch (error) {
    console.error('Ошибка обработки сообщения:', error);
    bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте /add_product заново.');
    delete tempProductData[chatId];
  }
});

// Обработка выбора категории
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = tempProductData[chatId];
  
  if (query.data.startsWith('cat_')) {
    const category = query.data.replace('cat_', '');
    data.category = category;
    data.step = 'photos';
    
    await bot.answerCallbackQuery(query.id);
    await bot.editMessageText(`✅ Категория: ${category}`, {
      chat_id: chatId,
      message_id: query.message.message_id
    });
    
    bot.sendMessage(chatId, 
      '📸 Шаг 5/5: Отправьте фото товара (можно несколько)\n\n' +
      'После отправки всех фото нажмите /done для завершения', {
      parse_mode: 'HTML'
    });
  } else if (query.data.startsWith('delete_')) {
    const productId = query.data.replace('delete_', '');
    const success = await db.deleteProduct(productId);
    
    if (success) {
      await bot.answerCallbackQuery(query.id, { text: '✅ Товар удалён' });
      await bot.editMessageText('✅ Товар успешно удалён', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
    } else {
      await bot.answerCallbackQuery(query.id, { text: '❌ Ошибка' });
    }
  }
});

// Обработка фотографий
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) return;
  if (!tempProductData[chatId] || tempProductData[chatId].step !== 'photos') return;
  
  try {
    // Получаем фото наилучшего качества
    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;
    
    bot.sendMessage(chatId, '⏳ Загружаю фото...');
    
    // Загружаем в Cloudinary
    const photoUrl = await uploadTelegramPhoto(bot, fileId);
    tempProductData[chatId].photos.push(photoUrl);
    
    bot.sendMessage(chatId, 
      `✅ Фото ${tempProductData[chatId].photos.length} добавлено!\n\n` +
      'Отправьте ещё фото или нажмите /done для завершения'
    );
  } catch (error) {
    console.error('Ошибка загрузки фото:', error);
    bot.sendMessage(chatId, '❌ Ошибка загрузки фото. Попробуйте ещё раз.');
  }
});

// Завершение добавления товара
bot.onText(/\/done/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) return;
  if (!tempProductData[chatId]) return;
  
  const data = tempProductData[chatId];
  
  if (data.photos.length === 0) {
    return bot.sendMessage(chatId, '❌ Добавьте хотя бы одно фото!');
  }
  
  try {
    // Создаём товар
    const product = await db.addProduct({
      name: data.name,
      price: data.price,
      description: data.description,
      category: data.category,
      photos: data.photos
    });
    
    // Отправляем подтверждение с превью
    const message = `
✅ <b>Товар успешно добавлен!</b>

📦 Название: ${product.name}
💰 Цена: ${product.price} ₽
🏷️ Категория: ${product.category}
📸 Фото: ${product.photos.length} шт.

ID: <code>${product.id}</code>
    `;
    
    await bot.sendPhoto(chatId, product.photos[0], {
      caption: message,
      parse_mode: 'HTML'
    });
    
    // Очищаем временные данные
    delete tempProductData[chatId];
    
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    bot.sendMessage(chatId, '❌ Ошибка создания товара. Попробуйте ещё раз.');
  }
});

// ========== СПИСОК ТОВАРОВ ==========

bot.onText(/\/list_products/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) return;
  
  try {
    const products = await db.getAllProducts();
    
    if (products.length === 0) {
      return bot.sendMessage(chatId, '📭 Товаров пока нет. Добавьте первый товар через /add_product');
    }
    
    bot.sendMessage(chatId, `📦 <b>Всего товаров: ${products.length}</b>`, { parse_mode: 'HTML' });
    
    for (const product of products) {
      const message = `
<b>${product.name}</b>
💰 ${product.price} ₽
🏷️ ${product.category}
👁 Просмотров: ${product.views || 0}

ID: <code>${product.id}</code>
      `;
      
      await bot.sendPhoto(chatId, product.photos[0], {
        caption: message,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🗑️ Удалить', callback_data: `delete_${product.id}` }]
          ]
        }
      });
      
      // Пауза между сообщениями
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Ошибка получения списка:', error);
    bot.sendMessage(chatId, '❌ Ошибка получения списка товаров');
  }
});

// ========== УДАЛЕНИЕ ТОВАРА ==========

bot.onText(/\/delete_product (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const productId = match[1];
  
  if (userId !== ADMIN_ID) return;
  
  try {
    const product = await db.getProductById(productId);
    
    if (!product) {
      return bot.sendMessage(chatId, '❌ Товар не найден');
    }
    
    bot.sendMessage(chatId, '❓ Вы уверены, что хотите удалить этот товар?', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Да, удалить', callback_data: `delete_${productId}` },
            { text: '❌ Отмена', callback_data: 'cancel' }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    bot.sendMessage(chatId, '❌ Ошибка удаления товара');
  }
});

// ========== СТАТИСТИКА ==========

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) return;
  
  try {
    const stats = await db.getStats();
    
    let message = `
📊 <b>Статистика магазина</b>

📦 Всего товаров: ${stats.totalProducts}
👥 Всего пользователей: ${stats.totalUsers}
👁 Всего просмотров: ${stats.totalViews}

<b>По категориям:</b>
`;
    
    for (const [category, count] of Object.entries(stats.categories)) {
      message += `${category}: ${count} шт.\n`;
    }
    
    message += '\n<b>Топ-5 популярных товаров:</b>\n';
    
    stats.topProducts.forEach((item, index) => {
      message += `${index + 1}. ${item.product.name} - ${item.views} просмотров\n`;
    });
    
    message += '\n<b>Статистика за 7 дней:</b>\n';
    
    stats.last7Days.forEach(day => {
      message += `${day.date}: ${day.views} просмотров, ${day.users} пользователей\n`;
    });
    
    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    bot.sendMessage(chatId, '❌ Ошибка получения статистики');
  }
});

// ========== КАТЕГОРИИ ==========

bot.onText(/\/categories/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) return;
  
  const categories = [
    '👟 Обувь',
    '👕 Футболки',
    '🧥 Худи',
    '🎒 Аксессуары',
    '👖 Джинсы',
    '🧢 Головные уборы'
  ];
  
  bot.sendMessage(chatId, 
    '<b>📁 Текущие категории:</b>\n\n' + categories.join('\n'),
    { parse_mode: 'HTML' }
  );
});

// Экспортируем бота
module.exports = bot;
