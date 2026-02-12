import React, { useState, useEffect, useCallback } from 'react';
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

  // Загрузка данных при монтировании
  useEffect(() => {
    console.log('Catalog mounted, userId:', userId);
    loadInitialData();
  }, []);

  // Загрузка товаров при изменении фильтров
  useEffect(() => {
    if (!loading) { // Не загружаем снова если идёт начальная загрузка
      loadProducts();
    }
  }, [activeCategory, searchQuery]);

  const loadInitialData = async () => {
    try {
      console.log('Loading initial data...');
      // Загружаем всё параллельно
      const [categoriesRes, favoritesRes, productsRes] = await Promise.all([
        getCategories(),
        getFavorites(userId),
        getProducts({ sort: 'new' })
      ]);

      console.log('Categories loaded:', categoriesRes);
      console.log('Favorites loaded:', favoritesRes);
      console.log('Products loaded:', productsRes);

      if (categoriesRes.success) {
        setCategories(categoriesRes.data);
      }

      if (favoritesRes.success) {
        // Сохраняем только ID товаров
        const favoriteIds = favoritesRes.data.map(product => product.id);
        console.log('Favorite IDs:', favoriteIds);
        setFavorites(favoriteIds);
      }

      if (productsRes.success) {
        setProducts(productsRes.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки начальных данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      console.log('Loading products with filters:', { activeCategory, searchQuery });
      const response = await getProducts({
        category: activeCategory,
        search: searchQuery,
        sort: 'new'
      });

      if (response.success) {
        console.log('Products loaded:', response.data.length);
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
    }
  };

  const handleCategoryChange = (category) => {
    console.log('Category changed:', category);
    setActiveCategory(category);
  };

  const handleSearch = useCallback((query) => {
    console.log('Search query:', query);
    setSearchQuery(query);
  }, []);

  const handleToggleFavorite = async (productId) => {
    console.log('Toggle favorite:', productId, 'Current favorites:', favorites);
    
    try {
      const isFav = favorites.includes(productId);
      
      if (isFav) {
        console.log('Removing from favorites...');
        const response = await removeFromFavorites(userId, productId);
        console.log('Remove response:', response);
        
        if (response.success) {
          setFavorites(favorites.filter(id => id !== productId));
        }
      } else {
        console.log('Adding to favorites...');
        const response = await addToFavorites(userId, productId);
        console.log('Add response:', response);
        
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

      {/* Кнопка связи с менеджером */}
      <ContactButton />

      {/* Нижнее меню */}
      <BottomNav />
    </div>
  );
};

export default Catalog;
