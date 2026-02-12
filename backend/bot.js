const TelegramBot = require('node-telegram-bot-api');
const db = require('./database');
const { uploadTelegramPhoto } = require('./cloudinary');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const MANAGER_USERNAME = process.env.MANAGER_USERNAME || 'your_manager';

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не установлен');
  process.exit(1);
}

console.log('🤖 Инициализация бота...');
console.log('Admin ID:', ADMIN_ID);

const bot = new TelegramBot(BOT_TOKEN, { 
  polling: true,
  filepath: false
});

// Хранилище временных данных
const tempProductData = {};
const tempEditData = {};

// Обработка ошибок polling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || 'Пользователь';
  
  console.log(`👤 /start от ${username} (ID: ${userId})`);
  
  // Сохраняем пользователя
  await db.addUser({
    telegramId: userId,
    username: username,
    firstName: msg.from.first_name,
    lastName: msg.from.last_name
  });
  
  const welcomeMessage = `
👋 Добро пожаловать в наш магазин!

🛍️ Здесь вы найдете стильную одежду и обувь

Используйте кнопки меню ниже для навигации:
• 🏠 Каталог - все товары
• ❤️ Избранное - понравившиеся товары
• 📝 История - просмотренные товары
• 💬 Менеджер - связь с нами
  `;
  
  await bot.sendMessage(chatId, welcomeMessage);
  
  // Показываем админ-панель для админа
  if (userId === ADMIN_ID) {
    setTimeout(() => {
      bot.sendMessage(chatId, '🔧 Доступна админ-панель. Отправьте /admin');
    }, 1000);
  }
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
━━━━━━━━━━━━━━
📦 Управление товарами:
/add_product - Добавить товар
/edit_product [ID] - Редактировать товар
/list_products - Список товаров
/delete_product [ID] - Удалить товар

📊 Статистика:
/stats - Статистика магазина
/categories - Список категорий
━━━━━━━━━━━━━━
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
  
  tempProductData[chatId] = {
    step: 'name'
  };
  
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
      originalProduct: JSON.parse(JSON.stringify(product)) // Глубокое копирование
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
          [{ text: '✅ Завершить', callback_data: 'edit_done' }],
          [{ text: '❌ Отмена', callback_data: 'edit_cancel' }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка при получении товара:', error);
    await bot.sendMessage(chatId, '❌ Ошибка при загрузке товара');
  }
});

// Команда /done_photos
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

// Команда /done
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
    
    await bot.sendMessage(chatId, `📦 Всего товаров: ${products.length}\n\n⬇️ Карточки товаров:`);
    
    for (const p of products) {
      const caption = `
📌 ${p.name}
💰 Цена: ${p.price} ₽
🏷️ Категория: ${p.category}
👁️ Просмотров: ${p.views || 0}
🆔 ID: ${p.id}
      `.trim();
      
      await bot.sendPhoto(chatId, p.photos[0], {
        caption: caption,
        reply_markup: {
          inline_keyboard: [
            [{ text: '✏️ Редактировать', callback_data: `edit_${p.id}` }],
            [{ text: '🗑️ Удалить', callback_data: `delete_${p.id}` }]
          ]
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    await bot.sendMessage(chatId, '❌ Ошибка получения списка товаров');
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
    const product = await db.getProductById(productId);
    
    if (!product) {
      await bot.sendMessage(chatId, `❌ Товар с ID ${productId} не найден`);
      return;
    }
    
    await bot.sendMessage(chatId, `
⚠️ Подтвердите удаление:

Название: ${product.name}
Цена: ${product.price} ₽
    `, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Удалить', callback_data: `confirm_delete_${productId}` },
            { text: '❌ Отмена', callback_data: 'cancel_delete' }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка:', error);
    await bot.sendMessage(chatId, '❌ Ошибка');
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
    
    let categoryStats = '\n📊 По категориям:\n';
    for (const [category, count] of Object.entries(stats.byCategory)) {
      categoryStats += `   ${category}: ${count} шт.\n`;
    }
    
    let topProducts = '\n🏆 Топ-5 популярных:\n';
    stats.topProducts.slice(0, 5).forEach((p, i) => {
      topProducts += `   ${i + 1}. ${p.name} - ${p.views} 👁️\n`;
    });
    
    const message = `
📊 Статистика магазина

📦 Товары: ${stats.totalProducts}
👥 Пользователи: ${stats.totalUsers}
👁️ Всего просмотров: ${stats.totalViews}
${categoryStats}${topProducts}
🗄️ База данных: ${stats.usingMongo ? 'MongoDB ✅' : 'JSON (временная)'}
    `;
    
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    await bot.sendMessage(chatId, '❌ Ошибка получения статистики');
  }
});

// Команда /categories
bot.onText(/\/categories/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ У вас нет доступа');
    return;
  }
  
  const categories = ['Обувь', 'Худи', 'Футболки', 'Аксессуары', 'Джинсы', 'Головные уборы'];
  
  const message = `
🏷️ Доступные категории:

${categories.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}

Всего: ${categories.length} категорий
  `;
  
  await bot.sendMessage(chatId, message);
});

