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

const CATEGORIES = [
  { text: '👕 Худи', value: 'Худи' },
  { text: '👔 Футболки', value: 'Футболки' },
  { text: '👟 Обувь', value: 'Обувь' },
  { text: '👜 Сумки', value: 'Сумки' },
  { text: '💄 Косметика', value: 'Косметика' },
  { text: '💍 Украшения', value: 'Украшения' }
];

const PAGE_SIZE = 8;

async function loadAdmins() {
  try {
    const data = await fs.readFile(ADMINS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
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
const tempEditData    = {};
const tempInsertData  = {}; // для /insert_photo

// Состояние пагинации: chatId -> { page, messageId }
const listState = {};

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательные функции для списка товаров (пагинация)
// ─────────────────────────────────────────────────────────────────────────────

function buildListMessage(products, page) {
  const totalPages = Math.ceil(products.length / PAGE_SIZE);
  const slice      = products.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  let text = `📦 Товары — стр. ${page + 1}/${totalPages} (всего: ${products.length})\n`;
  text    += `БД: ${USE_MONGODB ? 'MongoDB' : 'JSON'}\n`;
  text    += '—'.repeat(24) + '\n\n';

  slice.forEach((p, i) => {
    const n    = page * PAGE_SIZE + i + 1;
    const mark = p.isPreorder ? '📦' : '✅';
    text += `${n}. ${mark} ${p.name}\n`;
    text += `   ${p.price.toLocaleString('ru-RU')} руб  |  ${p.category}\n`;
    text += `   ID: ${p.id}\n`;
    text += `   Фото: ${p.photos.length} шт.\n\n`;
  });

  text += '/edit_product [ID] — редакт.\n';
  text += '/delete_product [ID] — удалить\n';
  text += '/insert_photo [ID] [позиция] — вставить фото';

  return text;
}

function buildListKeyboard(products, page) {
  const totalPages = Math.ceil(products.length / PAGE_SIZE);
  const nav = [];

  if (page > 0)              nav.push({ text: '◀️ Назад',   callback_data: `lp_${page - 1}` });
  nav.push({ text: `${page + 1} / ${totalPages}`,           callback_data: 'lp_noop' });
  if (page < totalPages - 1) nav.push({ text: 'Вперёд ▶️', callback_data: `lp_${page + 1}` });

  return { inline_keyboard: [nav] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Команды
// ─────────────────────────────────────────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const chatId   = msg.chat.id;
  const userName = msg.from.first_name || 'друг';

  await bot.sendMessage(chatId,
    `👋 Привет, ${userName}!\n\nДобро пожаловать в наш магазин!\n\nНажми кнопку ниже, чтобы открыть каталог 👇`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: '🛍️ Открыть магазин', web_app: { url: FRONTEND_URL } }]]
      }
    }
  );
});

bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (!(await isAdmin(userId))) { await bot.sendMessage(chatId, '❌ Нет доступа'); return; }

  const isMainAdmin = userId === ADMIN_ID;
  await bot.sendMessage(chatId, `
🔧 Админ-панель

Команды:
/add_product — добавить товар
/edit_product [ID] — редактировать
/insert_photo [ID] [позиция] — вставить фото
/list_products — список товаров
/delete_product [ID] — удалить товар
/stats — статистика
${isMainAdmin ? '\n👥 Управление админами:\n/list_admins\n/add_admin [ID]\n/remove_admin [ID]' : ''}

📦 БД: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON 📁'}
  `);
});

// ── /list_products ────────────────────────────────────────────────────────────
bot.onText(/\/list_products/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (!(await isAdmin(userId))) return;

  const products = await db.getAllProducts();
  if (products.length === 0) {
    await bot.sendMessage(chatId, '📦 Товаров нет\n\n/add_product для добавления');
    return;
  }

  const page = 0;
  const text  = buildListMessage(products, page);
  const reply_markup = buildListKeyboard(products, page);

  const sent = await bot.sendMessage(chatId, text, { reply_markup });

  listState[chatId] = { page, messageId: sent.message_id };
});

// ── /add_product ──────────────────────────────────────────────────────────────
bot.onText(/\/add_product/, async (msg) => {
  const chatId = msg.chat.id;
  if (!(await isAdmin(msg.from.id))) return;
  tempProductData[chatId] = { step: 'name' };
  await bot.sendMessage(chatId, '📌 Введите название товара:');
});

