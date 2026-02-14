import { useState, useEffect } from 'react';
import { initTelegramApp, isRunningInTelegram, getUserId } from './utils/telegram';
import { getProducts } from './utils/api';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  useEffect(() => {
    console.log('🚀 =================================');
    console.log('📱 App запускается...');
    console.log('🚀 =================================');
    console.log('🌐 URL:', window.location.href);
    console.log('🔗 API URL:', import.meta.env.VITE_API_URL);
    
    try {
      console.log('🔧 Инициализация Telegram SDK...');
      const tg = initTelegramApp();
      
      if (tg) {
        console.log('✅ Telegram SDK загружен');
      } else {
        console.log('⚠️  Telegram SDK недоступен');
      }
      
      const inTelegram = isRunningInTelegram();
      console.log('📱 В Telegram:', inTelegram ? 'ДА' : 'НЕТ');
      console.log('🆔 User ID:', userId);
      
      console.log('✅ App готов!');
      setIsReady(true);
      
    } catch (err) {
      console.error('❌ Ошибка инициализации:', err);
      setIsReady(true);
    }
    
    console.log('🚀 =================================');
  }, []);

  useEffect(() => {
    if (isReady) {
      console.log('==========================================');
      console.log('📦 ЗАГРУЗКА ТОВАРОВ НАЧИНАЕТСЯ');
      console.log('🆔 User ID:', userId);
      console.log('==========================================');
      loadProducts();
    }
  }, [isReady]);

  const loadProducts = async () => {
    try {
      console.log('🔄 Запрос товаров...');
      setLoading(true);
      
      const response = await getProducts({ sort: 'new' });
      console.log('📦 Ответ API:', response);
      
      if (response && response.success) {
        setProducts(response.data || []);
        console.log('✅ Товаров загружено:', response.data?.length || 0);
      } else {
        console.error('❌ API вернул success: false');
      }
    } catch (err) {
      console.error('❌ ОШИБКА загрузки товаров:', err);
      console.error('Детали:', err.message);
    } finally {
      setLoading(false);
      console.log('✅ Загрузка завершена');
    }
  };

  console.log('🔄 Рендер App - ready:', isReady, 'loading:', loading, 'products:', products.length);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Инициализация...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Загрузка товаров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Заголовок */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold">🛍️ Каталог</h1>
        <p className="text-sm text-gray-400 mt-1">
          Товаров: {products.length} | User: {userId}
        </p>
      </header>

      {/* Контент */}
      <div className="p-4">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-bold mb-2">Товаров нет</h2>
            <p className="text-gray-400">Скоро здесь появятся товары</p>
            <button
              onClick={loadProducts}
              className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Обновить
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <div key={product.id} className="bg-gray-800 rounded-lg overflow-hidden">
                {/* Фото */}
                <div className="aspect-square bg-gray-700 relative">
                  {product.photos && product.photos[0] ? (
                    <img
                      src={product.photos[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">📷</span>
                    </div>
                  )}
                </div>
                
                {/* Инфо */}
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400 font-bold">
                      {product.price?.toLocaleString('ru-RU')} ₽
                    </span>
                    {product.views > 0 && (
                      <span className="text-xs text-gray-400">
                        👁 {product.views}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug info внизу */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-white text-xs p-2 font-mono border-t border-gray-700">
        <div>
          📱 App работает | Товаров: {products.length} | User: {userId} | 
          {isRunningInTelegram() ? ' Telegram ✅' : ' Browser ⚠️'}
        </div>
      </div>
    </div>
  );
}

export default App;
