const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Выбираем БД в зависимости от USE_MONGODB
const USE_MONGODB = process.env.USE_MONGODB === 'true' && process.env.MONGODB_URI;
const db = USE_MONGODB ? require('./mongodb') : require('./database');

console.log('🤖 Telegram бот используе БД:', USE_MONGODB ? 'MongoDB' : 'JSON');

const { uploadTelegramPhoto } = require('./cloudinary');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const FRONTEND_URL = process.env.FRONTEND_URL;

// Создаём бота только если не запущен другой инстанс
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Хранилище для временных данных при добавлении товара
const tempProductData = {};

console.log('🤖 Telegram бот запущен...');
console.log('👤 Admin ID:', ADMIN_ID);

// Обработка ошибок polling
bot.on('polling_error', (error) => {
  if (error.code === 'ETELEGRAM' && error.message.includes('409')) {
    console.error('⚠️  БОТ УЖЕ ЗАПУЩЕН! Остановите другой инстанс.');
    console.error('⚠️  Проверьте что бот не запущен локально или на другом сервере');
  } else {
    console.error('Polling error:', error);
  }
});

// ========== КОМАНДЫ ==========

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
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
      // Для локальной разработки
      await bot.sendMessage(chatId, welcomeMessage + `\n\nСсылка: ${FRONTEND_URL || 'не настроена'}`);
    }
  } catch (error) {
    console.error('Ошибка в /start:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
  }
});

// Команда /admin - только для админа
bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ У вас нет доступа к админ-панели');
    return;
  }
  
  const adminMenu = `
🔧 Админ-панель

Доступные команды:
/add_product - Добавить товар
/list_products - Список товаров
/delete_product [ID] - Удалить товар
/stats - Статистика
  `;
  
  await bot.sendMessage(chatId, adminMenu);
});

// Команда /add_product - добавление товара
bot.onText(/\/add_product/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ У вас нет прав для добавления товаров');
    return;
  }
  
  // Инициализируем временные данные
  tempProductData[chatId] = {
    step: 'name'
  };
  
  await bot.sendMessage(chatId, '📝 Введите название товара:');
});

// Обработка текстовых сообщений для создания товара
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Проверяем что это админ и идёт процесс добавления товара
  if (userId !== ADMIN_ID || !tempProductData[chatId]) {
    return;
  }
  
  const data = tempProductData[chatId];
  const text = msg.text;
  
  // Игнорируем команды
  if (text && text.startsWith('/')) {
    return;
  }
  
  try {
    switch (data.step) {
      case 'name':
        if (!text) return;
        data.name = text;
        data.step = 'price';
        await bot.sendMessage(chatId, '💰 Введите цену товара (только число):');
        break;
        
      case 'price':
        if (!text) return;
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) {
          await bot.sendMessage(chatId, '❌ Неправильная цена. Введите число (например: 2990):');
          return;
        }
        data.price = price;
        data.step = 'description';
        await bot.sendMessage(chatId, '📄 Введите описание товара:');
        break;
        
      case 'description':
        if (!text) return;
        data.description = text;
        data.step = 'category';
        
        // Отправляем кнопки с категориями
        await bot.sendMessage(chatId, '🏷️ Выберите категорию:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '👟 Обувь', callback_data: 'cat_Обувь' }],
              [{ text: '👕 Худи', callback_data: 'cat_Худи' }],
              [{ text: '👔 Футболки', callback_data: 'cat_Футболки' }],
              [{ text: '🎒 Аксессуары', callback_data: 'cat_Аксессуары' }]
            ]
          }
        });
        break;
        
      case 'photo':
        // Фото обрабатываются отдельным обработчиком
        break;
    }
  } catch (error) {
    console.error('Ошибка обработки сообщения:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте снова.');
    delete tempProductData[chatId];
  }
});

// Обработка выбора категории
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = tempProductData[chatId];
  
  if (userId !== ADMIN_ID || !data) {
    await bot.answerCallbackQuery(query.id, { text: '❌ Ошибка' });
    return;
  }
  
  if (query.data.startsWith('cat_')) {
    const category = query.data.replace('cat_', '');
    data.category = category;
    data.step = 'photo';
    data.photos = [];
    
    await bot.answerCallbackQuery(query.id, { text: `Выбрана категория: ${category}` });
    await bot.sendMessage(chatId, `
📸 Отправьте фото товара (можно несколько).

Когда закончите, отправьте команду /done
    `);
  }
});

