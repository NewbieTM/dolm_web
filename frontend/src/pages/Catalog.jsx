import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import CategoryFilter from '../components/CategoryFilter';
import SearchBar from '../components/SearchBar';
import BottomNav from '../components/BottomNav';
import ContactButton from '../components/ContactButton';
import { getProducts, getCategories, addToFavorites, removeFromFavorites, getFavorites } from '../utils/api';
import { getUserId } from '../utils/telegram';

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
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
      console.log('🔄 Loading data...');
      setLoading(true);
      
      const [categoriesRes, favoritesRes, productsRes] = await Promise.all([
        getCategories().catch(() => ({ success: false, data: [] })),
        getFavorites(userId).catch(() => ({ success: false, data: [] })),
        getProducts({ sort: 'new' }).catch(() => ({ success: false, data: [] }))
      ]);

      if (categoriesRes.success) setCategories(categoriesRes.data);
      if (favoritesRes.success) setFavorites(favoritesRes.data.map(p => p.id));
      if (productsRes.success) setProducts(productsRes.data);
      
      console.log('✅ Data loaded:', productsRes.data?.length || 0, 'products');
    } catch (error) {
      console.error('❌ Error:', error);
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
      if (response.success) setProducts(response.data);
    } catch (error) {
      console.error('❌ Error loading products:', error);
    }
  };

  const handleCategoryChange = (category) => setActiveCategory(category);
  const handleSearch = (query) => setSearchQuery(query);
  
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
      console.error('❌ Favorite error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Загрузка...</p>
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
