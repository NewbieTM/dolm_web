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

  useEffect(() => {
    console.log('📱 App mounting...');
    console.log('🌐 URL:', window.location.href);
    console.log('📦 Telegram available:', !!window.Telegram?.WebApp);
    
    try {
      // Инициализируем Telegram WebApp
      initTelegramApp();
      
      // Проверяем что всё работает
      console.log('✅ App инициализирован');
      console.log('📱 В Telegram:', isRunningInTelegram());
      
      setIsReady(true);
    } catch (err) {
      console.error('❌ Ошибка инициализации App:', err);
      setError(err.message);
      // Всё равно показываем приложение
      setIsReady(true);
    }
  }, []);

  // Показываем loader пока не готово
  if (!isReady) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Показываем ошибку если что-то пошло не так
  if (error) {
    console.error('⚠️  Приложение запущено с ошибками:', error);
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
