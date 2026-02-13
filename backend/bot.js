const TelegramBot = require('node-telegram-bot-api');
const { uploadTelegramPhoto } = require('./cloudinary');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

if (!BOT_TOKEN || !ADMIN_ID) {
  throw new Error('❌ Не указаны BOT_TOKEN или ADMIN_ID в .env');
}

// Получаем правильную БД из глобальной переменной
const db = global.dbInstance || require('./database');
const USE_MONGODB = global.USE_MONGODB || false;

// Настройка бота в зависимости от окружения
const botOptions = { 
  polling: process.env.NODE_ENV !== 'production'
};

const bot = new TelegramBot(BOT_TOKEN, botOptions);

console.log('✅ Telegram бот запущен');
console.log('👤 Admin ID:', ADMIN_ID);
console.log('📦 База данных в боте:', USE_MONGODB ? 'MongoDB' : 'JSON');

// Хранилище для временных данных при добавлении товара
const tempProductData = {};

// Хранилище для редактирования товаров
const tempEditData = {};

// ========== КОМАНДЫ ==========

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'друг';
  
  await bot.sendMessage(chatId, `
👋 Привет, ${userName}!

Добро пожаловать в наш магазин одежды!

Нажми на кнопку меню внизу 🛍️ чтобы открыть каталог товаров.
  `);
});

// Команда /admin
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
/edit_product [ID] - Редактировать товар
/list_products - Список товаров
/delete_product [ID] - Удалить товар
/stats - Статистика
  `;
  
  await bot.sendMessage(chatId, adminMenu);
});

// Команда /add_product
bot.onText(/\/add_product/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ У вас нет прав для добавления товаров');
    return;
  }
  
  tempProductData[chatId] = { step: 'name' };
  await bot.sendMessage(chatId, '📝 Введите название товара:');
});

// Команда /edit_product
bot.onText(/\/edit_product (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const productId = match[1];
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ У вас нет доступа');
    return;
  }
  
  try {
    const product = await db.getProductById(productId);
    
    if (!product) {
      await bot.sendMessage(chatId, `❌ Товар с ID ${productId} не найден`);
      return;
    }
    
    // Сохраняем товар для редактирования
    tempEditData[chatId] = {
      productId: productId,
      originalProduct: { ...product }
    };
    
    // Показываем меню редактирования
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

Что хотите изменить?
    `, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📌 Название', callback_data: 'edit_name' }],
          [{ text: '💰 Цена', callback_data: 'edit_price' }],
          [{ text: '📝 Описание', callback_data: 'edit_description' }],
          [{ text: '🏷️ Категория', callback_data: 'edit_category' }],
          [{ text: '📸 Фото', callback_data: 'edit_photos' }],
          [
            { text: '✅ Сохранить', callback_data: 'edit_done' },
            { text: '❌ Отмена', callback_data: 'edit_cancel' }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    await bot.sendMessage(chatId, '❌ Ошибка получения товара');
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
      await bot.sendMessage(chatId, '📦 Товаров пока нет. Добавьте первый командой /add_product');
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

// Команда /done - завершение добавления товара
bot.onText(/\/done/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const data = tempProductData[chatId];
  
  if (userId !== ADMIN_ID || !data) {
    return;
  }
  
  try {
    if (!data.name || !data.price || !data.description || !data.category || !data.photos || data.photos.length === 0) {
      await bot.sendMessage(chatId, '❌ Не все поля заполнены. Начните сначала с /add_product');
      delete tempProductData[chatId];
      return;
    }
    
    console.log('💾 Сохраняем товар в БД:', { 
      name: data.name, 
      category: data.category,
      db: USE_MONGODB ? 'MongoDB' : 'JSON'
    });
    
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

БД: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON'}
      `);
      
      console.log('✅ Товар добавлен в БД:', product.id, product.name);
    } else {
      await bot.sendMessage(chatId, '❌ Ошибка добавления товара в БД');
      console.error('❌ db.addProduct вернул null/undefined');
    }
    
    delete tempProductData[chatId];
  } catch (error) {
    console.error('❌ Ошибка создания товара:', error);
    await bot.sendMessage(chatId, `❌ Произошла ошибка при создании товара: ${error.message}`);
    delete tempProductData[chatId];
  }
});

// Команда /done_photos - завершение добавления фото при редактировании
bot.onText(/\/done_photos/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const editData = tempEditData[chatId];
  
  if (userId !== ADMIN_ID || !editData || editData.editing !== 'photos') {
    return;
  }
  
  if (editData.newPhotos.length === 0) {
    await bot.sendMessage(chatId, '❌ Добавьте хотя бы одно фото');
    return;
  }
  
  editData.originalProduct.photos = editData.newPhotos;
  delete editData.editing;
  delete editData.newPhotos;
  
  await bot.sendMessage(chatId, `✅ Фото обновлены (${editData.originalProduct.photos.length} шт.)\n\nОтправьте /edit_product ${editData.productId} для продолжения`);
});

// ========== ОБРАБОТЧИКИ CALLBACK ==========

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = tempProductData[chatId];
  const editData = tempEditData[chatId];
  
  if (userId !== ADMIN_ID) {
    await bot.answerCallbackQuery(query.id, { text: '❌ Ошибка доступа' });
    return;
  }
  
  // ===== ДОБАВЛЕНИЕ ТОВАРА =====
  if (query.data.startsWith('cat_') && data) {
    const category = query.data.replace('cat_', '');
    data.category = category;
    data.step = 'photo';
    data.photos = [];
    
    await bot.answerCallbackQuery(query.id, { text: `Выбрана категория: ${category}` });
    await bot.sendMessage(chatId, `
📸 Отправьте фото товара (можно несколько).

Когда закончите, отправьте команду /done
    `);
    return;
  }
  
  // ===== РЕДАКТИРОВАНИЕ ТОВАРА =====
  if (!editData) {
    return;
  }
  
  switch (query.data) {
    case 'edit_name':
      editData.editing = 'name';
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '📌 Введите новое название товара:');
      break;
      
    case 'edit_price':
      editData.editing = 'price';
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '💰 Введите новую цену (только число):');
      break;
      
    case 'edit_description':
      editData.editing = 'description';
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '📝 Введите новое описание:');
      break;
      
    case 'edit_category':
      editData.editing = 'category';
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '🏷️ Выберите новую категорию:', {
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
📸 Отправьте новые фото товара (заменят старые).

Когда закончите, отправьте /done_photos
      `);
      break;
      
    case 'edit_done':
      await bot.answerCallbackQuery(query.id, { text: 'Сохраняем изменения...' });
      try {
        const product = editData.originalProduct;
        console.log('💾 Обновляем товар в БД:', editData.productId);
        
        const success = await db.updateProduct(editData.productId, product);
        
        if (success) {
          await bot.sendMessage(chatId, `
✅ Товар успешно обновлен!

ID: ${editData.productId}
Название: ${product.name}
Цена: ${product.price} ₽
Категория: ${product.category}
          `);
          console.log('✅ Товар обновлен в БД:', editData.productId);
        } else {
          await bot.sendMessage(chatId, '❌ Ошибка при сохранении изменений');
          console.error('❌ db.updateProduct вернул false');
        }
      } catch (error) {
        console.error('❌ Ошибка обновления товара:', error);
        await bot.sendMessage(chatId, `❌ Ошибка при сохранении: ${error.message}`);
      }
      delete tempEditData[chatId];
      break;
      
    case 'edit_cancel':
      await bot.answerCallbackQuery(query.id, { text: 'Отменено' });
      await bot.sendMessage(chatId, '❌ Редактирование отменено');
      delete tempEditData[chatId];
      break;
  }
  
  // Обработка выбора новой категории
  if (query.data.startsWith('editcat_')) {
    const category = query.data.replace('editcat_', '');
    editData.originalProduct.category = category;
    delete editData.editing;
    
    await bot.answerCallbackQuery(query.id, { text: `Категория изменена на: ${category}` });
    await bot.sendMessage(chatId, `✅ Категория изменена на: ${category}\n\nОтправьте /edit_product ${editData.productId} для продолжения редактирования`);
  }
});

