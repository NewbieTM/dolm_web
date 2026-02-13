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

// Глобальная переменная для БД
let db;
let USE_MONGODB = false;
let botInstance = null;

// Инициализация базы данных
async function initializeDatabase() {
  const wantsMongoDB = process.env.USE_MONGODB === 'true' && process.env.MONGODB_URI;
  
  if (wantsMongoDB) {
    try {
      console.log('🔄 Попытка подключения к MongoDB...');
      db = require('./mongodb');
      await db.initDatabase();
      USE_MONGODB = true;
      console.log('✅ Используется MongoDB');
      return true;
    } catch (error) {
      console.error('❌ MongoDB недоступна, переключаемся на JSON:', error.message);
      db = require('./database');
      await db.initDatabase();
      console.log('⚠️  Используется JSON (fallback)');
      return false;
    }
  } else {
    db = require('./database');
    await db.initDatabase();
    console.log('📁 Используется JSON файлы');
    return false;
  }
}

// Инициализация бота ТОЛЬКО ОДИН РАЗ
async function initializeBot() {
  // Если бот уже запущен, не запускаем снова
  if (botInstance) {
    console.log('⚠️  Бот уже запущен, пропускаем инициализацию');
    return;
  }

  try {
    // Экспортируем db глобально для бота
    global.dbInstance = db;
    global.USE_MONGODB = USE_MONGODB;
    
    // Импортируем бота
    botInstance = require('./bot');
    console.log('✅ Telegram бот запущен');
  } catch (error) {
    console.error('❌ Ошибка запуска бота:', error.message);
    // Не падаем, если бот не запустился
  }
}

// Запуск приложения
initializeDatabase()
  .then(async () => {
    console.log('✅ База данных готова к работе');
    
    // Запускаем бота только в production
    if (process.env.NODE_ENV === 'production') {
      await initializeBot();
    } else {
      console.log('ℹ️  Бот НЕ запущен (dev mode)');
      console.log('ℹ️  Для запуска бота используйте: node bot.js');
    }
  })
  .catch(err => {
    console.error('❌ Критическая ошибка инициализации:', err);
    process.exit(1);
  });

// ========== ROUTES ==========

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Clothing Shop API',
    version: '1.0.0',
    database: USE_MONGODB ? 'MongoDB' : 'JSON',
    bot: botInstance ? 'active' : 'inactive'
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

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📦 База данных: ${USE_MONGODB ? 'MongoDB' : 'JSON'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'не указан'}`);
});
