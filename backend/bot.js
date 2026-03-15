const TelegramBot = require('node-telegram-bot-api');
const { uploadTelegramPhoto } = require('./cloudinary');
const fs = require('fs').promises;
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://dolm-web.vercel.app';

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

const ADMINS_FILE = path.join(__dirname, 'data', 'admins.json');

// Категории
const CATEGORIES = [
  { text: '👕 Худи', value: 'Худи' },
  { text: '👔 Футболки', value: 'Футболки' },
  { text: '👟 Обувь', value: 'Обувь' },
  { text: '👜 Сумки', value: 'Сумки' },
  { text: '💄 Косметика', value: 'Косметика' }
];

async function loadAdmins() {
  try {
    const data = await fs.readFile(ADMINS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    const admins = [ADMIN_ID];
    await saveAdmins(admins);
    return admins;
  }
}

async function saveAdmins(admins) {
  await fs.writeFile(ADMINS_FILE, JSON.stringify(admins, null, 2));
}

async function isAdmin(userId) {
  const admins = await loadAdmins();
  return admins.includes(userId);
}

const tempProductData = {};
const tempEditData = {};

// ========== КОМАНДЫ ==========

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'друг';

  await bot.sendMessage(chatId, `
👋 Привет, ${userName}!

Добро пожаловать в наш магазин!

Нажми кнопку ниже, чтобы открыть каталог товаров 👇
  `, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🛍️ Открыть магазин',
            web_app: { url: FRONTEND_URL }
          }
        ]
      ]
    }
  });
});

bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!(await isAdmin(userId))) {
    await bot.sendMessage(chatId, '❌ Нет доступа');
    return;
  }

  const admins = await loadAdmins();
  const isMainAdmin = userId === ADMIN_ID;

  await bot.sendMessage(chatId, `
🔧 Админ-панель

Команды:
/add_product - Добавить товар
/edit_product [ID] - Редактировать товар
/list_products - Список товаров
/delete_product [ID] - Удалить товар
/stats - Статистика
${isMainAdmin ? '\n👥 Управление админами:\n/list_admins - Список админов\n/add_admin [ID] - Добавить админа\n/remove_admin [ID] - Удалить админа' : ''}

📦 БД: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON 📁'}
  `);
});

bot.onText(/\/add_product/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!(await isAdmin(userId))) return;

  tempProductData[chatId] = {
    step: 'name'
  };

  await bot.sendMessage(chatId, '📌 Введите название товара:');
});

