import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import CategoryFilter from '../components/CategoryFilter';
import SearchBar from '../components/SearchBar';
import BottomNav from '../components/BottomNav';
import ContactButton from '../components/ContactButton';
import { getProducts, getCategories, addToFavorites, removeFromFavorites, getFavorites } from '../utils/api';
import { getUserId } from '../utils/telegram';

const Catalog = ({ navigate }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const userId = getUserId();

  useEffect(() => {
    console.log('📱 Catalog mounted');
    console.log('🆔 User ID:', userId);
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadProducts();
    }
  }, [activeCategory, searchQuery]);

  const loadInitialData = async () => {
    try {
      console.log('🔄 Loading initial data...');
      setLoading(true);
      setError(null);
      
      const categoriesRes = await getCategories().catch(() => ({ success: false, data: [] }));
      const favoritesRes = await getFavorites(userId).catch(() => ({ success: false, data: [] }));
      const productsRes = await getProducts({ sort: 'new' }).catch(() => ({ success: false, data: [] }));

      if (categoriesRes.success) {
        setCategories(categoriesRes.data);
      }

      if (favoritesRes.success) {
        const favoriteIds = favoritesRes.data.map(p => p.id);
        setFavorites(favoriteIds);
      }

      if (productsRes.success) {
        setProducts(productsRes.data);
        console.log('✅ Products loaded:', productsRes.data.length);
      } else {
        setError('Не удалось загрузить товары');
      }
    } catch (error) {
      console.error('❌ Fatal error:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const params = {
        sort: 'new',
        ...(activeCategory && { category: activeCategory }),
        ...(searchQuery && { search: searchQuery })
      };

      const response = await getProducts(params);

      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('❌ Error loading products:', error);
    }
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
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
      console.error('❌ Favorite toggle error:', error);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-900/20 border border-red-500 rounded-2xl p-6">
          <div className="text-center mb-4">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-500 mb-2">Ошибка</h2>
          </div>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={loadInitialData}
            className="w-full bg-accent text-white font-semibold py-3 rounded-xl hover:bg-accent/80 transition"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      <header className="sticky top-0 z-20 bg-dark-bg/95 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white mb-4">Каталог</h1>
          <SearchBar onSearch={handleSearch} />
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="px-4 pt-4">
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
          />
        </div>

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
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-white mb-2">Товаров нет</h3>
              <p className="text-gray-400">Скоро здесь появятся товары</p>
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
      </div>

      <BottomNav currentPage="catalog" onNavigate={navigate} />
      <ContactButton />
    </div>
  );
};

export default Catalog;
