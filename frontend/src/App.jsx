import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initTelegramApp } from './utils/telegram';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Favorites from './pages/Favorites';
import History from './pages/History';

function App() {
  // КРИТИЧЕСКИ ВАЖНО: Инициализация Telegram WebApp при загрузке приложения
  useEffect(() => {
    console.log('🚀 Запуск приложения...');
    
    try {
      const tg = initTelegramApp();
      console.log('✅ Telegram WebApp инициализирован:', tg);
      console.log('Платформа:', tg?.platform || 'unknown');
      console.log('User ID:', tg?.initDataUnsafe?.user?.id || 'test');
    } catch (error) {
      console.error('❌ Ошибка инициализации Telegram WebApp:', error);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
