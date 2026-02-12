const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'clothing-shop';

let client;
let db;

// Подключение к MongoDB
async function connectDB() {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(DB_NAME);
      console.log('✅ Подключено к MongoDB');
    }
    return db;
  } catch (error) {
    console.error('❌ Ошибка подключения к MongoDB:', error);
    throw error;
  }
}

// Инициализация БД
async function initDatabase() {
  try {
    await connectDB();
    
    // Создаём коллекции если их нет
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    if (!collectionNames.includes('products')) {
      await db.createCollection('products');
    }
    if (!collectionNames.includes('users')) {
      await db.createCollection('users');
    }
    if (!collectionNames.includes('stats')) {
      await db.createCollection('stats');
      // Инициализируем статистику
      await db.collection('stats').insertOne({
        _id: 'global',
        totalViews: 0,
        totalUsers: 0,
        popularProducts: {},
        dailyStats: {}
      });
    }
    
    console.log('✅ MongoDB база данных инициализирована');
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error);
  }
}

// ========== PRODUCTS ==========

// Получить все товары
async function getAllProducts() {
  try {
    const database = await connectDB();
    const products = await database.collection('products').find({}).toArray();
    return products;
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    return [];
  }
}

// Получить товар по ID
async function getProductById(id) {
  try {
    const database = await connectDB();
    const product = await database.collection('products').findOne({ id });
    return product;
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    return null;
  }
}

// Добавить товар
async function addProduct(product) {
  try {
    const database = await connectDB();
    const newProduct = {
      id: Date.now().toString(),
      ...product,
      createdAt: new Date().toISOString(),
      views: 0
    };
    await database.collection('products').insertOne(newProduct);
    return newProduct;
  } catch (error) {
    console.error('Ошибка добавления товара:', error);
    return null;
  }
}

// Обновить товар
async function updateProduct(id, updates) {
  try {
    const database = await connectDB();
    await database.collection('products').updateOne(
      { id },
      { $set: updates }
    );
    return await getProductById(id);
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    return null;
  }
}

// Удалить товар
async function deleteProduct(id) {
  try {
    const database = await connectDB();
    const result = await database.collection('products').deleteOne({ id });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    return false;
  }
}

// Фильтрация товаров
async function filterProducts({ category, search, sort }) {
  try {
    const database = await connectDB();
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    let sortOptions = {};
    if (sort === 'price_asc') sortOptions.price = 1;
    else if (sort === 'price_desc') sortOptions.price = -1;
    else if (sort === 'popular') sortOptions.views = -1;
    else sortOptions.createdAt = -1; // new
    
    const products = await database.collection('products')
      .find(query)
      .sort(sortOptions)
      .toArray();
    
    return products;
  } catch (error) {
    console.error('Ошибка фильтрации товаров:', error);
    return [];
  }
}

// Увеличить просмотры
async function incrementProductViews(id) {
  try {
    const database = await connectDB();
    await database.collection('products').updateOne(
      { id },
      { $inc: { views: 1 } }
    );
    
    // Обновляем статистику
    await database.collection('stats').updateOne(
      { _id: 'global' },
      { 
        $inc: { 
          totalViews: 1,
          [`popularProducts.${id}`]: 1
        }
      }
    );
    
    return true;
  } catch (error) {
    console.error('Ошибка увеличения просмотров:', error);
    return false;
  }
}

// ========== USERS ==========

// Получить пользователя
async function getUser(userId) {
  try {
    const database = await connectDB();
    const user = await database.collection('users').findOne({ id: userId });
    return user;
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    return null;
  }
}

// Создать/обновить пользователя
async function upsertUser(userId, userData) {
  try {
    const database = await connectDB();
    
    const existingUser = await getUser(userId);
    
    if (!existingUser) {
      const newUser = {
        id: userId,
        createdAt: new Date().toISOString(),
        favorites: [],
        viewHistory: [],
        ...userData
      };
      await database.collection('users').insertOne(newUser);
      return newUser;
    } else {
      await database.collection('users').updateOne(
        { id: userId },
        { $set: userData }
      );
      return await getUser(userId);
    }
  } catch (error) {
    console.error('Ошибка upsert пользователя:', error);
    return null;
  }
}

