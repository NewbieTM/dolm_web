import { useState, useEffect } from 'react';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Favorites from './pages/Favorites';
import Preorder from './pages/Preorder';
import { initTelegramApp, isRunningInTelegram } from './utils/telegram';
import { initTooltipTimer } from './utils/tooltipManager';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [currentPage, setCurrentPage] = useState('catalog');
  const [currentProductId, setCurrentProductId] = useState(null);

  useEffect(() => {
    console.log('🚀 =================================');
    console.log('📱 Telegram Mini App запускается...');
    console.log('🚀 =================================');
    console.log('🌐 URL:', window.location.href);
    console.log('🔗 API URL:', import.meta.env.VITE_API_URL);

    try {
      console.log('🔧 Инициализация Telegram SDK...');
      const tg = initTelegramApp();

      if (tg) {
        console.log('📱 Telegram SDK: ✅ Загружен');
      } else {
        console.log('📱 Telegram SDK: ⚠️  Недоступен');
      }

      const inTelegram = isRunningInTelegram();
      console.log('📱 В Telegram:', inTelegram ? 'ДА' : 'НЕТ');

      console.log('⏱️  Инициализация таймера подсказки...');
      initTooltipTimer();

      console.log('✅ App готов к работе!');
      setIsReady(true);
    } catch (err) {
      console.error('❌ Ошибка инициализации:', err);
      setIsReady(true);
    }

    console.log('🚀 =================================');
  }, []);

  const navigate = {
    toCatalog: () => {
      console.log('📍 Навигация: Каталог');
      setCurrentPage('catalog');
      setCurrentProductId(null);
    },
    toProduct: (productId) => {
      console.log('📍 Навигация: Товар', productId);
      setCurrentPage('product');
      setCurrentProductId(productId);
    },
    toFavorites: () => {
      console.log('📍 Навигация: Избранное');
      setCurrentPage('favorites');
      setCurrentProductId(null);
    },
    toPreorder: () => {
      console.log('📍 Навигация: На заказ');
      setCurrentPage('preorder');
      setCurrentProductId(null);
    },
    back: () => {
      console.log('📍 Навигация: Назад');
      setCurrentPage('catalog');
      setCurrentProductId(null);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  console.log('🔄 Рендер App - Страница:', currentPage, 'Product ID:', currentProductId);

  return (
    <div className="app-container">
      {currentPage === 'catalog' && (
        <Catalog navigate={navigate} />
      )}

      {currentPage === 'product' && currentProductId && (
        <Product productId={currentProductId} navigate={navigate} />
      )}

      {currentPage === 'favorites' && (
        <Favorites navigate={navigate} />
      )}

      {currentPage === 'preorder' && (
        <Preorder navigate={navigate} />
      )}
    </div>
  );
}

export default App;
