import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, viewProduct, addToFavorites, removeFromFavorites, getFavorites, getConfig } from '../utils/api';
import { getUserId, showBackButton, hideBackButton, vibrate, openTelegramLink } from '../utils/telegram';

const Product = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [managerUsername, setManagerUsername] = useState('');
  const userId = getUserId();

  // ✅ НОВОЕ: Для свайпа
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    loadProduct();
    loadConfig();
    loadFavoriteStatus();
    
    // Показываем кнопку "Назад"
    showBackButton(() => {
      navigate(-1);
    });

    return () => {
      hideBackButton();
    };
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await getProduct(id);
      if (response.success) {
        setProduct(response.data);
        
        // Фиксируем просмотр
        await viewProduct(id);
      }
    } catch (error) {
      console.error('Ошибка загрузки товара:', error);
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
      console.error('Ошибка загрузки конфига:', error);
    }
  };

  // ✅ ИСПРАВЛЕНО: Загружаем статус избранного
  const loadFavoriteStatus = async () => {
    try {
      const response = await getFavorites(userId);
      if (response.success) {
        const favoriteIds = response.data.map(product => product.id);
        setIsFavorite(favoriteIds.includes(id));
      }
    } catch (error) {
      console.error('Ошибка загрузки избранного:', error);
    }
  };

  const handleToggleFavorite = async () => {
    vibrate('medium');
    try {
      if (isFavorite) {
        await removeFromFavorites(userId, id);
        setIsFavorite(false);
      } else {
        await addToFavorites(userId, id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Ошибка с избранным:', error);
    }
  };

  const handleContactManager = () => {
    vibrate('medium');
    const message = encodeURIComponent(
      `Здравствуйте! Интересует товар: ${product.name}\nЦена: ${product.price} ₽`
    );
    openTelegramLink(`https://t.me/${managerUsername}?text=${message}`);
  };

  const handleImageClick = (index) => {
    vibrate('light');
    setCurrentImageIndex(index);
  };

  // ✅ НОВОЕ: Обработчики свайпа
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!product || product.photos.length <= 1) return;

    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // минимальное расстояние для свайпа

    if (Math.abs(swipeDistance) < minSwipeDistance) return;

    if (swipeDistance > 0) {
      // Свайп влево - следующее фото
      setCurrentImageIndex((prev) => 
        prev === product.photos.length - 1 ? 0 : prev + 1
      );
      vibrate('light');
    } else {
      // Свайп вправо - предыдущее фото
      setCurrentImageIndex((prev) => 
        prev === 0 ? product.photos.length - 1 : prev - 1
      );
      vibrate('light');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <div className="aspect-square skeleton" />
        <div className="p-4 space-y-4">
          <div className="h-8 skeleton rounded" />
          <div className="h-6 skeleton rounded w-1/3" />
          <div className="h-20 skeleton rounded" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            Товар не найден
          </h2>
          <button
            onClick={() => navigate('/')}
            className="text-accent hover:text-accent-hover"
          >
            Вернуться в каталог
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg pb-24">
      {/* Галерея с поддержкой свайпа */}
      <div className="relative">
        {/* Главное фото */}
        <div 
          className="aspect-square bg-dark-card relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={product.photos[currentImageIndex]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          
          {/* Индикатор количества фото */}
          {product.photos.length > 1 && (
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-white text-sm font-medium">
                {currentImageIndex + 1} / {product.photos.length}
              </span>
            </div>
          )}
        </div>

        {/* Кнопка избранного */}
        <button
          onClick={handleToggleFavorite}
          className="absolute top-4 right-4 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 hover:bg-black/70"
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

        {/* Миниатюры */}
        {product.photos.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 px-4">
            <div className="flex gap-2 justify-center overflow-x-auto pb-2">
              {product.photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => handleImageClick(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                    currentImageIndex === index
                      ? 'border-accent scale-110'
                      : 'border-transparent opacity-60 hover:opacity-100'
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
      <div className="p-4">
        {/* Категория */}
        <div className="mb-3">
          <span className="inline-block px-3 py-1 bg-dark-card rounded-full text-sm text-gray-400">
            {product.category}
          </span>
        </div>

        {/* Название */}
        <h1 className="text-2xl font-bold text-white mb-4">
          {product.name}
        </h1>

        {/* Цена */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-3xl font-bold text-accent">
            {product.price.toLocaleString('ru-RU')} ₽
          </div>
          
          {product.views > 0 && (
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{product.views} просмотров</span>
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

        {/* Кнопка связи с менеджером */}
        <button
          onClick={handleContactManager}
          className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-4 px-6 rounded-2xl transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Связаться с менеджером
        </button>
      </div>
    </div>
  );
};

export default Product;
