const TelegramBot = require('node-telegram-bot-api');
const { uploadTelegramPhoto } = require('./cloudinary');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

if (!BOT_TOKEN || !ADMIN_ID) {
  throw new Error('❌ BOT_TOKEN или ADMIN_ID не установлены');
}

const db = global.dbInstance;
const USE_MONGODB = global.USE_MONGODB || false;

if (!db) {
  throw new Error('❌ БД не инициализирована');
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
    await bot.sendMessage(chatId, '❌ Нет доступа');
    return;
  }
  
  await bot.sendMessage(chatId, `
🔧 Админ-панель

Команды:
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
  
  if (userId !== ADMIN_ID) return;
  
  tempProductData[chatId] = { step: 'name' };
  await bot.sendMessage(chatId, '📝 Введите название товара:');
});

bot.onText(/\/edit_product (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const productId = match[1];
  
  if (userId !== ADMIN_ID) return;
  
  try {
    console.log('📝 Запрос редактирования товара:', productId);
    const product = await db.getProductById(productId);
    
    if (!product) {
      await bot.sendMessage(chatId, `❌ Товар ${productId} не найден`);
      return;
    }
    
    tempEditData[chatId] = {
      productId,
      product: { ...product }
    };
    
    await bot.sendMessage(chatId, `
📝 Редактирование товара

Текущие данные:
━━━━━━━━━━━━━━
📌 Название: ${product.name}
💰 Цена: ${product.price} ₽
📝 Описание: ${product.description}
🏷️ Категория: ${product.category}
📸 Фото: ${product.photos.length} шт.
━━━━━━━━━━━━━━

Что изменить?
    `, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📌 Название', callback_data: 'edit_name' }],
          [{ text: '💰 Цена', callback_data: 'edit_price' }],
          [{ text: '📝 Описание', callback_data: 'edit_description' }],
          [{ text: '🏷️ Категория', callback_data: 'edit_category' }],
          [{ text: '📸 Фото', callback_data: 'edit_photos' }],
          [
            { text: '✅ Сохранить', callback_data: 'edit_save' },
            { text: '❌ Отмена', callback_data: 'edit_cancel' }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
  }
});

bot.onText(/\/list_products/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) return;
  
  try {
    console.log('📋 Запрос списка товаров из БД:', USE_MONGODB ? 'MongoDB' : 'JSON');
    const products = await db.getAllProducts();
    console.log('📦 Получено товаров:', products.length);
    
    if (products.length === 0) {
      await bot.sendMessage(chatId, '📦 Товаров нет\n\n/add_product для добавления');
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
    console.error('❌ Ошибка:', error);
    await bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
  }
});

bot.onText(/\/delete_product (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const productId = match[1];
  
  if (userId !== ADMIN_ID) return;
  
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
    console.error('❌ Ошибка:', error);
    await bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
  }
});

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) return;
  
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
    console.error('❌ Ошибка:', error);
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
      console.log('✅ Товар добавлен:', product.id);
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
    console.error('❌ Ошибка:', error);
    await bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
    delete tempProductData[chatId];
  }
});

bot.onText(/\/done_photos/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const editData = tempEditData[chatId];
  
  if (userId !== ADMIN_ID || !editData || editData.editing !== 'photos') return;
  
  if (editData.newPhotos.length === 0) {
    await bot.sendMessage(chatId, '❌ Добавьте хотя бы одно фото');
    return;
  }
  
  editData.product.photos = editData.newPhotos;
  delete editData.editing;
  delete editData.newPhotos;
  
  await bot.sendMessage(chatId, `✅ Фото обновлены (${editData.product.photos.length} шт.)\n\n/edit_product ${editData.productId} для продолжения`);
});

// ========== CALLBACK QUERIES ==========

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = tempProductData[chatId];
  const editData = tempEditData[chatId];
  
  if (userId !== ADMIN_ID) {
    await bot.answerCallbackQuery(query.id, { text: '❌ Нет доступа' });
    return;
  }
  
  // Добавление товара - выбор категории
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
    return;
  }
  
  // Редактирование товара
  if (!editData) return;
  
  switch (query.data) {
    case 'edit_name':
      editData.editing = 'name';
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '📌 Введите новое название:');
      break;
      
    case 'edit_price':
      editData.editing = 'price';
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '💰 Введите новую цену (число):');
      break;
      
    case 'edit_description':
      editData.editing = 'description';
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '📝 Введите новое описание:');
      break;
      
    case 'edit_category':
      editData.editing = 'category';
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '🏷️ Выберите категорию:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '👟 Обувь', callback_data: 'editcat_Обувь' }],
            [{ text: '👕 Худи', callback_data: 'editcat_Худи' }],
            [{ text: '👔 Футболки', callback_data: 'editcat_Футболки' }],
            [{ text: '🎒 Аксессуары', callback_data: 'editcat_Аксессуары' }]
          ]
        }
      });
      break;
      
    case 'edit_photos':
      editData.editing = 'photos';
      editData.newPhotos = [];
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, `
📸 Отправьте новые фото (заменят старые)

Когда закончите, /done_photos
      `);
      break;
      
    case 'edit_save':
      await bot.answerCallbackQuery(query.id, { text: 'Сохраняем...' });
      try {
        console.log('💾 Обновление товара:', editData.productId);
        const success = await db.updateProduct(editData.productId, editData.product);
        
        if (success) {
          await bot.sendMessage(chatId, `
✅ Товар обновлен!

ID: ${editData.productId}
Название: ${editData.product.name}
Цена: ${editData.product.price} ₽

📦 БД: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON 📁'}
          `);
          console.log('✅ Товар обновлен');
        } else {
          await bot.sendMessage(chatId, '❌ Ошибка сохранения');
        }
      } catch (error) {
        console.error('❌ Ошибка:', error);
        await bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
      }
      delete tempEditData[chatId];
      break;
      
    case 'edit_cancel':
      await bot.answerCallbackQuery(query.id, { text: 'Отменено' });
      await bot.sendMessage(chatId, '❌ Редактирование отменено');
      delete tempEditData[chatId];
      break;
  }
  
  // Выбор категории при редактировании
  if (query.data.startsWith('editcat_')) {
    const category = query.data.replace('editcat_', '');
    editData.product.category = category;
    delete editData.editing;
    
    await bot.answerCallbackQuery(query.id, { text: `Категория: ${category}` });
    await bot.sendMessage(chatId, `✅ Категория изменена: ${category}\n\n/edit_product ${editData.productId} для продолжения`);
  }
});

// ========== ОБРАБОТЧИКИ СООБЩЕНИЙ ==========

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  if (userId !== ADMIN_ID) return;
  if (!text || text.startsWith('/')) return;
  
  // Добавление товара
  const data = tempProductData[chatId];
  if (data) {
    switch (data.step) {
      case 'name':
        data.name = text;
        data.step = 'price';
        await bot.sendMessage(chatId, '💰 Введите цену (число):');
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
    return;
  }
  
  // Редактирование товара
  const editData = tempEditData[chatId];
  if (editData && editData.editing) {
    const product = editData.product;
    
    switch (editData.editing) {
      case 'name':
        product.name = text;
        await bot.sendMessage(chatId, `✅ Название изменено\n\n/edit_product ${editData.productId} для продолжения`);
        delete editData.editing;
        break;
        
      case 'price':
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) {
          await bot.sendMessage(chatId, '❌ Неправильная цена. Введите число:');
          return;
        }
        product.price = price;
        await bot.sendMessage(chatId, `✅ Цена изменена: ${price} ₽\n\n/edit_product ${editData.productId} для продолжения`);
        delete editData.editing;
        break;
        
      case 'description':
        product.description = text;
        await bot.sendMessage(chatId, `✅ Описание изменено\n\n/edit_product ${editData.productId} для продолжения`);
        delete editData.editing;
        break;
    }
  }
});

// Обработка фото
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) return;
  
  const data = tempProductData[chatId];
  const editData = tempEditData[chatId];
  
  if (!data && !editData) return;
  
  try {
    const photo = msg.photo[msg.photo.length - 1];
    await bot.sendMessage(chatId, '⏳ Загружаем фото...');
    
    const photoUrl = await uploadTelegramPhoto(bot, photo.file_id);
    
    if (!photoUrl) {
      await bot.sendMessage(chatId, '❌ Ошибка загрузки фото');
      return;
    }
    
    // Добавление товара
    if (data && data.step === 'photo') {
      data.photos.push(photoUrl);
      await bot.sendMessage(chatId, `✅ Фото ${data.photos.length} добавлено\n\nМожете добавить ещё или /done`);
      return;
    }
    
    // Редактирование товара
    if (editData && editData.editing === 'photos') {
      editData.newPhotos.push(photoUrl);
      await bot.sendMessage(chatId, `✅ Фото ${editData.newPhotos.length} добавлено\n\n/done_photos когда закончите`);
      return;
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
