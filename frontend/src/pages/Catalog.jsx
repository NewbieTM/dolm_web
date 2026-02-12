import React, { useState, useEffect, useCallback } from 'react';
import ProductCard from '../components/ProductCard';
import CategoryFilter from '../components/CategoryFilter';
import SearchBar from '../components/SearchBar';
import BottomNav from '../components/BottomNav';
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

  // ✅ ИСПРАВЛЕНО: Загрузка избранного при инициализации
  useEffect(() => {
    loadInitialData();
  }, []);

  // Загрузка товаров при изменении фильтров
  useEffect(() => {
    loadProducts();
  }, [activeCategory, searchQuery]);

  const loadInitialData = async () => {
    try {
      // Загружаем категории и избранное одновременно
      await Promise.all([
        loadCategories(),
        loadFavorites()
      ]);
    } catch (error) {
      console.error('Ошибка загрузки начальных данных:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await getCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    }
  };

  // ✅ ИСПРАВЛЕНО: Новая функция для загрузки избранного
  const loadFavorites = async () => {
    try {
      const response = await getFavorites(userId);
      if (response.success) {
        // Сохраняем только ID товаров
        const favoriteIds = response.data.map(product => product.id);
        setFavorites(favoriteIds);
      }
    } catch (error) {
      console.error('Ошибка загрузки избранного:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await getProducts({
        category: activeCategory,
        search: searchQuery,
        sort: 'new'
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

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

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
          <h1 className="text-2xl font-bold text-white mb-4">Каталог</h1>
          <SearchBar onSearch={handleSearch} />
        </div>
      </header>

      {/* Фильтр категорий */}
      <div className="px-4 pt-4">
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* Товары */}
      <div className="px-4 pt-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
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
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Товары не найдены
            </h3>
            <p className="text-gray-400">
              Попробуйте изменить фильтры или поисковый запрос
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

export default Catalog;
