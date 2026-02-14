import { useState, useEffect } from 'react';
import { getUserId } from '../utils/telegram';
import { getFavorites, removeFromFavorites } from '../utils/api';

// Fallback компоненты
let ProductCard, BottomNav, ContactButton;

try {
  ProductCard = require('../components/ProductCard').default;
} catch (err) {
  ProductCard = ({ product, isFavorite, onToggleFavorite }) => (
    <div className="bg-dark-card rounded-2xl overflow-hidden cursor-pointer" onClick={() => window.location.hash = `/product/${product.id}`}>
      <div className="aspect-square bg-gray-800">
        {product.photos?.[0] && <img src={product.photos[0]} alt={product.name} className="w-full h-full object-cover" />}
      </div>
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm mb-2">{product.name}</h3>
        <div className="flex justify-between items-center">
          <span className="text-blue-400 font-bold">{product.price?.toLocaleString('ru-RU')} ₽</span>
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(product.id); }} className="text-xl">❤️</button>
        </div>
      </div>
    </div>
  );
}

try {
  BottomNav = require('../components/BottomNav').default;
} catch (err) {
  BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-3 flex justify-around z-50">
      <button onClick={() => window.location.hash = '/'} className="text-center">
        <div className="text-2xl">🏠</div>
        <div className="text-xs text-gray-400">Каталог</div>
      </button>
      <button onClick={() => window.location.hash = '/favorites'} className="text-center">
        <div className="text-2xl">❤️</div>
        <div className="text-xs text-gray-400">Избранное</div>
      </button>
    </div>
  );
}

try {
  ContactButton = require('../components/ContactButton').default;
} catch (err) {
  ContactButton = () => null;
}

const Favorites = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  useEffect(() => {
    console.log('⭐ Favorites page mounted, userId:', userId);
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      console.log('🔄 Загрузка избранного...');
      const response = await getFavorites(userId);
      console.log('✅ Ответ:', response);
      
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки избранного:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (productId) => {
    console.log('🗑️ Удаление из избранного:', productId);
    
    try {
      const response = await removeFromFavorites(userId, productId);
      console.log('✅ Ответ:', response);
      
      if (response.success) {
        setProducts(products.filter(p => p.id !== productId));
      }
    } catch (error) {
      console.error('❌ Ошибка удаления:', error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      <header className="sticky top-0 z-20 bg-dark-bg/95 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white">Избранное</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="px-4 pt-4">
          {loading ? (
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
              <div className="text-6xl mb-4">💔</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Избранное пусто
              </h3>
              <p className="text-gray-400">
                Добавляйте товары в избранное, нажимая на ❤️
              </p>
            </div>
          ) : (
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
      </div>

      <ContactButton />
      <BottomNav />
    </div>
  );
};

export default Favorites;