// ── /insert_photo ─────────────────────────────────────────────────────────────
// Использование: /insert_photo [product_id] [position]
// position — 0-based индекс (0 = в начало). Если не указан — по умолчанию 0.
bot.onText(/\/insert_photo(?:\s+(\S+))?(?:\s+(\d+))?/, async (msg, match) => {
  const chatId    = msg.chat.id;
  const userId    = msg.from.id;
  if (!(await isAdmin(userId))) return;

  const productId = match[1];
  const position  = match[2] !== undefined ? parseInt(match[2]) : 0;

  if (!productId) {
    await bot.sendMessage(chatId,
      '❓ Использование:\n/insert_photo [ID товара] [позиция]\n\nПример:\n/insert_photo 1770821073966 0\n\n(0 = начало, 1 = после первого фото и т.д.)'
    );
    return;
  }

  const product = await db.getProductById(productId);
  if (!product) {
    await bot.sendMessage(chatId, `❌ Товар ${productId} не найден`);
    return;
  }

  const clampedPos = Math.max(0, Math.min(position, product.photos.length));

  tempInsertData[chatId] = {
    productId,
    position: clampedPos,
    productName: product.name,
    totalPhotos: product.photos.length
  };

  await bot.sendMessage(chatId,
    `📸 Товар: ${product.name}\n` +
    `Текущих фото: ${product.photos.length}\n` +
    `Позиция вставки: ${clampedPos} ${clampedPos === 0 ? '(превью / самое первое)' : `(после фото №${clampedPos})`}\n\n` +
    `Отправьте фото 👇`
  );
});

// ── /edit_product ─────────────────────────────────────────────────────────────
bot.onText(/\/edit_product (.+)/, async (msg, match) => {
  const chatId    = msg.chat.id;
  const userId    = msg.from.id;
  const productId = match[1].trim();
  if (!(await isAdmin(userId))) return;

  const product = await db.getProductById(productId);
  if (!product) { await bot.sendMessage(chatId, `❌ Товар ${productId} не найден`); return; }

  tempEditData[chatId] = { productId, product: { ...product } };

  const preorderStatus = product.isPreorder ? '📦 На заказ' : '✅ В наличии';
  await bot.sendMessage(chatId,
    `📝 Редактирование\n\n📌 ${product.name}\n💰 ${product.price} ₽\n🏷 ${product.category}\n🚚 ${preorderStatus}\n📸 ${product.photos.length} фото\n\nЧто изменить?`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📌 Название',      callback_data: 'edit_name' }],
          [{ text: '💰 Цена',          callback_data: 'edit_price' }],
          [{ text: '📝 Описание',      callback_data: 'edit_description' }],
          [{ text: '🏷️ Категория',    callback_data: 'edit_category' }],
          [{ text: '🚚 Статус наличия', callback_data: 'edit_preorder' }],
          [{ text: '📸 Заменить все фото', callback_data: 'edit_photos' }],
          [
            { text: '✅ Сохранить', callback_data: 'edit_save' },
            { text: '❌ Отмена',    callback_data: 'edit_cancel' }
          ]
        ]
      }
    }
  );
});

// ── /list_products (прочие команды) ──────────────────────────────────────────

bot.onText(/\/delete_product (.+)/, async (msg, match) => {
  const chatId    = msg.chat.id;
  const productId = match[1].trim();
  if (!(await isAdmin(msg.from.id))) return;

  const deleted = await db.deleteProduct(productId);
  await bot.sendMessage(chatId, deleted ? `✅ Товар ${productId} удалён` : `❌ Товар ${productId} не найден`);
});

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  if (!(await isAdmin(msg.from.id))) return;

  const products = await db.getAllProducts();
  const users    = await db.getAllUsers();
  const admins   = await loadAdmins();
  const inStock  = products.filter(p => !p.isPreorder).length;
  const onOrder  = products.filter(p => p.isPreorder).length;

  await bot.sendMessage(chatId,
    `📊 Статистика\n\n👥 Пользователей: ${users.length}\n📦 Товаров всего: ${products.length}\n✅ В наличии: ${inStock}\n📦 На заказ: ${onOrder}\n🔧 Админов: ${admins.length}\n\nБД: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON 📁'}`
  );
});

