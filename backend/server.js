const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Выбор между MongoDB и JSON базой
const USE_MONGODB = process.env.USE_MONGODB === 'true' && process.env.MONGODB_URI;
const db = USE_MONGODB ? require('./mongodb') : require('./database');

console.log('🗄️  Используется:', USE_MONGODB ? 'MongoDB' : 'JSON файлы');

const bot = require('./bot'); // Импортируем бота чтобы он работал

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Инициализация БД при запуске
db.initDatabase().then(() => {
  console.log('✅ База данных готова к работе');
}).catch(err => {
  console.error('❌ Ошибка инициализации БД:', err);
});

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

// Получить все товары с фильтрацией
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    
    const products = await db.filterProducts({
      category,
      search,
      sort
    });
    
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

// Получить товар по ID
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

// Увеличить счётчик просмотров
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

// Получить список категорий
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

// Получить избранное пользователя
app.get('/api/users/:userId/favorites', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('GET favorites for user:', userId);
    
    const favorites = await db.getFavorites(userId);
    console.log('Favorites found:', favorites.length);
    
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

// Добавить в избранное
app.post('/api/users/:userId/favorites/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    console.log('POST add to favorites:', { userId, productId });
    
    const favorites = await db.addToFavorites(userId, productId);
    console.log('Updated favorites:', favorites);
    
    res.json({
      success: true,
      data: favorites,
      message: 'Добавлено в избранное'
    });
  } catch (error) {
    console.error('Ошибка добавления в избранное:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка добавления в избранное'
    });
  }
});

// Удалить из избранного
app.delete('/api/users/:userId/favorites/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    console.log('DELETE from favorites:', { userId, productId });
    
    const favorites = await db.removeFromFavorites(userId, productId);
    console.log('Updated favorites:', favorites);
    
    res.json({
      success: true,
      data: favorites,
      message: 'Удалено из избранного'
    });
  } catch (error) {
    console.error('Ошибка удаления из избранного:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка удаления из избранного'
    });
  }
});

// ========== USER ==========

// Получить или создать пользователя
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

// Получить пользователя
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

// Получить статистику (только для админа)
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