bot.onText(/\/edit_product (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const productId = match[1];

  if (!(await isAdmin(userId))) return;

  try {
    const product = await db.getProductById(productId);

    if (!product) {
      await bot.sendMessage(chatId, `❌ Товар ${productId} не найден`);
      return;
    }

    tempEditData[chatId] = {
      productId,
      product: { ...product }
    };

    const preorderStatus = product.isPreorder ? '📦 На заказ (7-15 дней)' : '✅ В наличии';

    await bot.sendMessage(chatId, `
📝 Редактирование товара

Текущие данные:
━━━━━━━━━━━━━━
📌 Название: ${product.name}
💰 Цена: ${product.price} ₽
📝 Описание: ${product.description}
🏷️ Категория: ${product.category}
🚚 Статус: ${preorderStatus}
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
          [{ text: '🚚 Статус наличия', callback_data: 'edit_preorder' }],
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

  if (!(await isAdmin(userId))) return;

  try {
    const products = await db.getAllProducts();

    if (products.length === 0) {
      await bot.sendMessage(chatId, '📦 Товаров нет\n\n/add_product для добавления');
      return;
    }

    let message = `📦 Товары (${products.length}):\n\n`;
    products.forEach((p, i) => {
      const preorderMark = p.isPreorder ? '📦 На заказ' : '✅ В наличии';
      message += `${i + 1}. ${p.name}\n`;
      message += `   ID: ${p.id}\n`;
      message += `   Цена: ${p.price} ₽\n`;
      message += `   Категория: ${p.category}\n`;
      message += `   Статус: ${preorderMark}\n\n`;
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

  if (!(await isAdmin(userId))) return;

  try {
    const deleted = await db.deleteProduct(productId);

    if (deleted) {
      await bot.sendMessage(chatId, `✅ Товар ${productId} удалён`);
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

  if (!(await isAdmin(userId))) return;

  try {
    const products = await db.getAllProducts();
    const users = await db.getAllUsers();
    const admins = await loadAdmins();

    const inStock = products.filter(p => !p.isPreorder).length;
    const onOrder = products.filter(p => p.isPreorder).length;

    await bot.sendMessage(chatId, `
📊 Статистика

👥 Пользователей: ${users.length}
📦 Товаров всего: ${products.length}
✅ В наличии: ${inStock}
📦 На заказ: ${onOrder}
🔧 Админов: ${admins.length}

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

  if (!(await isAdmin(userId)) || !data) return;

  try {
    if (!data.name || !data.price || !data.description || !data.category || !data.photos || data.photos.length === 0) {
      await bot.sendMessage(chatId, '❌ Не все поля заполнены\n\n/add_product для начала');
      delete tempProductData[chatId];
      return;
    }

    // Сортируем фото по message_id
    const sortedPhotos = data.photos
      .sort((a, b) => a.messageId - b.messageId)
      .map(photo => photo.url);

    const product = await db.addProduct({
      name: data.name,
      price: data.price,
      description: data.description,
      category: data.category,
      isPreorder: data.isPreorder || false,
      photos: sortedPhotos
    });

    if (product) {
      const preorderStatus = product.isPreorder ? '📦 На заказ (7-15 дней)' : '✅ В наличии';
      await bot.sendMessage(chatId, `
✅ Товар добавлен!

ID: ${product.id}
Название: ${product.name}
Цена: ${product.price} ₽
Категория: ${product.category}
Статус: ${preorderStatus}
Фото: ${product.photos.length} шт.

📦 БД: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON 📁'}
      `);
    } else {
      await bot.sendMessage(chatId, '❌ Ошибка добавления товара');
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

  if (!(await isAdmin(userId)) || !editData || editData.editing !== 'photos') return;

  try {
    if (!editData.newPhotos || editData.newPhotos.length === 0) {
      await bot.sendMessage(chatId, '❌ Нет новых фото');
      return;
    }

    const sortedPhotos = editData.newPhotos
      .sort((a, b) => a.messageId - b.messageId)
      .map(photo => photo.url);

    editData.product.photos = sortedPhotos;
    delete editData.editing;

    await bot.sendMessage(chatId, `✅ Фото обновлены (${sortedPhotos.length} шт.)\n\n/edit_product ${editData.productId} для продолжения`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
  }
});

// ========== УПРАВЛЕНИЕ АДМИНАМИ ==========

bot.onText(/\/list_admins/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_ID) return;

  const admins = await loadAdmins();
  await bot.sendMessage(chatId, `👥 Админы (${admins.length}):\n${admins.join('\n')}`);
});

bot.onText(/\/add_admin (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_ID) return;

  const newAdminId = parseInt(match[1]);
  if (isNaN(newAdminId)) {
    await bot.sendMessage(chatId, '❌ Неправильный ID');
    return;
  }

  const admins = await loadAdmins();
  if (!admins.includes(newAdminId)) {
    admins.push(newAdminId);
    await saveAdmins(admins);
    await bot.sendMessage(chatId, `✅ Админ ${newAdminId} добавлен`);
  } else {
    await bot.sendMessage(chatId, '⚠️ Уже является админом');
  }
});

bot.onText(/\/remove_admin (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_ID) return;

  const removeId = parseInt(match[1]);
  if (removeId === ADMIN_ID) {
    await bot.sendMessage(chatId, '❌ Нельзя удалить главного админа');
    return;
  }

  const admins = await loadAdmins();
  const filtered = admins.filter(id => id !== removeId);

  if (filtered.length === admins.length) {
    await bot.sendMessage(chatId, '❌ Админ не найден');
    return;
  }

  await saveAdmins(filtered);
  await bot.sendMessage(chatId, `✅ Админ ${removeId} удалён`);
});

// ========== CALLBACK QUERIES ==========

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = tempProductData[chatId];
  const editData = tempEditData[chatId];

  if (!(await isAdmin(userId))) {
    await bot.answerCallbackQuery(query.id, { text: '❌ Нет доступа' });
    return;
  }

  // Выбор наличия при добавлении товара
  if (query.data === 'preorder_yes' && data) {
    data.isPreorder = true;
    data.step = 'photo';
    data.photos = [];

    await bot.answerCallbackQuery(query.id, { text: '📦 На заказ' });
    await bot.sendMessage(chatId, `
📸 Отправьте фото товара (можно несколько)

Когда закончите, отправьте /done
    `);
    return;
  }

  if (query.data === 'preorder_no' && data) {
    data.isPreorder = false;
    data.step = 'photo';
    data.photos = [];

    await bot.answerCallbackQuery(query.id, { text: '✅ В наличии' });
    await bot.sendMessage(chatId, `
📸 Отправьте фото товара (можно несколько)

Когда закончите, отправьте /done
    `);
    return;
  }

  // Выбор категории при добавлении
  if (query.data.startsWith('cat_') && data) {
    const category = query.data.replace('cat_', '');
    data.category = category;
    data.step = 'preorder';

    await bot.answerCallbackQuery(query.id, { text: `Категория: ${category}` });
    await bot.sendMessage(chatId, '🚚 Товар в наличии или на заказ?', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ В наличии', callback_data: 'preorder_no' },
            { text: '📦 На заказ (7-15 дней)', callback_data: 'preorder_yes' }
          ]
        ]
      }
    });
    return;
  }

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

      const categoryButtons = CATEGORIES.map(cat => [
        { text: cat.text, callback_data: `editcat_${cat.value}` }
      ]);

      await bot.sendMessage(chatId, '🏷️ Выберите категорию:', {
        reply_markup: { inline_keyboard: categoryButtons }
      });
      break;

    case 'edit_preorder':
      await bot.answerCallbackQuery(query.id);
      const currentStatus = editData.product.isPreorder;
      await bot.sendMessage(chatId, `🚚 Текущий статус: ${currentStatus ? '📦 На заказ' : '✅ В наличии'}\n\nВыберите новый:`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ В наличии', callback_data: 'editpreorder_no' },
              { text: '📦 На заказ (7-15 дней)', callback_data: 'editpreorder_yes' }
            ]
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
        const success = await db.updateProduct(editData.productId, editData.product);

        if (success) {
          const preorderStatus = editData.product.isPreorder ? '📦 На заказ' : '✅ В наличии';
          await bot.sendMessage(chatId, `
✅ Товар обновлен!

ID: ${editData.productId}
Название: ${editData.product.name}
Цена: ${editData.product.price} ₽
Статус: ${preorderStatus}

📦 БД: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON 📁'}
          `);
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
  if (query.data.startsWith('editcat_') && editData) {
    const category = query.data.replace('editcat_', '');
    editData.product.category = category;
    delete editData.editing;

    await bot.answerCallbackQuery(query.id, { text: `Категория: ${category}` });
    await bot.sendMessage(chatId, `✅ Категория изменена: ${category}\n\n/edit_product ${editData.productId} для продолжения`);
  }

  // Изменение статуса при редактировании
  if (query.data === 'editpreorder_yes' && editData) {
    editData.product.isPreorder = true;
    await bot.answerCallbackQuery(query.id, { text: '📦 На заказ' });
    await bot.sendMessage(chatId, `✅ Статус изменён: На заказ\n\n/edit_product ${editData.productId} для продолжения`);
  }

  if (query.data === 'editpreorder_no' && editData) {
    editData.product.isPreorder = false;
    await bot.answerCallbackQuery(query.id, { text: '✅ В наличии' });
    await bot.sendMessage(chatId, `✅ Статус изменён: В наличии\n\n/edit_product ${editData.productId} для продолжения`);
  }
});