// Обработка callback кнопок
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  
  if (userId !== ADMIN_ID) {
    await bot.answerCallbackQuery(query.id, { text: '❌ Ошибка доступа' });
    return;
  }
  
  // Выбор категории при добавлении
  if (data.startsWith('cat_') && tempProductData[chatId]) {
    const category = data.replace('cat_', '');
    tempProductData[chatId].category = category;
    tempProductData[chatId].step = 'photo';
    tempProductData[chatId].photos = [];
    
    await bot.answerCallbackQuery(query.id, { text: `Выбрана категория: ${category}` });
    await bot.sendMessage(chatId, `
📸 Отправьте фото товара (можно несколько).

Когда закончите, отправьте команду /done
    `);
    return;
  }
  
  // Обработка редактирования
  const editData = tempEditData[chatId];
  
  if (data === 'edit_name' && editData) {
    editData.editing = 'name';
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, '📌 Введите новое название товара:');
    return;
  }
  
  if (data === 'edit_price' && editData) {
    editData.editing = 'price';
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, '💰 Введите новую цену (только число):');
    return;
  }
  
  if (data === 'edit_description' && editData) {
    editData.editing = 'description';
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, '📝 Введите новое описание:');
    return;
  }
  
  if (data === 'edit_category' && editData) {
    editData.editing = 'category';
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, '🏷️ Выберите новую категорию:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👟 Обувь', callback_data: 'editcat_Обувь' }],
          [{ text: '👕 Худи', callback_data: 'editcat_Худи' }],
          [{ text: '👔 Футболки', callback_data: 'editcat_Футболки' }],
          [{ text: '🎒 Аксессуары', callback_data: 'editcat_Аксессуары' }],
          [{ text: '👖 Джинсы', callback_data: 'editcat_Джинсы' }],
          [{ text: '🧢 Головные уборы', callback_data: 'editcat_Головные уборы' }]
        ]
      }
    });
    return;
  }
  
  if (data === 'edit_photos' && editData) {
    editData.editing = 'photos';
    editData.newPhotos = [];
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, `
📸 Отправьте новые фото товара (заменят старые).

Когда закончите, отправьте /done_photos
    `);
    return;
  }
  
  if (data.startsWith('editcat_') && editData) {
    const category = data.replace('editcat_', '');
    editData.originalProduct.category = category;
    delete editData.editing;
    
    await bot.answerCallbackQuery(query.id, { text: `Категория изменена на: ${category}` });
    await bot.sendMessage(chatId, `✅ Категория изменена на: ${category}\n\nОтправьте /edit_product ${editData.productId} для продолжения`);
    return;
  }
  
  if (data === 'edit_done' && editData) {
    await bot.answerCallbackQuery(query.id, { text: 'Сохраняем изменения...' });
    try {
      const product = editData.originalProduct;
      const success = await db.updateProduct(editData.productId, product);
      
      if (success) {
        await bot.sendMessage(chatId, `
✅ Товар успешно обновлен!

ID: ${editData.productId}
Название: ${product.name}
Цена: ${product.price} ₽
Категория: ${product.category}
        `);
      } else {
        await bot.sendMessage(chatId, '❌ Ошибка при сохранении изменений');
      }
    } catch (error) {
      console.error('Ошибка обновления товара:', error);
      await bot.sendMessage(chatId, '❌ Ошибка при сохранении');
    }
    delete tempEditData[chatId];
    return;
  }
  
  if (data === 'edit_cancel' && editData) {
    await bot.answerCallbackQuery(query.id, { text: 'Отменено' });
    await bot.sendMessage(chatId, '❌ Редактирование отменено');
    delete tempEditData[chatId];
    return;
  }
  
  // Быстрое редактирование из /list_products
  if (data.startsWith('edit_')) {
    const productId = data.replace('edit_', '');
    await bot.answerCallbackQuery(query.id);
    // Вызываем команду редактирования
    bot.sendMessage(chatId, `/edit_product ${productId}`);
    setTimeout(() => {
      bot.emit('message', {
        chat: { id: chatId },
        from: { id: userId },
        text: `/edit_product ${productId}`
      });
    }, 100);
    return;
  }
  
  // Удаление товара
  if (data.startsWith('delete_')) {
    const productId = data.replace('delete_', '');
    await bot.answerCallbackQuery(query.id);
    bot.sendMessage(chatId, `/delete_product ${productId}`);
    setTimeout(() => {
      bot.emit('message', {
        chat: { id: chatId },
        from: { id: userId },
        text: `/delete_product ${productId}`
      });
    }, 100);
    return;
  }
  
  if (data.startsWith('confirm_delete_')) {
    const productId = data.replace('confirm_delete_', '');
    await bot.answerCallbackQuery(query.id, { text: 'Удаляем...' });
    
    try {
      const success = await db.deleteProduct(productId);
      
      if (success) {
        await bot.sendMessage(chatId, '✅ Товар успешно удален');
      } else {
        await bot.sendMessage(chatId, '❌ Ошибка удаления');
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      await bot.sendMessage(chatId, '❌ Ошибка удаления');
    }
    return;
  }
  
  if (data === 'cancel_delete') {
    await bot.answerCallbackQuery(query.id, { text: 'Отменено' });
    await bot.sendMessage(chatId, '❌ Удаление отменено');
    return;
  }
});

