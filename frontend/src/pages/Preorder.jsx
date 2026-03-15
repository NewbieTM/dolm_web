import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import BottomNav from '../components/BottomNav';
import ContactButton from '../components/ContactButton';
import { getProducts, addToFavorites, removeFromFavorites, getFavorites } from '../utils/api';
import { getUserId } from '../utils/telegram';

const Preorder = ({ navigate }) => {
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, favoritesRes] = await Promise.all([
        getProducts({ isPreorder: true, sort: 'new' }).catch(() => ({ success: false, data: [] })),
        getFavorites(userId).catch(() => ({ success: false, data: [] }))
      ]);

      if (productsRes.success) {
        // Дополнительная фильтрация на фронте для надёжности
        setProducts(productsRes.data.filter(p => p.isPreorder));
      }

      if (favoritesRes.success) {
        setFavorites(favoritesRes.data.map(p => p.id));
      }
    } catch (error) {
      console.error('❌ Error loading preorder:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (productId) => {
    try {
      const isFav = favorites.includes(productId);
      if (isFav) {
        await removeFromFavorites(userId, productId);
        setFavorites(favorites.filter(id => id !== productId));
      } else {
        await addToFavorites(userId, productId);
        setFavorites([...favorites, productId]);
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg pb-20">

      {/* Заголовок */}
      <header className="sticky top-0 z-20 bg-dark-bg/95 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white">На заказ</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-4">

        {/* Информационный баннер */}
        <div className="mb-5 rounded-2xl overflow-hidden bg-gradient-to-r from-orange-500/20 to-amber-500/10 border border-orange-500/30">
          <div className="px-5 py-4 flex items-start gap-3">
            <div className="text-2xl flex-shrink-0 mt-0.5">🚚</div>
            <div>
              <p className="text-orange-300 font-semibold text-base mb-1">
                Привезём за 7–15 дней
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                Эти товары доступны под заказ. Мы доставим любой из них — или любой другой товар по вашему запросу. Свяжитесь с менеджером для оформления.
              </p>
            </div>
          </div>
        </div>

        {/* Список товаров */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(6)].map((_, i) => (
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Нет товаров на заказ
            </h3>
            <p className="text-gray-400 text-sm px-8">
              Товары под заказ появятся здесь. Вы также можете написать менеджеру с любым запросом.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={favorites.includes(product.id)}
                onToggleFavorite={handleToggleFavorite}
                onNavigate={navigate}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav currentPage="preorder" onNavigate={navigate} />
      <ContactButton />
    </div>
  );
};

export default Preorder;
