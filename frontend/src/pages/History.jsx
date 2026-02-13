import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import BottomNav from '../components/BottomNav';
import { getHistory, addToFavorites, removeFromFavorites, getFavorites } from '../utils/api';
import { getUserId, vibrate } from '../utils/telegram';

const History = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [historyRes, favoritesRes] = await Promise.all([
        getHistory(userId),
        getFavorites(userId)
      ]);

      if (historyRes.success) {
        setProducts(historyRes.data);
      }

      if (favoritesRes.success) {
        const favoriteIds = favoritesRes.data.map(product => product.id);
        setFavorites(favoriteIds);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (productId) => {
    vibrate('light');
    
    try {
      const isFav = favorites.includes(productId);
      
      if (isFav) {
        const response = await removeFromFavorites(userId, productId);
        if (response.success) {
          setFavorites(favorites.filter(id => id !== productId));
        }
      } else {
        const response = await addToFavorites(userId, productId);
        if (response.success) {
          setFavorites([...favorites, productId]);
        }
      }
    } catch (error) {
      console.error('Ошибка с избранным:', error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Заголовок */}
      <header className="sticky top-0 z-20 bg-dark-bg/95 backdrop-blur-lg border-b border-gray-800">
        {/* Ограничиваем ширину на больших экранах */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white">История просмотров</h1>
        </div>
      </header>

      {/* Контент с ограничением ширины */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        {loading ? (
          /* Адаптивная сетка скелетонов */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-dark-card rounded-2xl overflow-hidden">
                <div className="aspect-square skeleton" />
                <div className="p-4 space-y-2">
                  <div className="h-4 skeleton rounded" />
                  <div className="h-6 skeleton rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-4 text-gray-600">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              История пуста
            </h3>
            <p className="text-gray-400">
              Просмотренные товары появятся здесь
            </p>
          </div>
        ) : (
          /* Адаптивная сетка:
             - Мобильные: 2 колонки
             - Планшеты (md): 3 колонки
             - Ноутбуки (lg): 4 колонки
             - Десктопы (xl): 5 колонок
          */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={favorites.includes(product.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      {/* Нижнее меню */}
      <BottomNav />
    </div>
  );
};

export default History;
