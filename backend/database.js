const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

// Инициализация папки и файлов
async function initDatabase() {
  try {
    // Создаём папку data если её нет
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Инициализируем файлы если их нет
    const files = [
      { path: PRODUCTS_FILE, defaultData: [] },
      { path: USERS_FILE, defaultData: {} },
      { path: STATS_FILE, defaultData: { 
        totalViews: 0, 
        totalUsers: 0, 
        popularProducts: {},
        dailyStats: {}
      }}
    ];

    for (const file of files) {
      try {
        await fs.access(file.path);
      } catch {
        await fs.writeFile(file.path, JSON.stringify(file.defaultData, null, 2));
      }
    }

    console.log('✅ База данных инициализирована');
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error);
  }
}

// Чтение JSON файла
async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка чтения файла:', error);
    return null;
  }
}

// Запись в JSON файл
async function writeJSON(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Ошибка записи в файл:', error);
    return false;
  }
}

// ========== PRODUCTS ==========

// Получить все товары
async function getAllProducts() {
  return await readJSON(PRODUCTS_FILE) || [];
}

// Получить товар по ID
async function getProductById(id) {
  const products = await getAllProducts();
  return products.find(p => p.id === id);
}

// Добавить товар
async function addProduct(product) {
  const products = await getAllProducts();
  const newProduct = {
    id: Date.now().toString(),
    ...product,
    createdAt: new Date().toISOString(),
    views: 0
  };
  products.push(newProduct);
  await writeJSON(PRODUCTS_FILE, products);
  return newProduct;
}

// Обновить товар
async function updateProduct(id, updates) {
  const products = await getAllProducts();
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() };
  await writeJSON(PRODUCTS_FILE, products);
  return products[index];
}

// Удалить товар
async function deleteProduct(id) {
  const products = await getAllProducts();
  const filtered = products.filter(p => p.id !== id);
  if (filtered.length === products.length) return false;
  
  await writeJSON(PRODUCTS_FILE, filtered);
  return true;
}

// Фильтрация товаров
async function filterProducts(filters = {}) {
  let products = await getAllProducts();
  
  // Фильтр по категории
  if (filters.category) {
    products = products.filter(p => p.category === filters.category);
  }
  
  // Поиск по названию
  if (filters.search) {
    const search = filters.search.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search)
    );
  }
  
  // Сортировка
  if (filters.sort === 'price_asc') {
    products.sort((a, b) => a.price - b.price);
  } else if (filters.sort === 'price_desc') {
    products.sort((a, b) => b.price - a.price);
  } else if (filters.sort === 'views') {
    products.sort((a, b) => b.views - a.views);
  } else {
    // По умолчанию - новые сначала
    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  return products;
}

// Увеличить счётчик просмотров
async function incrementProductViews(id) {
  const products = await getAllProducts();
  const product = products.find(p => p.id === id);
  if (!product) return false;
  
  product.views = (product.views || 0) + 1;
  await writeJSON(PRODUCTS_FILE, products);
  
  // Обновляем статистику
  await updateStats('productView', id);
  
  return true;
}

// ========== USERS ==========

// Получить пользователя
async function getUser(userId) {
  const users = await readJSON(USERS_FILE);
  return users[userId] || null;
}

// Создать или обновить пользователя
async function upsertUser(userId, userData) {
  const users = await readJSON(USERS_FILE);
  
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      createdAt: new Date().toISOString(),
      favorites: [],
      viewHistory: [],
      ...userData
    };
  } else {
    users[userId] = { ...users[userId], ...userData };
  }
  
  await writeJSON(USERS_FILE, users);
  return users[userId];
}

// Получить всех пользователей
async function getAllUsers() {
  const users = await readJSON(USERS_FILE);
  return Object.values(users);
}

// Добавить в избранное
async function addToFavorites(userId, productId) {
  const users = await readJSON(USERS_FILE);
  if (!users[userId]) {
    users[userId] = { id: userId, favorites: [], viewHistory: [] };
  }
  
  if (!users[userId].favorites.includes(productId)) {
    users[userId].favorites.push(productId);
    await writeJSON(USERS_FILE, users);
  }
  
  return users[userId].favorites;
}

