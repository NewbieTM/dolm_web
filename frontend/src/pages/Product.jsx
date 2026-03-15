import { useState, useEffect, useRef } from 'react';
import { getProduct, getFavorites, addToFavorites, removeFromFavorites, getConfig } from '../utils/api';
import { getUserId, vibrate, showBackButton, hideBackButton, isRunningInTelegram, openTelegramLink } from '../utils/telegram';

const SCROLL_OFFSET = 40;

const Product = ({ productId, navigate }) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [managerUsername, setManagerUsername] = useState('');
  const userId = getUserId();

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
    if (product && !scrollAppliedRef.current) {
      setTimeout(() => {
        window.scrollTo({ top: SCROLL_OFFSET, behavior: 'instant' });
        scrollAppliedRef.current = true;
      }, 50);
    }
  }, [product]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const productResponse = await getProduct(productId);

      if (productResponse.success) {
        setProduct(productResponse.data);
        // viewProduct УДАЛЁН — просмотры не фиксируются

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
    vibrate('medium');
    try {
      if (isFavorite) {
        await removeFromFavorites(userId, productId);
        setIsFavorite(false);
      } else {
        await addToFavorites(userId, productId);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
    }
  };

  const handleBackClick = () => {
    navigate.back();
  };

  const handleContactManager = () => {
    if (!managerUsername) return;
    vibrate('light');

    const preorderNote = product?.isPreorder
      ? `\n⏱ Товар на заказ (доставка 7–15 дней)`
      : `\nВ наличии сейчас?`;

    const message = `Привет! Интересует товар:\n${product?.name}\nЦена: ${product?.price?.toLocaleString('ru-RU')} ₽${preorderNote}`;
    const encodedMessage = encodeURIComponent(message);

    openTelegramLink(`https://t.me/${managerUsername}?text=${encodedMessage}`);
  };

  // Swipe логика
  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 50;
    if (dragOffset < -threshold && currentImageIndex < product.photos.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    } else if (dragOffset > threshold && currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
    setDragOffset(0);
  };

  const handleImageClick = (index) => {
    setCurrentImageIndex(index);
  };

  const getImageTransform = (index) => {
    const position = index - currentImageIndex;
    const baseTranslate = position * 100;

    if (index === currentImageIndex && isDragging) {
      const dragPercent = (dragOffset / (imageContainerRef.current?.offsetWidth || 1)) * 100;
      return `translateX(${baseTranslate + dragPercent}%)`;
    }

    return `translateX(${baseTranslate}%)`;
  };

  const isButtonDisabled = loading || !product || !managerUsername;

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

  return (
    <div className="min-h-screen bg-dark-bg pb-24">
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
        <div style={{ height: `${SCROLL_OFFSET}px` }} className="bg-dark-bg" />

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

          {/* Индикаторы и избранное */}
          {product.photos.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end">
              <div className="flex gap-1.5">
                {product.photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageClick(index)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      index === currentImageIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/40'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleFavoriteClick}
                className="w-11 h-11 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-black/70"
              >
                <svg
                  className={`w-6 h-6 transition-all duration-200 ${
                    isFavorite ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-white'
                  }`}
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Информация о товаре */}
        <div className="px-4 py-6">
          {/* Бейдж "На заказ" */}
          {product.isPreorder && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center gap-3">
              <span className="text-xl">📦</span>
              <div>
                <p className="text-orange-300 font-semibold text-sm">Товар на заказ</p>
                <p className="text-gray-400 text-xs mt-0.5">Доставим за 7–15 рабочих дней</p>
              </div>
            </div>
          )}

          <h1 className="text-2xl font-bold text-white mb-2">{product.name}</h1>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-bold text-accent">
              {product.price.toLocaleString('ru-RU')} ₽
            </span>
            <span className="px-3 py-1 bg-dark-card rounded-full text-sm text-gray-400">
              {product.category}
            </span>
          </div>

          {product.description && (
            <p className="text-gray-300 text-base leading-relaxed mb-6">
              {product.description}
            </p>
          )}

          {/* Кнопка менеджера */}
          <button
            onClick={handleContactManager}
            disabled={isButtonDisabled}
            className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-200 shadow-lg ${
              isButtonDisabled
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                : product.isPreorder
                  ? 'bg-orange-500 text-white hover:bg-orange-400 shadow-orange-500/20'
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
                {product.isPreorder ? 'Оформить заказ' : 'Связаться с менеджером'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Product;
