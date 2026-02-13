import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../utils/api';
import { getUserId } from '../utils/telegram';

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = getUserId();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('==========================================');
    console.log('📱 Catalog MOUNTED!');
    console.log('🆔 User ID:', userId);
    console.log('==========================================');
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      console.log('🔄 Fetching products...');
      setLoading(true);
      setError(null);
      
      const response = await getProducts({ sort: 'new' });
      console.log('📦 API Response:', response);
      
      if (response && response.success) {
        setProducts(response.data || []);
        console.log('✅ Products loaded:', response.data?.length || 0);
      } else {
        console.error('❌ API returned success: false');
        setError('Не удалось загрузить товары');
      }
    } catch (err) {
      console.error('❌ FATAL ERROR loading products:', err);
      console.error('Error details:', err.message);
      console.error('Error stack:', err.stack);
      setError(`Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
      console.log('✅ Loading complete');
    }
  };

  console.log('🔄 Catalog RENDER - loading:', loading, 'products:', products.length, 'error:', error);

  // Ошибка
  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-900/20 border border-red-500 rounded-2xl p-6 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-500 mb-2">Ошибка</h2>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={loadProducts}
            className="w-full bg-accent text-white font-semibold py-3 rounded-xl"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Загрузка
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Загрузка товаров...</p>
        </div>
      </div>
    );
  }

  // Пусто
  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-white mb-2">Товаров нет</h3>
          <p className="text-gray-400">Скоро здесь появятся товары</p>
        </div>
      </div>
    );
  }

  // Каталог
  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Заголовок */}
      <header className="sticky top-0 z-20 bg-dark-bg border-b border-gray-800 p-4">
        <h1 className="text-2xl font-bold text-white">Каталог</h1>
        <p className="text-sm text-gray-400 mt-1">Товаров: {products.length}</p>
      </header>

      {/* Товары */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => {
                console.log('🔗 Opening product:', product.id);
                navigate(`/product/${product.id}`);
              }}
              className="bg-dark-card rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform"
            >
              {/* Фото */}
              <div className="aspect-square bg-gray-800 relative">
                {product.photos && product.photos[0] ? (
                  <img
                    src={product.photos[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <span className="text-4xl">📷</span>
                  </div>
                )}
              </div>

              {/* Инфо */}
              <div className="p-4">
                <h3 className="text-white font-semibold text-base mb-2 line-clamp-2">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-accent text-lg font-bold">
                    {product.price?.toLocaleString('ru-RU')} ₽
                  </span>
                  {product.views > 0 && (
                    <span className="text-gray-400 text-sm">
                      👁 {product.views}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debug info */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2 font-mono">
        <div>📱 Catalog Running | Products: {products.length} | User: {userId}</div>
      </div>
    </div>
  );
};

export default Catalog;
