import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Favorites from './pages/Favorites';
import { initTelegramApp } from './utils/telegram';
import './index.css';

function App() {
  useEffect(() => {
    // Инициализация Telegram Web App
    initTelegramApp();
    
    // Логирование для отладки
    console.log('App mounted');
    console.log('Current URL:', window.location.href);
  }, []);

  return (
    // ✅ КРИТИЧНО: HashRouter вместо BrowserRouter для Telegram Mini Apps!
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