// Обработка текстовых сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  if (userId !== ADMIN_ID) return;
  if (!text || text.startsWith('/')) return;
  
  // Обработка редактирования
  const editData = tempEditData[chatId];
  if (editData && editData.editing) {
    const product = editData.originalProduct;
    
    switch (editData.editing) {
      case 'name':
        product.name = text;
        await bot.sendMessage(chatId, `✅ Название изменено на: ${text}\n\nОтправьте /edit_product ${editData.productId} для продолжения`);
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
    return;
  }
  
  // Обработка добавления товара
  const data = tempProductData[chatId];
  if (!data) return;
  
  try {
    switch (data.step) {
      case 'name':
        data.name = text;
        data.step = 'price';
        await bot.sendMessage(chatId, '💰 Введите цену товара (только число):');
        break;
        
      case 'price':
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
        data.description = text;
        data.step = 'category';
        
        await bot.sendMessage(chatId, '🏷️ Выберите категорию:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '👟 Обувь', callback_data: 'cat_Обувь' }],
              [{ text: '👕 Худи', callback_data: 'cat_Худи' }],
              [{ text: '👔 Футболки', callback_data: 'cat_Футболки' }],
              [{ text: '🎒 Аксессуары', callback_data: 'cat_Аксессуары' }],
              [{ text: '👖 Джинсы', callback_data: 'cat_Джинсы' }],
              [{ text: '🧢 Головные уборы', callback_data: 'cat_Головные уборы' }]
            ]
          }
        });
        break;
    }
  } catch (error) {
    console.error('Ошибка обработки сообщения:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте снова.');
  }
});

// Обработка фото
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) return;
  
  const editData = tempEditData[chatId];
  
  // Редактирование фото
  if (editData && editData.editing === 'photos') {
    try {
      const photo = msg.photo[msg.photo.length - 1];
      const fileId = photo.file_id;
      
      await bot.sendMessage(chatId, '⏳ Загружаем фото...');
      
      const photoUrl = await uploadTelegramPhoto(bot, fileId);
      
      if (photoUrl) {
        editData.newPhotos.push(photoUrl);
        await bot.sendMessage(chatId, `✅ Фото добавлено (${editData.newPhotos.length})\n\nОтправьте /done_photos когда закончите`);
      } else {
        await bot.sendMessage(chatId, '❌ Ошибка загрузки фото');
      }
    } catch (error) {
      console.error('Ошибка загрузки фото:', error);
      await bot.sendMessage(chatId, '❌ Ошибка загрузки фото');
    }
    return;
  }
  
  // Добавление товара
  const data = tempProductData[chatId];
  if (!data || data.step !== 'photo') return;
  
  try {
    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;
    
    await bot.sendMessage(chatId, '⏳ Загружаем фото...');
    
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

console.log('✅ Бот запущен');

module.exports = bot;