// ========== ОБРАБОТЧИКИ СООБЩЕНИЙ ==========

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  if (userId !== ADMIN_ID) return;
  if (!text || text.startsWith('/')) return;
  
  // ===== ДОБАВЛЕНИЕ ТОВАРА =====
  const data = tempProductData[chatId];
  if (data) {
    switch (data.step) {
      case 'name':
        data.name = text;
        data.step = 'price';
        await bot.sendMessage(chatId, '💰 Введите цену товара (только число):');
        break;
        
      case 'price':
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) {
          await bot.sendMessage(chatId, '❌ Неправильная цена. Введите число:');
          return;
        }
        data.price = price;
        data.step = 'description';
        await bot.sendMessage(chatId, '📝 Введите описание товара:');
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
  
  // ===== РЕДАКТИРОВАНИЕ ТОВАРА =====
  const editData = tempEditData[chatId];
  if (editData && editData.editing) {
    const product = editData.originalProduct;
    
    switch (editData.editing) {
      case 'name':
        product.name = text;
        await bot.sendMessage(chatId, `✅ Название изменено\n\nОтправьте /edit_product ${editData.productId} для продолжения`);
        delete editData.editing;
        break;
        
      case 'price':
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) {
          await bot.sendMessage(chatId, '❌ Неправильная цена. Введите число:');
          return;
        }
        product.price = price;
        await bot.sendMessage(chatId, `✅ Цена изменена на: ${price} ₽\n\nОтправьте /edit_product ${editData.productId} для продолжения`);
        delete editData.editing;
        break;
        
      case 'description':
        product.description = text;
        await bot.sendMessage(chatId, `✅ Описание изменено\n\nОтправьте /edit_product ${editData.productId} для продолжения`);
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
  
  try {
    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;
    
    await bot.sendMessage(chatId, '⏳ Загружаем фото...');
    
    const photoUrl = await uploadTelegramPhoto(bot, fileId);
    
    if (!photoUrl) {
      await bot.sendMessage(chatId, '❌ Ошибка загрузки фото');
      return;
    }
    
    // Добавление товара
    if (data && data.step === 'photo') {
      data.photos.push(photoUrl);
      await bot.sendMessage(chatId, `✅ Фото добавлено (${data.photos.length})\n\nМожете добавить ещё или отправить /done`);
      return;
    }
    
    // Редактирование товара
    if (editData && editData.editing === 'photos') {
      editData.newPhotos.push(photoUrl);
      await bot.sendMessage(chatId, `✅ Фото добавлено (${editData.newPhotos.length})\n\nОтправьте /done_photos когда закончите`);
      return;
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки фото:', error);
    await bot.sendMessage(chatId, '❌ Ошибка загрузки фото');
  }
});

// Обработка ошибок polling
bot.on('polling_error', (error) => {
  console.error('[polling_error]', error);
});

module.exports = bot;
