import { useState, useEffect } from 'react';
import { getUserId } from '../utils/telegram';
import { getProducts, getCategories, addToFavorites, removeFromFavorites, getFavorites } from '../utils/api';

// Безопасная загрузка компонентов с fallback
let ProductCard, CategoryFilter, SearchBar, BottomNav, ContactButton;

try {
  ProductCard = require('../components/ProductCard').default;
} catch (err) {
  console.error('❌ ProductCard не загружен:', err);
  // Fallback ProductCard
  ProductCard = ({ product, isFavorite, onToggleFavorite }) => (
    <div className="bg-dark-card rounded-2xl overflow-hidden cursor-pointer" onClick={() => window.location.hash = `/product/${product.id}`}>
      <div className="aspect-square bg-gray-800">
        {product.photos?.[0] && <img src={product.photos[0]} alt={product.name} className="w-full h-full object-cover" />}
      </div>
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">{product.name}</h3>
        <div className="flex justify-between items-center">
          <span className="text-blue-400 font-bold">{product.price?.toLocaleString('ru-RU')} ₽</span>
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(product.id); }} className="text-xl">
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
      </div>
    </div>
  );
}

try {
  CategoryFilter = require('../components/CategoryFilter').default;
} catch (err) {
  console.error('❌ CategoryFilter не загружен:', err);
  CategoryFilter = ({ categories, activeCategory, onCategoryChange }) => (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button onClick={() => onCategoryChange?.(null)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${!activeCategory ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'}`}>
        Все
      </button>
      {categories?.map((cat) => (
        <button key={cat} onClick={() => onCategoryChange?.(cat)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${activeCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'}`}>
          {cat}
        </button>
      ))}
    </div>
  );
}

try {
  SearchBar = require('../components/SearchBar').default;
} catch (err) {
  console.error('❌ SearchBar не загружен:', err);
  SearchBar = ({ onSearch }) => (
    <input type="text" placeholder="Поиск..." className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl" onChange={(e) => onSearch?.(e.target.value)} />
  );
}

try {
  BottomNav = require('../components/BottomNav').default;
} catch (err) {
  console.error('❌ BottomNav не загружен:', err);
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
  console.error('❌ ContactButton не загружен:', err);
  ContactButton = () => null; // Просто скрываем если не загрузился
}

console.log('✅ Catalog.jsx: Все компоненты подготовлены');

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const userId = getUserId();

  useEffect(() => {
    console.log('==========================================');
    console.log('📱 Catalog MOUNTED!');
    console.log('🆔 User ID:', userId);
    console.log('==========================================');
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadProducts();
    }
  }, [activeCategory, searchQuery]);

  const loadInitialData = async () => {
    try {
      console.log('🔄 Загрузка начальных данных...');
      setLoading(true);
      setError(null);
      
      console.log('📂 Загрузка категорий...');
      const categoriesRes = await getCategories().catch(err => {
        console.error('Ошибка категорий:', err);
        return { success: false, data: [] };
      });
      console.log('✅ Категории:', categoriesRes);
      
      console.log('⭐ Загрузка избранного...');
      const favoritesRes = await getFavorites(userId).catch(err => {
        console.error('Ошибка избранного:', err);
        return { success: false, data: [] };
      });
      console.log('✅ Избранное:', favoritesRes);
      
      console.log('📦 Загрузка товаров...');
      const productsRes = await getProducts({ sort: 'new' }).catch(err => {
        console.error('Ошибка товаров:', err);
        return { success: false, data: [] };
      });
      console.log('✅ Товары:', productsRes);

      if (categoriesRes.success) {
        setCategories(categoriesRes.data);
      }

      if (favoritesRes.success) {
        const favoriteIds = favoritesRes.data.map(p => p.id);
        setFavorites(favoriteIds);
      }

      if (productsRes.success) {
        setProducts(productsRes.data);
        console.log('✅ Загружено товаров:', productsRes.data.length);
      } else {
        setError('Не удалось загрузить товары');
      }
    } catch (error) {
      console.error('❌ КРИТИЧЕСКАЯ ошибка:', error);
      setError('Ошибка: ' + error.message);
    } finally {
      setLoading(false);
      console.log('✅ Загрузка завершена');
    }
  };

  const loadProducts = async () => {
    try {
      const params = {
        sort: 'new',
        ...(activeCategory && { category: activeCategory }),
        ...(searchQuery && { search: searchQuery })
      };

      console.log('🔄 Загрузка товаров с фильтрами:', params);
      const response = await getProducts(params);

      if (response.success) {
        setProducts(response.data);
        console.log('✅ Обновлено товаров:', response.data.length);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки товаров:', error);
    }
  };

  const handleCategoryChange = (category) => {
    console.log('📂 Категория:', category);
    setActiveCategory(category);
  };

  const handleSearch = (query) => {
    console.log('🔍 Поиск:', query);
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
      console.error('❌ Ошибка избранного:', error);
    }
  };

  console.log('🔄 Рендер Catalog - loading:', loading, 'products:', products.length, 'error:', error);

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
            className="w-full bg-accent text-white font-semibold py-3 rounded-xl"
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
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
      <ContactButton />
    </div>
  );
};

export default Catalog;
