import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Favorites from './pages/Favorites';
import { initTelegramApp } from './utils/telegram';

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('📱 App запускается...');
    
    try {
      initTelegramApp();
      setIsReady(true);
      console.log('✅ App готов');
    } catch (err) {
      console.error('❌ Ошибка App:', err);
      setIsReady(true); // Показываем приложение даже при ошибке
    }
  }, []);

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
