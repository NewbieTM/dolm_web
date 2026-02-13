import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import BottomNav from '../components/BottomNav';
import { getHistory, addToFavorites, removeFromFavorites } from '../utils/api';
import { getUserId } from '../utils/telegram';

const History = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const userId = getUserId();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await getHistory(userId);
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (productId) => {
    try {
      if (favorites.includes(productId)) {
        await removeFromFavorites(userId, productId);
        setFavorites(favorites.filter(id => id !== productId));
      } else {
        await addToFavorites(userId, productId);
        setFavorites([...favorites, productId]);
      }
    } catch (error) {
      console.error('Ошибка с избранным:', error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Заголовок */}
      <header className="sticky top-0 z-20 bg-dark-bg/95 backdrop-blur-lg border-b border-gray-800">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-white">История просмотров</h1>
        </div>
      </header>

      {/* Товары */}
      <div className="px-4 pt-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
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
          <div className="grid grid-cols-2 gap-4">
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
