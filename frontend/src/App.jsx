import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Favorites from './pages/Favorites';
import History from './pages/History';
import { initTelegramApp, getUserData, upsertUser } from './utils/telegram';
import { upsertUser as apiUpsertUser } from './utils/api';

function App() {
  useEffect(() => {
    // Инициализация Telegram WebApp
    const tg = initTelegramApp();

    // Регистрация пользователя
    const initUser = async () => {
      try {
        const userData = getUserData();
        await apiUpsertUser(userData.id.toString(), {
          username: userData.username,
          firstName: userData.first_name,
          lastName: userData.last_name,
          languageCode: userData.language_code
        });
      } catch (error) {
        console.error('Ошибка инициализации пользователя:', error);
      }
    };

    initUser();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Router>
  );
}

export default App;