// Обработка фото
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const data = tempProductData[chatId];
  
  if (userId !== ADMIN_ID || !data || data.step !== 'photo') {
    return;
  }
  
  try {
    const photo = msg.photo[msg.photo.length - 1]; // Берём самое большое фото
    const fileId = photo.file_id;
    
    await bot.sendMessage(chatId, '⏳ Загружаем фото...');
    
    // Загружаем в Cloudinary
    const photoUrl = await uploadTelegramPhoto(bot, fileId);
    
    if (photoUrl) {
      data.photos.push(photoUrl);
      await bot.sendMessage(chatId, `✅ Фото добавлено (${data.photos.length})\n\nМожете добавить ещё или отправить /done`);
    } else {
      await bot.sendMessage(chatId, '❌ Ошибка загрузки фото');
    }
  } catch (error) {
    console.error('Ошибка загрузки фото:', error);
    await bot.sendMessage(chatId, '❌ Ошибка загрузки фото');
  }
});

// Команда /done - завершение создания товара
bot.onText(/\/done/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const data = tempProductData[chatId];
  
  if (userId !== ADMIN_ID || !data) {
    return;
  }
  
  try {
    // Проверяем что все поля заполнены
    if (!data.name || !data.price || !data.description || !data.category || !data.photos || data.photos.length === 0) {
      await bot.sendMessage(chatId, '❌ Не все поля заполнены. Начните сначала с /add_product');
      delete tempProductData[chatId];
      return;
    }
    
    // Создаём товар в БД
    const product = await db.addProduct({
      name: data.name,
      price: data.price,
      description: data.description,
      category: data.category,
      photos: data.photos
    });
    
    if (product) {
      await bot.sendMessage(chatId, `
✅ Товар успешно добавлен!

ID: ${product.id}
Название: ${product.name}
Цена: ${product.price} ₽
Категория: ${product.category}
Фото: ${product.photos.length} шт.
      `);
      
      console.log('✅ Товар добавлен:', product.id, product.name);
    } else {
      await bot.sendMessage(chatId, '❌ Ошибка добавления товара в БД');
    }
    
    // Очищаем временные данные
    delete tempProductData[chatId];
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка при создании товара');
    delete tempProductData[chatId];
  }
});

// Команда /list_products
bot.onText(/\/list_products/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ У вас нет доступа');
    return;
  }
  
  try {
    const products = await db.getAllProducts();
    
    if (products.length === 0) {
      await bot.sendMessage(chatId, '📦 Товаров пока нет');
      return;
    }
    
    let message = `📦 Всего товаров: ${products.length}\n\n`;
    
    products.forEach((p, i) => {
      message += `${i + 1}. ${p.name}\n`;
      message += `   ID: ${p.id}\n`;
      message += `   Цена: ${p.price} ₽\n`;
      message += `   Категория: ${p.category}\n`;
      message += `   Просмотры: ${p.views || 0}\n\n`;
    });
    
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    await bot.sendMessage(chatId, '❌ Ошибка получения товаров');
  }
});

// Команда /delete_product
bot.onText(/\/delete_product (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const productId = match[1];
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ У вас нет доступа');
    return;
  }
  
  try {
    const deleted = await db.deleteProduct(productId);
    
    if (deleted) {
      await bot.sendMessage(chatId, `✅ Товар ${productId} удалён`);
      console.log('🗑️  Товар удалён:', productId);
    } else {
      await bot.sendMessage(chatId, `❌ Товар ${productId} не найден`);
    }
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    await bot.sendMessage(chatId, '❌ Ошибка удаления товара');
  }
});

// Команда /stats
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ У вас нет доступа');
    return;
  }
  
  try {
    const stats = await db.getStats();
    const products = await db.getAllProducts();
    const users = await db.getAllUsers();
    
    const message = `
📊 Статистика магазина

👥 Пользователей: ${users.length}
📦 Товаров: ${products.length}
👀 Всего просмотров: ${stats.totalViews || 0}

База данных: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON (временная)'}
    `;
    
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    await bot.sendMessage(chatId, '❌ Ошибка получения статистики');
  }
});

module.exports = bot;
