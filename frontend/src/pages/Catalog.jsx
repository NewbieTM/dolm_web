import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import CategoryFilter from '../components/CategoryFilter';
import SearchBar from '../components/SearchBar';
import BottomNav from '../components/BottomNav';
import ContactButton from '../components/ContactButton';
import { getProducts, getCategories, getFavorites, addToFavorites, removeFromFavorites } from '../utils/api';
import { getUserId } from '../utils/telegram';

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [activeCategory, searchQuery]);

  const loadInitialData = async () => {
    try {
      const [categoriesRes, favoritesRes] = await Promise.all([
        getCategories(),
        getFavorites(userId)
      ]);

      if (categoriesRes.success) {
        setCategories(categoriesRes.data);
      }

      if (favoritesRes.success) {
        setFavorites(favoritesRes.data.map(p => p.id));
      }
    } catch (error) {
      console.error('Ошибка загрузки начальных данных:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await getProducts({
        category: activeCategory,
        search: searchQuery
      });

      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
    } finally {
      setLoading(false);
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
      if (favorites.includes(productId)) {
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
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Товары не найдены
              </h3>
              <p className="text-gray-400">
                Попробуйте изменить фильтры или поисковый запрос
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

export default Catalog;