bot.onText(/\/done/, async (msg) => {
  const chatId = msg.chat.id;
  const data   = tempProductData[chatId];
  if (!(await isAdmin(msg.from.id)) || !data) return;

  if (!data.name || !data.price || !data.description || !data.category || !data.photos?.length) {
    await bot.sendMessage(chatId, '❌ Не все поля заполнены\n\n/add_product для начала');
    delete tempProductData[chatId];
    return;
  }

  const sortedPhotos = data.photos.sort((a, b) => a.messageId - b.messageId).map(p => p.url);
  const product = await db.addProduct({
    name: data.name, price: data.price, description: data.description,
    category: data.category, isPreorder: data.isPreorder || false, photos: sortedPhotos
  });

  if (product) {
    await bot.sendMessage(chatId,
      `✅ Товар добавлен!\n\nID: ${product.id}\nНазвание: ${product.name}\nЦена: ${product.price} ₽\nКатегория: ${product.category}\nСтатус: ${product.isPreorder ? '📦 На заказ' : '✅ В наличии'}\nФото: ${product.photos.length} шт.`
    );
  } else {
    await bot.sendMessage(chatId, '❌ Ошибка добавления');
  }
  delete tempProductData[chatId];
});

bot.onText(/\/done_photos/, async (msg) => {
  const chatId   = msg.chat.id;
  const editData = tempEditData[chatId];
  if (!(await isAdmin(msg.from.id)) || !editData || editData.editing !== 'photos') return;

  if (!editData.newPhotos?.length) { await bot.sendMessage(chatId, '❌ Нет новых фото'); return; }

  const sortedPhotos = editData.newPhotos.sort((a, b) => a.messageId - b.messageId).map(p => p.url);
  editData.product.photos = sortedPhotos;
  delete editData.editing;

  await bot.sendMessage(chatId, `✅ Фото обновлены (${sortedPhotos.length} шт.)\n\n/edit_product ${editData.productId} для продолжения`);
});

// ── Управление админами ───────────────────────────────────────────────────────

bot.onText(/\/list_admins/, async (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  const admins = await loadAdmins();
  await bot.sendMessage(msg.chat.id, `👥 Админы (${admins.length}):\n${admins.join('\n')}`);
});

bot.onText(/\/add_admin (.+)/, async (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  const newId = parseInt(match[1]);
  if (isNaN(newId)) { await bot.sendMessage(msg.chat.id, '❌ Неправильный ID'); return; }
  const admins = await loadAdmins();
  if (admins.includes(newId)) { await bot.sendMessage(msg.chat.id, '⚠️ Уже является админом'); return; }
  admins.push(newId);
  await saveAdmins(admins);
  await bot.sendMessage(msg.chat.id, `✅ Админ ${newId} добавлен`);
});

