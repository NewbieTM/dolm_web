import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, viewProduct, getFavorites, addToFavorites, removeFromFavorites } from '../utils/api';
import { getUserId, vibrate, showBackButton, hideBackButton } from '../utils/telegram';

// Fallback ContactButton
let ContactButton;
try {
  ContactButton = require('../components/ContactButton').default;
} catch (err) {
  console.error('❌ ContactButton не загружен');
  ContactButton = ({ productName, productPrice }) => (
    <a
      href={`https://t.me/${process.env.MANAGER_USERNAME || 'manager'}?text=Здравствуйте! Интересует: ${productName} (${productPrice} ₽)`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-600 z-40"
    >
      💬 Написать
    </a>
  );
}

const Product = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const userId = getUserId();

  useEffect(() => {
    console.log('📄 Product page mounted, ID:', id);
    loadProduct();
    
    showBackButton(() => {
      navigate(-1);
    });

    return () => {
      hideBackButton();
    };
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      console.log('🔄 Загрузка товара:', id);
      const productResponse = await getProduct(id);
      console.log('✅ Ответ:', productResponse);
      
      if (productResponse.success) {
        setProduct(productResponse.data);
        await viewProduct(id);
        
        const favoritesResponse = await getFavorites(userId);
        
        if (favoritesResponse.success) {
          setIsFavorite(favoritesResponse.data.some(p => p.id === id));
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки товара:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteClick = async () => {
    vibrate('light');
    
    try {
      if (isFavorite) {
        const response = await removeFromFavorites(userId, id);
        if (response.success) {
          setIsFavorite(false);
        }
      } else {
        const response = await addToFavorites(userId, id);
        if (response.success) {
          setIsFavorite(true);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка избранного:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white text-xl">Товар не найден</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg pb-24">
      <div className="max-w-5xl mx-auto">
        
        {/* Фото */}
        <div className="relative">
          <div className="relative w-full aspect-square bg-dark-card overflow-hidden">
            <img
              src={product.photos[currentImageIndex]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            
            {/* Кнопка избранного */}
            <button
              onClick={handleFavoriteClick}
              className="absolute top-4 right-4 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <span className="text-2xl">{isFavorite ? '❤️' : '🤍'}</span>
            </button>

            {/* Индикаторы фото */}
            {product.photos.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {product.photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      currentImageIndex === index ? 'w-8 bg-white' : 'w-2 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Информация */}
        <div className="p-6">
          {/* Категория */}
          <div className="mb-3">
            <span className="inline-block px-3 py-1 bg-dark-card rounded-full text-sm text-gray-400">
              {product.category}
            </span>
          </div>

          {/* Название */}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {product.name}
          </h1>

          {/* Цена и просмотры */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-3xl md:text-4xl font-bold text-accent">
              {product.price.toLocaleString('ru-RU')} ₽
            </div>
            
            {product.views > 0 && (
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-xl">👁</span>
                <span>{product.views}</span>
              </div>
            )}
          </div>

          {/* Описание */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">Описание</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      <ContactButton 
        productName={product.name}
        productPrice={product.price}
      />
    </div>
  );
};

export default Product;
