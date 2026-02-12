const { MongoClient, ServerApiVersion } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'clothing-shop';

let client;
let db;
let isConnecting = false;

// Подключение к MongoDB с правильными опциями
async function connectDB() {
  if (db) return db;
  if (isConnecting) {
    // Ждём пока подключение завершится
    await new Promise(resolve => setTimeout(resolve, 1000));
    return db;
  }

  try {
    isConnecting = true;
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI не установлена');
    }

    console.log('🔌 Подключаемся к MongoDB...');
    
    client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      // Важные опции для Render.com
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Используем IPv4
      retryWrites: true,
      retryReads: true,
    });

    await client.connect();
    
    // Проверяем подключение
    await client.db("admin").command({ ping: 1 });
    
    db = client.db(DB_NAME);
    console.log('✅ Подключено к MongoDB');
    
    isConnecting = false;
    return db;
  } catch (error) {
    isConnecting = false;
    console.error('❌ Ошибка подключения к MongoDB:', error.message);
    throw error;
  }
}

// Инициализация БД
async function initDatabase() {
  try {
    const database = await connectDB();
    
    // Создаём коллекции если их нет
    const collections = await database.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    if (!collectionNames.includes('products')) {
      await database.createCollection('products');
      console.log('📦 Создана коллекция products');
    }
    if (!collectionNames.includes('users')) {
      await database.createCollection('users');
      console.log('👥 Создана коллекция users');
    }
    if (!collectionNames.includes('stats')) {
      await database.createCollection('stats');
      // Инициализируем статистику
      const statsCount = await database.collection('stats').countDocuments({ _id: 'global' });
      if (statsCount === 0) {
        await database.collection('stats').insertOne({
          _id: 'global',
          totalViews: 0,
          totalUsers: 0,
          popularProducts: {},
          dailyStats: {}
        });
        console.log('📊 Инициализирована статистика');
      }
    }
    
    console.log('✅ MongoDB база данных инициализирована');
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error.message);
    // Не пробрасываем ошибку дальше, чтобы сервер мог запуститься
  }
}

// ========== PRODUCTS ==========

async function getAllProducts() {
  try {
    const database = await connectDB();
    const products = await database.collection('products').find({}).toArray();
    return products;
  } catch (error) {
    console.error('Ошибка получения товаров:', error.message);
    return [];
  }
}

async function getProductById(id) {
  try {
    const database = await connectDB();
    const product = await database.collection('products').findOne({ id });
    return product;
  } catch (error) {
    console.error('Ошибка получения товара:', error.message);
    return null;
  }
}

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
    console.log('✅ Товар добавлен:', newProduct.id);
    return newProduct;
  } catch (error) {
    console.error('Ошибка добавления товара:', error.message);
    return null;
  }
}

async function updateProduct(id, updates) {
  try {
    const database = await connectDB();
    await database.collection('products').updateOne(
      { id },
      { $set: updates }
    );
    return await getProductById(id);
  } catch (error) {
    console.error('Ошибка обновления товара:', error.message);
    return null;
  }
}

async function deleteProduct(id) {
  try {
    const database = await connectDB();
    const result = await database.collection('products').deleteOne({ id });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Ошибка удаления товара:', error.message);
    return false;
  }
}

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
    else sortOptions.createdAt = -1;
    
    const products = await database.collection('products')
      .find(query)
      .sort(sortOptions)
      .toArray();
    
    return products;
  } catch (error) {
    console.error('Ошибка фильтрации товаров:', error.message);
    return [];
  }
}

async function incrementProductViews(id) {
  try {
    const database = await connectDB();
    await database.collection('products').updateOne(
      { id },
      { $inc: { views: 1 } }
    );
    
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
    console.error('Ошибка увеличения просмотров:', error.message);
    return false;
  }
}

// ========== USERS ==========

async function getUser(userId) {
  try {
    const database = await connectDB();
    const user = await database.collection('users').findOne({ id: userId });
    return user;
  } catch (error) {
    console.error('Ошибка получения пользователя:', error.message);
    return null;
  }
}

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
      console.log('✅ Пользователь создан:', userId);
      return newUser;
    } else {
      await database.collection('users').updateOne(
        { id: userId },
        { $set: userData }
      );
      return await getUser(userId);
    }
  } catch (error) {
    console.error('Ошибка upsert пользователя:', error.message);
    return null;
  }
}

async function getAllUsers() {
  try {
    const database = await connectDB();
    const users = await database.collection('users').find({}).toArray();
    return users;
  } catch (error) {
    console.error('Ошибка получения пользователей:', error.message);
    return [];
  }
}

// ========== FAVORITES ==========

async function addToFavorites(userId, productId) {
  try {
    const database = await connectDB();
    
    // Создаём пользователя если его нет
    const user = await getUser(userId);
    if (!user) {
      await upsertUser(userId, { favorites: [productId] });
      return [productId];
    }
    
    await database.collection('users').updateOne(
      { id: userId },
      { $addToSet: { favorites: productId } }
    );
    
    const updatedUser = await getUser(userId);
    return updatedUser?.favorites || [];
  } catch (error) {
    console.error('Ошибка добавления в избранное:', error.message);
    return [];
  }
}

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
    console.error('Ошибка удаления из избранного:', error.message);
    return [];
  }
}

async function getFavorites(userId) {
  try {
    const user = await getUser(userId);
    if (!user || !user.favorites || user.favorites.length === 0) return [];
    
    const database = await connectDB();
    const products = await database.collection('products')
      .find({ id: { $in: user.favorites } })
      .toArray();
    
    return products;
  } catch (error) {
    console.error('Ошибка получения избранного:', error.message);
    return [];
  }
}

// ========== STATS ==========

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
        },
        { upsert: true }
      );
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка обновления статистики:', error.message);
    return false;
  }
}

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
    console.error('Ошибка получения статистики:', error.message);
    return {
      totalViews: 0,
      totalUsers: 0,
      popularProducts: {},
      dailyStats: {}
    };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('👋 MongoDB подключение закрыто');
  }
  process.exit(0);
});

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
  updateStats,
  getStats
};
