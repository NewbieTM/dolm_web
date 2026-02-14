// Утилита для кеширования данных с автоматическим устареванием
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

// Структура кеша: { data, timestamp }
const cache = new Map();

// Сохранить данные в кеш
export function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  console.log(`💾 Кеш сохранен: ${key}`);
}

// Получить данные из кеша
export function getCache(key) {
  const cached = cache.get(key);
  
  if (!cached) {
    console.log(`❌ Кеш промах: ${key}`);
    return null;
  }
  
  const age = Date.now() - cached.timestamp;
  
  // Если данные устарели
  if (age > CACHE_DURATION) {
    console.log(`⏰ Кеш устарел: ${key} (возраст: ${Math.round(age / 1000)}с)`);
    cache.delete(key);
    return null;
  }
  
  console.log(`✅ Кеш попадание: ${key}`);
  return cached.data;
}

// Очистить конкретный ключ
export function clearCache(key) {
  cache.delete(key);
  console.log(`🗑️  Кеш очищен: ${key}`);
}

// Очистить весь кеш
export function clearAllCache() {
  cache.clear();
  console.log(`🗑️  Весь кеш очищен`);
}

// Инвалидация кеша по префиксу
export function invalidateCacheByPrefix(prefix) {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      count++;
    }
  }
  console.log(`🗑️  Инвалидировано ${count} записей с префиксом "${prefix}"`);
}

// Получить информацию о кеше
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}
