const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./database');
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
db.initDatabase();

// ========== ROUTES ==========

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Clothing Shop API',
    version: '1.0.0'
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

// Добавить в избранное
app.post('/api/users/:userId/favorites/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const favorites = await db.addToFavorites(userId, productId);
    
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
    const favorites = await db.removeFromFavorites(userId, productId);
    
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

// ========== HISTORY ==========

// Получить историю просмотров
app.get('/api/users/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await db.getHistory(userId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения истории'
    });
  }
});

// Добавить в историю
app.post('/api/users/:userId/history/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    await db.addToHistory(userId, productId);
    
    res.json({
      success: true,
      message: 'Добавлено в историю'
    });
  } catch (error) {
    console.error('Ошибка добавления в историю:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка добавления в историю'
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

// ========== STATS ==========

// Получить статистику (только для админа)
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики'
    });
  }
});

// ========== CONFIG ==========

// Получить конфигурацию для фронтенда
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      managerUsername: process.env.MANAGER_USERNAME,
      categories: [
        'Обувь',
        'Футболки',
        'Худи',
        'Аксессуары',
        'Джинсы',
        'Головные уборы'
      ]
    }
  });
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint не найден'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Ошибка сервера:', error);
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера'
  });
});

// ========== START SERVER ==========

app.listen(PORT, () => {
  console.log(`✅ API сервер запущен на порту ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`🤖 Telegram бот активен`);
});

module.exports = app;
