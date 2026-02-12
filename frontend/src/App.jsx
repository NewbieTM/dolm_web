import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Favorites from './pages/Favorites';
import { initTelegramApp } from './utils/telegram';
import './index.css';

function App() {
  useEffect(() => {
    // Инициализация Telegram Web App
    initTelegramApp();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/favorites" element={<Favorites />} />
        {/* ✅ УБРАНО: Маршрут истории */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
