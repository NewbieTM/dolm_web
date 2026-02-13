import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Favorites from './pages/Favorites';
import { initTelegramApp } from './utils/telegram';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🚀 =================================');
    console.log('📱 Telegram Mini App запускается...');
    console.log('🚀 =================================');
    console.log('🌐 URL:', window.location.href);
    
    // Проверяем API URL
    const apiUrl = import.meta.env.VITE_API_URL;
    console.log('🔗 API URL:', apiUrl || '❌ НЕ УСТАНОВЛЕН');
    console.log('🖥️  User Agent:', navigator.userAgent);
    
    try {
      // Инициализируем Telegram
      console.log('🔧 Инициализация Telegram SDK...');
      const result = initTelegramApp();
      
      console.log('📱 Telegram SDK:', result.success ? '✅ Загружен' : '❌ Ошибка');
      
      if (result.success) {
        console.log('✅ Telegram SDK инициализирован успешно');
        console.log('📱 Running in Telegram:', result.isInTelegram);
        console.log('📱 Запущено в Telegram:', result.isInTelegram ? 'ДА' : 'НЕТ');
        
        // Дополнительная отладочная информация
        if (result.userData) {
          console.log('👤 User ID:', result.userData.id);
          console.log('👤 Username:', result.userData.username || 'N/A');
        }
      } else {
        console.warn('⚠️  Telegram SDK не загружен:', result.error);
      }
      
      console.log('✅ App готов к работе!');
      setIsReady(true);
      
    } catch (err) {
      console.error('❌ Ошибка инициализации:', err);
      setError(err.message);
      // Всё равно показываем приложение
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
          <p className="text-white text-lg font-medium">Загрузка Mini App...</p>
          <p className="text-gray-400 text-sm mt-2">Инициализация...</p>
        </div>
      </div>
    );
  }

  // Показываем экран ошибки если критическая проблема с API
  if (error && error.includes('VITE_API_URL')) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-900/20 border border-red-500 rounded-2xl p-6">
          <div className="text-center mb-4">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-500 mb-2">
              Ошибка конфигурации
            </h2>
          </div>
          
          <div className="bg-black/30 rounded-lg p-4 mb-4">
            <p className="text-red-400 text-sm font-mono">{error}</p>
          </div>
          
          <div className="text-gray-300 text-sm space-y-2">
            <p className="font-semibold">Как исправить:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Проверьте переменную окружения <code className="bg-black/50 px-1 rounded">VITE_API_URL</code></li>
              <li>Убедитесь что backend запущен и доступен</li>
              <li>Перезапустите приложение</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Показываем предупреждение если есть некритические ошибки
  const showWarning = error && !error.includes('VITE_API_URL');

  return (
    <HashRouter>
      {/* Предупреждение сверху, если есть */}
      {showWarning && (
        <div className="bg-yellow-900/20 border-b border-yellow-500/50 p-3">
          <div className="max-w-7xl mx-auto">
            <p className="text-yellow-400 text-sm">
              ⚠️ {error}
            </p>
          </div>
        </div>
      )}
      
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/favorites" element={<Favorites />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