// ========== ОБРАБОТЧИКИ СООБЩЕНИЙ ==========

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!(await isAdmin(userId))) return;
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

        const categoryButtons = CATEGORIES.map(cat => [
          { text: cat.text, callback_data: `cat_${cat.value}` }
        ]);

        await bot.sendMessage(chatId, '🏷️ Выберите категорию:', {
          reply_markup: { inline_keyboard: categoryButtons }
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

  if (!(await isAdmin(userId))) return;

  const data = tempProductData[chatId];
  const editData = tempEditData[chatId];

  if (!data && !editData) return;

  try {
    const photo = msg.photo[msg.photo.length - 1];
    const messageId = msg.message_id;

    await bot.sendMessage(chatId, '⏳ Загружаем фото...');

    const photoUrl = await uploadTelegramPhoto(bot, photo.file_id);

    if (!photoUrl) {
      await bot.sendMessage(chatId, '❌ Ошибка загрузки фото');
      return;
    }

    if (data && data.step === 'photo') {
      data.photos.push({ url: photoUrl, messageId: messageId });
      await bot.sendMessage(chatId, `✅ Фото ${data.photos.length} добавлено\n\nМожете добавить ещё или /done`);
      return;
    }

    if (editData && editData.editing === 'photos') {
      editData.newPhotos.push({ url: photoUrl, messageId: messageId });
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