// Удалить из избранного
async function removeFromFavorites(userId, productId) {
  const users = await readJSON(USERS_FILE);
  if (!users[userId]) return [];
  
  users[userId].favorites = users[userId].favorites.filter(id => id !== productId);
  await writeJSON(USERS_FILE, users);
  
  return users[userId].favorites;
}

// Получить избранное
async function getFavorites(userId) {
  const user = await getUser(userId);
  if (!user) return [];
  
  const products = await getAllProducts();
  return products.filter(p => user.favorites.includes(p.id));
}

// Добавить в историю
async function addToHistory(userId, productId) {
  const users = await readJSON(USERS_FILE);
  if (!users[userId]) {
    users[userId] = { id: userId, favorites: [], viewHistory: [] };
  }
  
  // Удаляем если уже есть (чтобы добавить в начало)
  users[userId].viewHistory = users[userId].viewHistory.filter(id => id !== productId);
  
  // Добавляем в начало
  users[userId].viewHistory.unshift(productId);
  
  // Ограничиваем историю 50 товарами
  if (users[userId].viewHistory.length > 50) {
    users[userId].viewHistory = users[userId].viewHistory.slice(0, 50);
  }
  
  await writeJSON(USERS_FILE, users);
  return users[userId].viewHistory;
}

// Получить историю
async function getHistory(userId) {
  const user = await getUser(userId);
  if (!user || !user.viewHistory) return [];
  
  const products = await getAllProducts();
  return user.viewHistory
    .map(id => products.find(p => p.id === id))
    .filter(p => p); // Удаляем удалённые товары
}

// ========== STATS ==========

// Обновить статистику
async function updateStats(action, data) {
  const stats = await readJSON(STATS_FILE);
  const today = new Date().toISOString().split('T')[0];

  // Инициализируем и нормализуем дневную статистику
  if (!stats.dailyStats[today]) {
    stats.dailyStats[today] = { views: 0, users: [] };
  } else if (!Array.isArray(stats.dailyStats[today].users)) {
    // На случай, если ранее тут оказался Set или неверный тип
    stats.dailyStats[today].users = Array.from(stats.dailyStats[today].users || []);
  }
  
  switch (action) {
    case 'productView':
      stats.totalViews++;
      stats.dailyStats[today].views++;
      
      // Популярные товары
      if (!stats.popularProducts[data]) {
        stats.popularProducts[data] = 0;
      }
      stats.popularProducts[data]++;
      break;
      
    case 'userVisit':
      if (!stats.dailyStats[today].users) {
        stats.dailyStats[today].users = [];
      }
      if (!stats.dailyStats[today].users.includes(data)) {
        stats.dailyStats[today].users.push(data);
        stats.totalUsers++;
      }
      break;
  }
  
  await writeJSON(STATS_FILE, stats);
  return stats;
}

// Получить статистику
async function getStats() {
  const stats = await readJSON(STATS_FILE);
  const products = await getAllProducts();
  const users = await getAllUsers();
  
  // Топ-5 популярных товаров
  const topProducts = Object.entries(stats.popularProducts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, views]) => ({
      product: products.find(p => p.id === id),
      views
    }))
    .filter(item => item.product);
  
  // Статистика за последние 7 дней
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayStats = stats.dailyStats[dateStr] || { views: 0, users: [] };
    
    last7Days.push({
      date: dateStr,
      views: dayStats.views || 0,
      users: Array.isArray(dayStats.users) ? dayStats.users.length : 0
    });
  }
  
  return {
    totalProducts: products.length,
    totalUsers: users.length,
    totalViews: stats.totalViews,
    topProducts,
    last7Days,
    categories: getCategoriesStats(products)
  };
}

// Статистика по категориям
function getCategoriesStats(products) {
  const stats = {};
  products.forEach(p => {
    if (!stats[p.category]) {
      stats[p.category] = 0;
    }
    stats[p.category]++;
  });
  return stats;
}

module.exports = {
  initDatabase,
  
  // Products
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  filterProducts,
  incrementProductViews,
  
  // Users
  getUser,
  upsertUser,
  getAllUsers,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  addToHistory,
  getHistory,
  
  // Stats
  updateStats,
  getStats
};
