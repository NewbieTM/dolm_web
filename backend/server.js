const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Глобальная переменная для БД (будет установлена при инициализации)
let db = null;
let USE_MONGODB = false;

// Функция инициализации БД
async function initializeDatabase() {
  console.log('🔧 Инициализация базы данных...');
  
  const wantsMongoDB = process.env.USE_MONGODB === 'true' && process.env.MONGODB_URI;
  
  if (wantsMongoDB) {
    try {
      console.log('🔄 Попытка подключения к MongoDB...');
      const mongoDb = require('./mongodb');
      await mongoDb.initDatabase();
      db = mongoDb;
      USE_MONGODB = true;
      console.log('✅ MongoDB подключена и инициализирована');
      return true;
    } catch (error) {
      console.error('❌ MongoDB недоступна:', error.message);
      console.log('⚠️  Переключаемся на JSON файлы...');
    }
  }
  
  // Fallback на JSON
  const jsonDb = require('./database');
  await jsonDb.initDatabase();
  db = jsonDb;
  USE_MONGODB = false;
  console.log('✅ JSON база данных инициализирована');
  return false;
}

// Функция запуска бота
async function startBot() {
  // Передаем БД в глобальную переменную для бота
  global.dbInstance = db;
  global.USE_MONGODB = USE_MONGODB;
  
  try {
    require('./bot');
    console.log('✅ Telegram бот запущен');
  } catch (error) {
    console.error('❌ Ошибка запуска бота:', error.message);
  }
}

// ========== ROUTES ==========

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Clothing Shop API',
    version: '1.0.0',
    database: USE_MONGODB ? 'MongoDB' : 'JSON'
  });
});

// Получить конфигурацию
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      managerUsername: process.env.MANAGER_USERNAME || 'manager'
    }
  });
});

// ========== PRODUCTS ==========

app.get('/api/products', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    const products = await db.filterProducts({ category, search, sort });
    
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения товаров'
    });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.getProductById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Товар не найден'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения товара'
    });
  }
});

app.post('/api/products/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    await db.incrementProductViews(id);
    
    res.json({
      success: true,
      message: 'Просмотр зафиксирован'
    });
  } catch (error) {
    console.error('Ошибка фиксации просмотра:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка'
    });
  }
});

// ========== CATEGORIES ==========

app.get('/api/categories', async (req, res) => {
  try {
    const products = await db.getAllProducts();
    const categories = [...new Set(products.map(p => p.category))];
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения категорий'
    });
  }
});

// ========== FAVORITES ==========

app.post('/api/users/:userId/favorites/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const result = await db.addToFavorites(userId, productId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Ошибка добавления в избранное:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка добавления в избранное'
    });
  }
});

app.delete('/api/users/:userId/favorites/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const result = await db.removeFromFavorites(userId, productId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Ошибка удаления из избранного:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка удаления из избранного'
    });
  }
});

app.get('/api/users/:userId/favorites', async (req, res) => {
  try {
    const { userId } = req.params;
    const favorites = await db.getFavorites(userId);
    
    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Ошибка получения избранного:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения избранного'
    });
  }
});

// ========== USER ==========

app.post('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = req.body;
    
    const user = await db.upsertUser(userId, userData);
    await db.updateStats('userVisit', userId);
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Ошибка работы с пользователем:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка'
    });
  }
});

app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await db.getUser(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка'
    });
  }
});

// ========== ADMIN ENDPOINTS ==========

app.get('/api/admin/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    const products = await db.getAllProducts();
    const users = await db.getAllUsers();
    
    res.json({
      success: true,
      data: {
        ...stats,
        totalProducts: products.length,
        totalUsers: users.length
      }
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики'
    });
  }
});

// ========== ГЛАВНАЯ ФУНКЦИЯ ЗАПУСКА ==========

async function startServer() {
  try {
    // 1. Инициализируем БД
    await initializeDatabase();
    
    // 2. Запускаем HTTP сервер
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🚀 ================================');
      console.log(`📡 Сервер запущен на порту ${PORT}`);
      console.log(`📦 База данных: ${USE_MONGODB ? 'MongoDB ✅' : 'JSON 📁'}`);
      console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || 'не указан'}`);
      console.log('🚀 ================================');
      console.log('');
    });
    
    // 3. Запускаем бота (только в production)
    if (process.env.NODE_ENV === 'production') {
      await startBot();
    } else {
      console.log('ℹ️  Бот НЕ запущен (dev mode)');
    }
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  }
}

// Запускаем сервер
startServer();
