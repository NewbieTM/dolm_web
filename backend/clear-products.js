// Скрипт для удаления всех товаров из MongoDB
// Запустите его один раз чтобы очистить базу

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'clothing-shop';

async function clearProducts() {
  let client;
  
  try {
    console.log('🔌 Подключаемся к MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    
    // Удаляем все товары
    const result = await db.collection('products').deleteMany({});
    
    console.log(`🗑️  Удалено товаров: ${result.deletedCount}`);
    console.log('✅ База очищена!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('👋 Отключено от MongoDB');
    }
  }
}

clearProducts();
