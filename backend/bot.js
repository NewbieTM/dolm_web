const TelegramBot = require('node-telegram-bot-api');
const { uploadTelegramPhoto } = require('./cloudinary');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

if (!BOT_TOKEN || !ADMIN_ID) {
  throw new Error('❌ BOT_TOKEN или ADMIN_ID не установлены');
}

// Получаем БД из глобальной переменной
const db = global.dbInstance;
const USE_MONGODB = global.USE_MONGODB || false;

if (!db) {
  throw new Error('❌ БД не инициализирована! Бот не может запуститься.');
}

console.log('🤖 Инициализация Telegram бота...');
console.log('👤 Admin ID:', ADMIN_ID);
console.log('📦 БД в боте:', USE_MONGODB ? 'MongoDB ✅' : 'JSON 📁');

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Хранилище для временных данных
const tempProductData = {};
const tempEditData = {};

// ========== КОМАНДЫ ==========

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'друг';
  
  await bot.sendMessage(chatId, `
👋 Привет, ${userName}!

Добро пожаловать в наш магазин одежды!

Нажми на кнопку меню внизу 🛍️ чтобы открыть каталог товаров.
  `);
});

bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ У вас нет доступа к админ-панели');
    return;
  }
  
  await bot.sendMessage(chatId, `
🔧 Админ-панель

Доступные команды:
/add_product - Добавить товар
/edit_product [ID] - Редактировать товар
/list_products - Список товаров
/delete_product [ID] - Удалить товар
/stats - Статистика

📦 БД: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON 📁'}
  `);
});

bot.onText(/\/add_product/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ Нет доступа');
    return;
  }
  
  tempProductData[chatId] = { step: 'name' };
  await bot.sendMessage(chatId, '📝 Введите название товара:');
});

bot.onText(/\/list_products/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ Нет доступа');
    return;
  }
  
  try {
    console.log('📋 Запрос списка товаров из БД:', USE_MONGODB ? 'MongoDB' : 'JSON');
    const products = await db.getAllProducts();
    console.log('📦 Получено товаров:', products.length);
    
    if (products.length === 0) {
      await bot.sendMessage(chatId, '📦 Товаров пока нет\n\n/add_product для добавления');
      return;
    }
    
    let message = `📦 Товары (${products.length}):\n\n`;
    products.forEach((p, i) => {
      message += `${i + 1}. ${p.name}\n`;
      message += `   ID: ${p.id}\n`;
      message += `   Цена: ${p.price} ₽\n`;
      message += `   Категория: ${p.category}\n`;
      message += `   Просмотры: ${p.views || 0}\n\n`;
    });
    message += `\n📦 БД: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON 📁'}`;
    
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('❌ Ошибка получения товаров:', error);
    await bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
  }
});

bot.onText(/\/delete_product (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const productId = match[1];
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ Нет доступа');
    return;
  }
  
  try {
    console.log('🗑️  Удаление товара:', productId);
    const deleted = await db.deleteProduct(productId);
    
    if (deleted) {
      await bot.sendMessage(chatId, `✅ Товар ${productId} удалён`);
      console.log('✅ Товар удалён');
    } else {
      await bot.sendMessage(chatId, `❌ Товар ${productId} не найден`);
    }
  } catch (error) {
    console.error('❌ Ошибка удаления:', error);
    await bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
  }
});

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ Нет доступа');
    return;
  }
  
  try {
    const stats = await db.getStats();
    const products = await db.getAllProducts();
    const users = await db.getAllUsers();
    
    await bot.sendMessage(chatId, `
📊 Статистика

👥 Пользователей: ${users.length}
📦 Товаров: ${products.length}
👀 Просмотров: ${stats.totalViews || 0}

📦 БД: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON 📁'}
    `);
  } catch (error) {
    console.error('❌ Ошибка статистики:', error);
    await bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
  }
});

bot.onText(/\/done/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const data = tempProductData[chatId];
  
  if (userId !== ADMIN_ID || !data) return;
  
  try {
    if (!data.name || !data.price || !data.description || !data.category || !data.photos || data.photos.length === 0) {
      await bot.sendMessage(chatId, '❌ Не все поля заполнены\n\n/add_product для начала');
      delete tempProductData[chatId];
      return;
    }
    
    console.log('💾 Сохранение товара в БД:', USE_MONGODB ? 'MongoDB' : 'JSON');
    console.log('📦 Данные:', {
      name: data.name,
      price: data.price,
      category: data.category,
      photos: data.photos.length
    });
    
    const product = await db.addProduct({
      name: data.name,
      price: data.price,
      description: data.description,
      category: data.category,
      photos: data.photos
    });
    
    if (product) {
      console.log('✅ Товар сохранен! ID:', product.id);
      
      await bot.sendMessage(chatId, `
✅ Товар добавлен!

ID: ${product.id}
Название: ${product.name}
Цена: ${product.price} ₽
Категория: ${product.category}
Фото: ${product.photos.length} шт.

📦 БД: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON 📁'}
      `);
    } else {
      console.error('❌ db.addProduct вернул null');
      await bot.sendMessage(chatId, '❌ Ошибка сохранения в БД');
    }
    
    delete tempProductData[chatId];
  } catch (error) {
    console.error('❌ Ошибка создания товара:', error);
    await bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
    delete tempProductData[chatId];
  }
});

// ========== ОБРАБОТЧИКИ ==========

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = tempProductData[chatId];
  
  if (userId !== ADMIN_ID) {
    await bot.answerCallbackQuery(query.id, { text: '❌ Нет доступа' });
    return;
  }
  
  if (query.data.startsWith('cat_') && data) {
    const category = query.data.replace('cat_', '');
    data.category = category;
    data.step = 'photo';
    data.photos = [];
    
    await bot.answerCallbackQuery(query.id, { text: `Категория: ${category}` });
    await bot.sendMessage(chatId, `
📸 Отправьте фото товара (можно несколько)

Когда закончите, отправьте /done
    `);
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  if (userId !== ADMIN_ID) return;
  if (!text || text.startsWith('/')) return;
  
  const data = tempProductData[chatId];
  if (!data) return;
  
  switch (data.step) {
    case 'name':
      data.name = text;
      data.step = 'price';
      await bot.sendMessage(chatId, '💰 Введите цену (только число):');
      break;
      
    case 'price':
      const price = parseFloat(text);
      if (isNaN(price) || price <= 0) {
        await bot.sendMessage(chatId, '❌ Неправильная цена. Введите число:');
        return;
      }
      data.price = price;
      data.step = 'description';
      await bot.sendMessage(chatId, '📝 Введите описание:');
      break;
      
    case 'description':
      data.description = text;
      data.step = 'category';
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
  }
});

bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) return;
  
  const data = tempProductData[chatId];
  if (!data || data.step !== 'photo') return;
  
  try {
    const photo = msg.photo[msg.photo.length - 1];
    await bot.sendMessage(chatId, '⏳ Загружаем фото...');
    
    const photoUrl = await uploadTelegramPhoto(bot, photo.file_id);
    
    if (photoUrl) {
      data.photos.push(photoUrl);
      await bot.sendMessage(chatId, `✅ Фото ${data.photos.length} добавлено\n\nМожете добавить ещё или /done`);
    } else {
      await bot.sendMessage(chatId, '❌ Ошибка загрузки фото');
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки фото:', error);
    await bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
  }
});

bot.on('polling_error', (error) => {
  console.error('⚠️  Polling error:', error.code);
});

console.log('✅ Telegram бот готов');

module.exports = bot;
