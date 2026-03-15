import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import BottomNav from '../components/BottomNav';
import ContactButton from '../components/ContactButton';
import { getProducts, getCategories, addToFavorites, removeFromFavorites, getFavorites } from '../utils/api';
import { getUserId, vibrate } from '../utils/telegram';

// Метаданные категорий: эмодзи и подпись
const CATEGORY_META = {
  'Худи':      { emoji: '🥷🏼', desc: 'Erd, Vetements, Balenciaga, Dior...' },
  'Футболки':  { emoji: '👕', desc: 'Erd, Balenciaga, Vetements, Dior, Louis Vuitton, YSL...' },
  'Обувь':     { emoji: '👟', desc: 'Balenciaga, Nike...' },
  'Сумки':     { emoji: '👜', desc: 'Hermes Birkin, Louis Vuitton, Chanel, Prada, Balenciaga...' },
  'Косметика': { emoji: '💄', desc: 'Rhode, Huda Beauty, Summer Fridays, Dior...' },
};
const DEFAULT_META = { emoji: '🛍️', desc: '' };

// Сортировка: в наличии первыми, на заказ последними
function sortInStockFirst(products) {
  return [...products].sort((a, b) => {
    const aOrder = a.isPreorder ? 1 : 0;
    const bOrder = b.isPreorder ? 1 : 0;
    return aOrder - bOrder;
  });
}

// ── Карточка категории ────────────────────────────────────────────────────────
const CategoryCard = ({ name, emoji, desc, stats, onClick }) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className="relative bg-dark-card rounded-2xl overflow-hidden text-left
                 hover:scale-[1.02] active:scale-[0.97] transition-transform duration-200"
      style={{ aspectRatio: '1 / 1' }}
    >
      {/* Фото-фон */}
      {stats.coverPhoto ? (
        <>
          {!imgLoaded && <div className="absolute inset-0 skeleton" />}
          <img
            src={stats.coverPhoto}
            alt={name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-dark-hover to-dark-card flex items-center justify-center">
          <span className="text-6xl opacity-20">{emoji}</span>
        </div>
      )}

      {/* Текст */}
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg leading-tight truncate">{name}</p>
            {desc ? <p className="text-white/95 text-xs mt-0.5 leading-tight drop-shadow-md">{desc}</p> : null}
          </div>
          <span className="text-2xl ml-2 flex-shrink-0">{emoji}</span>
        </div>

        {/* Бейджи */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {stats.inStock > 0 && (
            <span className="text-xs px-2 py-0.5 bg-white/15 backdrop-blur-sm rounded-full text-white font-medium">
              {stats.inStock} в наличии
            </span>
          )}
          {stats.preorder > 0 && (
            <span className="text-xs px-2 py-0.5 bg-orange-500/40 backdrop-blur-sm rounded-full text-orange-200 font-medium">
              {stats.preorder} на заказ
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

// ── Главный компонент ─────────────────────────────────────────────────────────
const Catalog = ({ navigate }) => {
  const [allProducts, setAllProducts]           = useState([]);
  const [categories, setCategories]             = useState([]);
  const [favorites, setFavorites]               = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery]           = useState('');
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);
  const userId = getUserId();

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [catRes, favRes, prodRes] = await Promise.all([
        getCategories().catch(() => ({ success: false, data: [] })),
        getFavorites(userId).catch(() => ({ success: false, data: [] })),
        getProducts({ sort: 'new' }).catch(() => ({ success: false, data: [] })),
      ]);

      if (catRes.success)  setCategories(catRes.data);
      if (favRes.success)  setFavorites(favRes.data.map(p => p.id));
      if (prodRes.success) setAllProducts(prodRes.data);
      else                 setError('Не удалось загрузить товары');
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (productId) => {
    try {
      if (favorites.includes(productId)) {
        await removeFromFavorites(userId, productId);
        setFavorites(prev => prev.filter(id => id !== productId));
      } else {
        await addToFavorites(userId, productId);
        setFavorites(prev => [...prev, productId]);
      }
    } catch (err) {}
  };

  const handleSelectCategory = (cat) => { vibrate('light'); setSelectedCategory(cat); setSearchQuery(''); };
  const handleBack = () => { vibrate('light'); setSelectedCategory(null); setSearchQuery(''); };

  // Вычисляем список товаров для отображения
  const displayedProducts = (() => {
    let list = allProducts;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
      return sortInStockFirst(list);
    }

    if (selectedCategory) {
      list = list.filter(p => p.category === selectedCategory);
    }

    return sortInStockFirst(list);
  })();

  // Статистика для карточек
  const categoryStats = categories.reduce((acc, cat) => {
    const catProds = allProducts.filter(p => p.category === cat);
    acc[cat] = {
      total:      catProds.length,
      inStock:    catProds.filter(p => !p.isPreorder).length,
      preorder:   catProds.filter(p => p.isPreorder).length,
      coverPhoto: catProds.find(p => p.photos?.[0])?.photos?.[0] || null,
    };
    return acc;
  }, {});

  const isSearchMode = !!searchQuery;
  const showProductList = !!selectedCategory || isSearchMode;

  // Ошибка
  if (error) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-red-900/20 border border-red-500 rounded-2xl p-6 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-red-500 mb-2">Ошибка</h2>
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button onClick={loadInitialData} className="w-full bg-accent text-white font-semibold py-3 rounded-xl">
          Попробовать снова
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-bg pb-20">

      {/* Шапка */}
      <header className="sticky top-0 z-20 bg-dark-bg/95 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            {showProductList && !isSearchMode && (
              <button
                onClick={handleBack}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-dark-card hover:bg-dark-hover transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-2xl font-bold text-white">
              {selectedCategory && !isSearchMode ? selectedCategory : 'Каталог'}
            </h1>
          </div>
          <SearchBar onSearch={setSearchQuery} />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-4">

        {/* Скелетон загрузки */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl skeleton" style={{ aspectRatio: '1/1' }} />
            ))}
          </div>

        /* Режим поиска или выбранная категория */
        ) : showProductList ? (
          <>
            <p className="text-gray-500 text-sm mb-3">
              {displayedProducts.length} {['товар','товара','товаров'][
                displayedProducts.length % 10 === 1 && displayedProducts.length % 100 !== 11 ? 0
                  : displayedProducts.length % 10 >= 2 && displayedProducts.length % 10 <= 4 && (displayedProducts.length % 100 < 10 || displayedProducts.length % 100 >= 20) ? 1
                  : 2
              ]}
              {isSearchMode && ` по запросу «${searchQuery}»`}
            </p>

            {displayedProducts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-white mb-2">Ничего не найдено</h3>
                <p className="text-gray-400 text-sm">Попробуйте другой запрос</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {displayedProducts.map(product => (
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
          </>

        /* Главная — сетка категорий */
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-white mb-2">Пока пусто</h3>
            <p className="text-gray-400">Товары скоро появятся</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {categories.map(cat => {
              const meta  = CATEGORY_META[cat] || DEFAULT_META;
              const stats = categoryStats[cat] || { total: 0, inStock: 0, preorder: 0, coverPhoto: null };
              return (
                <CategoryCard
                  key={cat}
                  name={cat}
                  emoji={meta.emoji}
                  desc={meta.desc}
                  stats={stats}
                  onClick={() => handleSelectCategory(cat)}
                />
              );
            })}
          </div>
        )}
      </div>

      <BottomNav currentPage="catalog" onNavigate={navigate} />
      <ContactButton />
    </div>
  );
};

export default Catalog;