// Получить всех пользователей
async function getAllUsers() {
  try {
    const database = await connectDB();
    const users = await database.collection('users').find({}).toArray();
    return users;
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    return [];
  }
}

// ========== FAVORITES ==========

// Добавить в избранное
async function addToFavorites(userId, productId) {
  try {
    const database = await connectDB();
    await database.collection('users').updateOne(
      { id: userId },
      { $addToSet: { favorites: productId } }
    );
    
    const user = await getUser(userId);
    return user?.favorites || [];
  } catch (error) {
    console.error('Ошибка добавления в избранное:', error);
    return [];
  }
}

// Удалить из избранного
async function removeFromFavorites(userId, productId) {
  try {
    const database = await connectDB();
    await database.collection('users').updateOne(
      { id: userId },
      { $pull: { favorites: productId } }
    );
    
    const user = await getUser(userId);
    return user?.favorites || [];
  } catch (error) {
    console.error('Ошибка удаления из избранного:', error);
    return [];
  }
}

// Получить избранное
async function getFavorites(userId) {
  try {
    const user = await getUser(userId);
    if (!user || !user.favorites) return [];
    
    const database = await connectDB();
    const products = await database.collection('products')
      .find({ id: { $in: user.favorites } })
      .toArray();
    
    return products;
  } catch (error) {
    console.error('Ошибка получения избранного:', error);
    return [];
  }
}

// ========== HISTORY (опционально, если решите вернуть) ==========

// Добавить в историю
async function addToHistory(userId, productId) {
  try {
    const database = await connectDB();
    
    // Удаляем если уже есть
    await database.collection('users').updateOne(
      { id: userId },
      { $pull: { viewHistory: productId } }
    );
    
    // Добавляем в начало
    await database.collection('users').updateOne(
      { id: userId },
      { $push: { viewHistory: { $each: [productId], $position: 0, $slice: 50 } } }
    );
    
    const user = await getUser(userId);
    return user?.viewHistory || [];
  } catch (error) {
    console.error('Ошибка добавления в историю:', error);
    return [];
  }
}

// Получить историю
async function getHistory(userId) {
  try {
    const user = await getUser(userId);
    if (!user || !user.viewHistory) return [];
    
    const database = await connectDB();
    const products = await database.collection('products')
      .find({ id: { $in: user.viewHistory } })
      .toArray();
    
    // Сортируем по порядку в истории
    const sortedProducts = user.viewHistory
      .map(id => products.find(p => p.id === id))
      .filter(Boolean);
    
    return sortedProducts;
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    return [];
  }
}

// ========== STATS ==========

// Обновить статистику
async function updateStats(type, data) {
  try {
    const database = await connectDB();
    const today = new Date().toISOString().split('T')[0];
    
    if (type === 'userVisit') {
      await database.collection('stats').updateOne(
        { _id: 'global' },
        { 
          $inc: { totalUsers: 1 },
          $addToSet: { [`dailyStats.${today}.users`]: data }
        }
      );
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка обновления статистики:', error);
    return false;
  }
}

// Получить статистику
async function getStats() {
  try {
    const database = await connectDB();
    const stats = await database.collection('stats').findOne({ _id: 'global' });
    return stats || {
      totalViews: 0,
      totalUsers: 0,
      popularProducts: {},
      dailyStats: {}
    };
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    return null;
  }
}

// Экспорт всех функций
module.exports = {
  initDatabase,
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  filterProducts,
  incrementProductViews,
  getUser,
  upsertUser,
  getAllUsers,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  addToHistory,
  getHistory,
  updateStats,
  getStats
};
