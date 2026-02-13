import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Favorites from './pages/Favorites';
import { initTelegramApp, isRunningInTelegram } from './utils/telegram';
import './index.css';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    console.log('🚀 =================================');
    console.log('📱 Telegram Mini App запускается...');
    console.log('🚀 =================================');
    
    // Собираем отладочную информацию
    const debug = {
      url: window.location.href,
      telegramAvailable: !!window.Telegram?.WebApp,
      apiUrl: import.meta.env.VITE_API_URL || 'НЕ НАСТРОЕН!',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    console.log('🌐 URL:', debug.url);
    console.log('📦 Telegram SDK:', debug.telegramAvailable ? '✅ Загружен' : '❌ НЕ загружен');
    console.log('🔗 API URL:', debug.apiUrl);
    console.log('🖥️  User Agent:', debug.userAgent);
    
    setDebugInfo(debug);
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: API URL
    if (!import.meta.env.VITE_API_URL) {
      const errorMsg = '❌ VITE_API_URL не настроен! Создайте frontend/.env файл!';
      console.error(errorMsg);
      setError(errorMsg);
      // Показываем приложение, но с ошибкой
      setIsReady(true);
      return;
    }
    
    try {
      // Инициализируем Telegram WebApp
      console.log('🔧 Инициализация Telegram SDK...');
      const tg = initTelegramApp();
      
      if (tg) {
        console.log('✅ Telegram SDK инициализирован успешно');
      } else {
        console.log('⚠️  Telegram SDK недоступен (работаем в браузере)');
      }
      
      // Проверяем запуск в Telegram
      const inTelegram = isRunningInTelegram();
      console.log('📱 Запущено в Telegram:', inTelegram ? 'ДА' : 'НЕТ');
      
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

  // Показываем экран ошибки если критическая проблема
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
              <li>Создайте файл <code className="bg-black/50 px-1 rounded">frontend/.env</code></li>
              <li>Добавьте строку: <code className="bg-black/50 px-1 rounded">VITE_API_URL=http://localhost:3000</code></li>
              <li>Перезапустите dev сервер</li>
            </ol>
          </div>
          
          <details className="mt-4">
            <summary className="text-gray-400 text-xs cursor-pointer hover:text-white">
              Отладочная информация
            </summary>
            <pre className="text-xs text-gray-500 mt-2 bg-black/30 p-2 rounded overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
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