bot.onText(/\/remove_admin (.+)/, async (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  const removeId = parseInt(match[1]);
  if (removeId === ADMIN_ID) { await bot.sendMessage(msg.chat.id, '❌ Нельзя удалить главного админа'); return; }
  const admins = await loadAdmins();
  const filtered = admins.filter(id => id !== removeId);
  if (filtered.length === admins.length) { await bot.sendMessage(msg.chat.id, '❌ Админ не найден'); return; }
  await saveAdmins(filtered);
  await bot.sendMessage(msg.chat.id, `✅ Админ ${removeId} удалён`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Callback queries
// ─────────────────────────────────────────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const cbData = query.data;

  if (!(await isAdmin(userId))) {
    await bot.answerCallbackQuery(query.id, { text: '❌ Нет доступа' });
    return;
  }

  // ── Пагинация списка товаров ──────────────────────────────────────────────
  if (cbData === 'lp_noop') {
    await bot.answerCallbackQuery(query.id);
    return;
  }

  if (cbData.startsWith('lp_')) {
    const page     = parseInt(cbData.replace('lp_', ''));
    const products = await db.getAllProducts();

    if (!products.length) { await bot.answerCallbackQuery(query.id, { text: 'Нет товаров' }); return; }

    const text         = buildListMessage(products, page);
    const reply_markup = buildListKeyboard(products, page);

    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup
      });
    } catch (e) {
      // Если сообщение не изменилось — игнорируем
    }

    listState[chatId] = { page, messageId: query.message.message_id };
    await bot.answerCallbackQuery(query.id);
    return;
  }

  // ── Добавление товара: выбор наличия ─────────────────────────────────────
  const data = tempProductData[chatId];

  if (cbData === 'preorder_yes' && data) {
    data.isPreorder = true; data.step = 'photo'; data.photos = [];
    await bot.answerCallbackQuery(query.id, { text: '📦 На заказ' });
    await bot.sendMessage(chatId, '📸 Отправьте фото товара (можно несколько)\n\nКогда закончите — /done');
    return;
  }

  if (cbData === 'preorder_no' && data) {
    data.isPreorder = false; data.step = 'photo'; data.photos = [];
    await bot.answerCallbackQuery(query.id, { text: '✅ В наличии' });
    await bot.sendMessage(chatId, '📸 Отправьте фото товара (можно несколько)\n\nКогда закончите — /done');
    return;
  }

  if (cbData.startsWith('cat_') && data) {
    const category = cbData.replace('cat_', '');
    data.category = category; data.step = 'preorder';
    await bot.answerCallbackQuery(query.id, { text: `Категория: ${category}` });
    await bot.sendMessage(chatId, '🚚 Товар в наличии или на заказ?', {
      reply_markup: { inline_keyboard: [[
        { text: '✅ В наличии',             callback_data: 'preorder_no' },
        { text: '📦 На заказ (7-15 дней)', callback_data: 'preorder_yes' }
      ]]}
    });
    return;
  }

  // ── Редактирование товара ─────────────────────────────────────────────────
  const editData = tempEditData[chatId];
  if (!editData) return;

  switch (cbData) {
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
        reply_markup: { inline_keyboard: CATEGORIES.map(c => [{ text: c.text, callback_data: `editcat_${c.value}` }]) }
      });
      break;

    case 'edit_preorder':
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `🚚 Текущий: ${editData.product.isPreorder ? '📦 На заказ' : '✅ В наличии'}\n\nВыберите новый:`,
        {
          reply_markup: { inline_keyboard: [[
            { text: '✅ В наличии',             callback_data: 'editpreorder_no' },
            { text: '📦 На заказ (7-15 дней)', callback_data: 'editpreorder_yes' }
          ]]}
        }
      );
      break;

    case 'edit_photos':
      editData.editing = 'photos'; editData.newPhotos = [];
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '📸 Отправьте новые фото (заменят старые)\n\nКогда закончите — /done_photos');
      break;

    case 'edit_save':
      await bot.answerCallbackQuery(query.id, { text: 'Сохраняем...' });
      try {
        const ok = await db.updateProduct(editData.productId, editData.product);
        if (ok) {
          await bot.sendMessage(chatId,
            `✅ Товар обновлён!\n\nID: ${editData.productId}\nНазвание: ${editData.product.name}\nЦена: ${editData.product.price} ₽\nСтатус: ${editData.product.isPreorder ? '📦 На заказ' : '✅ В наличии'}`
          );
        } else {
          await bot.sendMessage(chatId, '❌ Ошибка сохранения');
        }
      } catch (e) {
        await bot.sendMessage(chatId, `❌ Ошибка: ${e.message}`);
      }
      delete tempEditData[chatId];
      break;

    case 'edit_cancel':
      await bot.answerCallbackQuery(query.id, { text: 'Отменено' });
      await bot.sendMessage(chatId, '❌ Редактирование отменено');
      delete tempEditData[chatId];
      break;
  }

  if (cbData.startsWith('editcat_') && editData) {
    const category = cbData.replace('editcat_', '');
    editData.product.category = category; delete editData.editing;
    await bot.answerCallbackQuery(query.id, { text: `Категория: ${category}` });
    await bot.sendMessage(chatId, `✅ Категория: ${category}\n\n/edit_product ${editData.productId} для продолжения`);
  }

  if (cbData === 'editpreorder_yes' && editData) {
    editData.product.isPreorder = true;
    await bot.answerCallbackQuery(query.id, { text: '📦 На заказ' });
    await bot.sendMessage(chatId, `✅ Статус: На заказ\n\n/edit_product ${editData.productId} для продолжения`);
  }

  if (cbData === 'editpreorder_no' && editData) {
    editData.product.isPreorder = false;
    await bot.answerCallbackQuery(query.id, { text: '✅ В наличии' });
    await bot.sendMessage(chatId, `✅ Статус: В наличии\n\n/edit_product ${editData.productId} для продолжения`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Текстовые сообщения
// ─────────────────────────────────────────────────────────────────────────────

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text   = msg.text;
  if (!(await isAdmin(msg.from.id))) return;
  if (!text || text.startsWith('/')) return;

  // Добавление товара
  const data = tempProductData[chatId];
  if (data) {
    switch (data.step) {
      case 'name':
        data.name = text; data.step = 'price';
        await bot.sendMessage(chatId, '💰 Введите цену (число):');
        break;
      case 'price': {
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) { await bot.sendMessage(chatId, '❌ Неправильная цена. Введите число:'); return; }
        data.price = price; data.step = 'description';
        await bot.sendMessage(chatId, '📝 Введите описание:');
        break;
      }
      case 'description':
        data.description = text; data.step = 'category';
        await bot.sendMessage(chatId, '🏷️ Выберите категорию:', {
          reply_markup: { inline_keyboard: CATEGORIES.map(c => [{ text: c.text, callback_data: `cat_${c.value}` }]) }
        });
        break;
    }
    return;
  }

  // Редактирование товара
  const editData = tempEditData[chatId];
  if (editData?.editing) {
    switch (editData.editing) {
      case 'name':
        editData.product.name = text; delete editData.editing;
        await bot.sendMessage(chatId, `✅ Название изменено\n\n/edit_product ${editData.productId} для продолжения`);
        break;
      case 'price': {
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) { await bot.sendMessage(chatId, '❌ Неправильная цена:'); return; }
        editData.product.price = price; delete editData.editing;
        await bot.sendMessage(chatId, `✅ Цена: ${price} ₽\n\n/edit_product ${editData.productId} для продолжения`);
        break;
      }
      case 'description':
        editData.product.description = text; delete editData.editing;
        await bot.sendMessage(chatId, `✅ Описание изменено\n\n/edit_product ${editData.productId} для продолжения`);
        break;
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Обработка фото
// ─────────────────────────────────────────────────────────────────────────────

bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  if (!(await isAdmin(msg.from.id))) return;

  const data       = tempProductData[chatId];
  const editData   = tempEditData[chatId];
  const insertData = tempInsertData[chatId];

  if (!data && !editData && !insertData) return;

  try {
    const photo     = msg.photo[msg.photo.length - 1];
    const messageId = msg.message_id;

    const uploading = await bot.sendMessage(chatId, '⏳ Загружаем фото...');
    const photoUrl  = await uploadTelegramPhoto(bot, photo.file_id);
    await bot.deleteMessage(chatId, uploading.message_id).catch(() => {});

    if (!photoUrl) { await bot.sendMessage(chatId, '❌ Ошибка загрузки фото'); return; }

    // ── Вставка фото на позицию ──────────────────────────────────────────────
    if (insertData) {
      const product = await db.getProductById(insertData.productId);
      if (!product) { await bot.sendMessage(chatId, '❌ Товар не найден'); delete tempInsertData[chatId]; return; }

      // Вставляем фото в нужную позицию
      const newPhotos = [...product.photos];
      newPhotos.splice(insertData.position, 0, photoUrl);

      await db.updateProduct(insertData.productId, { photos: newPhotos });

      await bot.sendMessage(chatId,
        `✅ Фото вставлено!\n\n` +
        `📌 Товар: ${insertData.productName}\n` +
        `📍 Позиция: ${insertData.position} ${insertData.position === 0 ? '(превью / первое)' : ''}\n` +
        `📸 Всего фото: ${newPhotos.length}\n\n` +
        `Порядок фото:\n` +
        newPhotos.map((url, i) => `${i}. ${i === insertData.position ? '🆕 ' : ''}${url.split('/').pop().slice(0, 20)}…`).join('\n')
      );

      delete tempInsertData[chatId];
      return;
    }

    // ── Добавление товара ─────────────────────────────────────────────────────
    if (data?.step === 'photo') {
      data.photos.push({ url: photoUrl, messageId });
      await bot.sendMessage(chatId, `✅ Фото ${data.photos.length} добавлено\n\nМожете добавить ещё или /done`);
      return;
    }

    // ── Редактирование (замена всех фото) ────────────────────────────────────
    if (editData?.editing === 'photos') {
      editData.newPhotos.push({ url: photoUrl, messageId });
      await bot.sendMessage(chatId, `✅ Фото ${editData.newPhotos.length} добавлено\n\n/done_photos когда закончите`);
      return;
    }

  } catch (error) {
    console.error('❌ Ошибка загрузки фото:', error);
    await bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────

bot.on('polling_error', (error) => {
  console.error('⚠️  Polling error:', error.code);
});

console.log('✅ Telegram бот готов');
module.exports = bot;
