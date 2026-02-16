import { useState, useEffect, useRef } from 'react';
import { getProduct, viewProduct, getFavorites, addToFavorites, removeFromFavorites, getConfig } from '../utils/api';
import { getUserId, vibrate, showBackButton, hideBackButton, isRunningInTelegram, openTelegramLink } from '../utils/telegram';

// Высота отступа сверху для "обмана" Telegram
const SCROLL_OFFSET = 40; // px

const Product = ({ productId, navigate }) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [managerUsername, setManagerUsername] = useState('');
  const userId = getUserId();

  // Состояния для плавного свайпа
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startX, setStartX] = useState(0);

  const imageContainerRef = useRef(null);
  const scrollAppliedRef = useRef(false);

  useEffect(() => {
    console.log('📱 Product mounted, ID:', productId);
    loadProduct();
    loadConfig();
    
    if (isRunningInTelegram()) {
      showBackButton(() => {
        navigate.back();
      });
    }

    return () => {
      hideBackButton();
      scrollAppliedRef.current = false;
    };
  }, [productId]);

  useEffect(() => {
    // Применяем scroll offset после загрузки товара
    if (product && !scrollAppliedRef.current) {
      // Небольшая задержка чтобы элементы успели отрендериться
      setTimeout(() => {
        window.scrollTo({
          top: SCROLL_OFFSET,
          behavior: 'instant' // Мгновенно, без анимации
        });
        scrollAppliedRef.current = true;
        console.log(`📜 Прокрутка применена: ${SCROLL_OFFSET}px`);
      }, 50);
    }
  }, [product]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const productResponse = await getProduct(productId);
      
      if (productResponse.success) {
        setProduct(productResponse.data);
        await viewProduct(productId);
        
        const favoritesResponse = await getFavorites(userId);
        
        if (favoritesResponse.success) {
          setIsFavorite(favoritesResponse.data.some(p => p.id === productId));
        }
      }
    } catch (error) {
      console.error('❌ Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await getConfig();
      if (response.success) {
        setManagerUsername(response.data.managerUsername);
      }
    } catch (error) {
      console.error('❌ Error loading config:', error);
    }
  };

  const handleFavoriteClick = async () => {
    vibrate('light');
    
    try {
      if (isFavorite) {
        await removeFromFavorites(userId, productId);
        setIsFavorite(false);
      } else {
        await addToFavorites(userId, productId);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('❌ Favorite error:', error);
    }
  };

  const handleImageClick = (index) => {
    setCurrentImageIndex(index);
    vibrate('light');
  };

  // Простой свайп
  const handleTouchStart = (e) => {
    if (!product || product.photos.length <= 1) return;
    
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setDragOffset(0);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !product) return;
    
    // Блокируем стандартное поведение для галереи
    e.preventDefault();
    
    const currentX = e.touches[0].clientX;
    const diffX = currentX - startX;
    
    const maxDrag = 100;
    const limitedDiff = Math.max(-maxDrag, Math.min(maxDrag, diffX));
    
    setDragOffset(limitedDiff);
  };

  const handleTouchEnd = () => {
    if (!isDragging || !product) return;
    
    const threshold = 50;
    
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset < 0) {
        setCurrentImageIndex((prev) => 
          prev === product.photos.length - 1 ? prev : prev + 1
        );
        vibrate('light');
      } else {
        setCurrentImageIndex((prev) => 
          prev === 0 ? prev : prev - 1
        );
        vibrate('light');
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleBackClick = () => {
    vibrate('light');
    navigate.back();
  };

  const handleContactManager = () => {
    // ИСПРАВЛЕНИЕ: Проверяем ВСЕ необходимые данные перед отправкой
    if (!managerUsername || !product || loading) {
      console.warn('⚠️ Невозможно связаться с менеджером: данные еще не загружены');
      return;
    }
    
    vibrate('medium');
    
    // ИСПРАВЛЕНИЕ: Добавляем дополнительную проверку перед созданием сообщения
    const productName = product.name || 'товар';
    const productPrice = product.price || 0;
    
    const message = `Здравствуйте, хотелось бы заказать ${productName} за ${productPrice.toLocaleString('ru-RU')} ₽. В наличии сейчас?`;
    const encodedMessage = encodeURIComponent(message);
    
    console.log('📤 Отправка сообщения:', message);
    openTelegramLink(`https://t.me/${managerUsername}?text=${encodedMessage}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
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

  const getImageTransform = (index) => {
    const position = index - currentImageIndex;
    const baseTranslate = position * 100;
    
    if (index === currentImageIndex && isDragging) {
      const dragPercent = (dragOffset / (imageContainerRef.current?.offsetWidth || 1)) * 100;
      return `translateX(${baseTranslate + dragPercent}%)`;
    }
    
    return `translateX(${baseTranslate}%)`;
  };

  // ИСПРАВЛЕНИЕ: Вычисляем состояние кнопки
  const isButtonDisabled = loading || !product || !managerUsername;

  return (
    <div className="min-h-screen bg-dark-bg pb-24">
      {/* Кнопка назад для браузера */}
      {!isRunningInTelegram() && (
        <button
          onClick={handleBackClick}
          className="fixed top-4 left-4 z-50 w-10 h-10 bg-dark-card/95 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-dark-hover"
          style={{ top: `${SCROLL_OFFSET + 16}px` }}
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Отступ сверху для прокрутки */}
        <div 
          style={{ height: `${SCROLL_OFFSET}px` }}
          className="bg-dark-bg"
        />

        {/* Галерея */}
        <div className="relative">
          <div 
            ref={imageContainerRef}
            className="relative w-full overflow-hidden bg-dark-card select-none"
            style={{ 
              height: 'auto',
              maxHeight: '600px',
              aspectRatio: '1/1',
              touchAction: 'pan-y'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {/* Все фото для плавного свайпа */}
            {product.photos.map((photo, index) => (
              <div
                key={index}
                className="absolute inset-0 w-full h-full flex items-center justify-center bg-black"
                style={{
                  transform: getImageTransform(index),
                  transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  pointerEvents: index === currentImageIndex ? 'auto' : 'none'
                }}
              >
                <img
                  src={photo}
                  alt={`${product.name} - фото ${index + 1}`}
                  className="w-full h-full object-contain"
                  draggable="false"
                />
              </div>
            ))}
          </div>

          {/* Индикаторы фото и избранное */}
          {product.photos.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end">
              {/* Индикаторы */}
              <div className="flex gap-1.5">
                {product.photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageClick(index)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      index === currentImageIndex 
                        ? 'w-8 bg-white' 
                        : 'w-1.5 bg-white/40'
                    }`}
                    aria-label={`Фото ${index + 1}`}
                  />
                ))}
              </div>

              {/* Избранное */}
              <button
                onClick={handleFavoriteClick}
                className="w-11 h-11 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-black/70"
              >
                <svg
                  className={`w-6 h-6 transition-all duration-200 ${
                    isFavorite 
                      ? 'fill-red-500 stroke-red-500' 
                      : 'fill-none stroke-white'
                  }`}
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>
          )}

          {/* Миниатюры для десктопа */}
          {product.photos.length > 1 && (
            <div className="hidden md:block mt-4 px-6">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageClick(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      index === currentImageIndex 
                        ? 'border-accent scale-105'
                        : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`${product.name} - фото ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Информация о товаре */}
        <div className="p-6 md:p-8">
          <div className="mb-3">
            <span className="inline-block px-3 py-1 bg-dark-card rounded-full text-sm text-gray-400">
              {product.category}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {product.name}
          </h1>

          <div className="flex items-center justify-between mb-6">
            <div className="text-3xl md:text-4xl font-bold text-accent">
              {product.price.toLocaleString('ru-RU')} ₽
            </div>
            
            {product.views > 0 && (
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{product.views}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3">Описание</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {/* ИСПРАВЛЕННАЯ Кнопка связаться с менеджером */}
          {managerUsername && (
            <button
              onClick={handleContactManager}
              disabled={isButtonDisabled}
              className={`w-full font-semibold py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg ${
                isButtonDisabled
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-accent text-white hover:bg-accent/90 shadow-accent/20'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Загрузка...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Связаться с менеджером
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Product;
