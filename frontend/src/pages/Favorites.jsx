import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import BottomNav from '../components/BottomNav';
import ContactButton from '../components/ContactButton';
import { getFavorites, getProductsByIds, removeFromFavorites, addToFavorites } from '../utils/api';
import { getUserId } from '../utils/telegram';

const Favorites = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const userId = getUserId();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const favoritesResponse = await getFavorites(userId);
      
      if (favoritesResponse.success && favoritesResponse.data.length > 0) {
        const productsResponse = await getProductsByIds(favoritesResponse.data);
        
        if (productsResponse.success) {
          setProducts(productsResponse.data);
          setFavorites(favoritesResponse.data);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки избранного:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (productId) => {
    try {
      await removeFromFavorites(userId, productId);
      setProducts(products.filter(p => p.id !== productId));
      setFavorites(favorites.filter(id => id !== productId));
    } catch (error) {
      console.error('Ошибка удаления из избранного:', error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Заголовок */}
      <header className="sticky top-0 z-20 bg-dark-bg/95 backdrop-blur-lg border-b border-gray-800">
        <div className="px-4 py-4 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Избранное</h1>
          {!loading && products.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              {products.length} {products.length === 1 ? 'товар' : products.length < 5 ? 'товара' : 'товаров'}
            </p>
          )}
        </div>
      </header>

      {/* Контент */}
      <div className="px-4 pt-4 max-w-7xl mx-auto">
        {loading ? (
          /* Адаптивная загрузка:
             - Мобильные: 2 колонки
             - Планшеты (md): 3 колонки
             - Ноутбуки (lg): 4 колонки
             - Десктопы (xl): 5 колонок
          */
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Избранное пусто
            </h3>
            <p className="text-gray-400">
              Добавляйте товары в избранное, нажимая на ❤️
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
                isFavorite={true}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      {/* Кнопка связи с менеджером */}
      <ContactButton />

      {/* Нижнее меню */}
      <BottomNav />
    </div>
  );
};

export default Favorites;
