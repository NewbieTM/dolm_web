import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Favorites from './pages/Favorites';
import { initTelegramApp, isRunningInTelegram } from './utils/telegram';

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('🚀 =================================');
    console.log('📱 Telegram Mini App запускается...');
    console.log('🚀 =================================');
    console.log('🌐 URL:', window.location.href);
    console.log('🔗 API URL:', import.meta.env.VITE_API_URL || '❌ НЕ УСТАНОВЛЕН');
    console.log('🖥️  User Agent:', navigator.userAgent);
    
    try {
      // Инициализируем Telegram SDK
      console.log('🔧 Инициализация Telegram SDK...');
      const tg = initTelegramApp();
      
      if (tg) {
        console.log('📱 Telegram SDK: ✅ Загружен');
        console.log('✅ Telegram SDK инициализирован успешно');
      } else {
        console.log('📱 Telegram SDK: ⚠️  Недоступен (браузер)');
      }
      
      // Проверяем окружение
      const inTelegram = isRunningInTelegram();
      console.log('📱 Running in Telegram:', inTelegram);
      console.log('📱 Запущено в Telegram:', inTelegram ? 'ДА' : 'НЕТ');
      
      console.log('✅ App готов к работе!');
      setIsReady(true);
      
    } catch (err) {
      console.error('❌ Ошибка инициализации:', err);
      // Даже при ошибке показываем приложение
      setIsReady(true);
    }
    
    console.log('🚀 =================================');
  }, []);

  // Показываем loader пока не готово
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

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/favorites" element={<Favorites />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
