import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, viewProduct, getFavorites, addToFavorites, removeFromFavorites } from '../utils/api';
import { getUserId, vibrate, showBackButton, hideBackButton } from '../utils/telegram';
import ContactButton from '../components/ContactButton';

const Product = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const userId = getUserId();

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
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
      console.log('Loading product:', id);
      const productResponse = await getProduct(id);
      console.log('Product response:', productResponse);
      
      if (productResponse.success) {
        setProduct(productResponse.data);
        await viewProduct(id);
        
        const favoritesResponse = await getFavorites(userId);
        console.log('Favorites response:', favoritesResponse);
        
        if (favoritesResponse.success) {
          setIsFavorite(favoritesResponse.data.some(p => p.id === id));
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки товара:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteClick = async () => {
    vibrate('light');
    
    try {
      if (isFavorite) {
        console.log('Removing from favorites...');
        const response = await removeFromFavorites(userId, id);
        console.log('Remove response:', response);
        
        if (response.success) {
          setIsFavorite(false);
        }
      } else {
        console.log('Adding to favorites...');
        const response = await addToFavorites(userId, id);
        console.log('Add response:', response);
        
        if (response.success) {
          setIsFavorite(true);
        }
      }
    } catch (error) {
      console.error('Ошибка с избранным:', error);
    }
  };

  const handleImageClick = (index) => {
    vibrate('light');
    setCurrentImageIndex(index);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!product || product.photos.length <= 1) return;

    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(swipeDistance) < minSwipeDistance) return;

    if (swipeDistance > 0) {
      setCurrentImageIndex((prev) => 
        prev === product.photos.length - 1 ? 0 : prev + 1
      );
      vibrate('light');
    } else {
      setCurrentImageIndex((prev) => 
        prev === 0 ? product.photos.length - 1 : prev - 1
      );
      vibrate('light');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-accent text-xl">Загрузка...</div>
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
      {/* Ограничиваем ширину на больших экранах */}
      <div className="max-w-5xl mx-auto">
        
        {/* Галерея фото - АДАПТИВНАЯ */}
        <div className="relative">
          {/* Главное фото с ограничением высоты */}
          <div 
            className="relative w-full overflow-hidden bg-dark-card"
            style={{ 
              height: 'auto',
              maxHeight: '600px', // Ограничение высоты на ПК
              aspectRatio: '1/1' // На мобильных квадрат
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={product.photos[currentImageIndex]}
              alt={product.name}
              className="w-full h-full object-cover md:object-contain md:bg-black"
              style={{ userSelect: 'none' }}
            />
            
            {/* Кнопка избранного */}
            <button
              onClick={handleFavoriteClick}
              className="absolute top-4 right-4 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-black/70 z-10"
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

            {/* Индикаторы фото */}
            {product.photos.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 z-10">
                {product.photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageClick(index)}
                    className={`h-2 rounded-full transition-all duration-200 ${
                      currentImageIndex === index
                        ? 'w-8 bg-white'
                        : 'w-2 bg-white/50 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Миниатюры - только на desktop */}
          {product.photos.length > 1 && (
            <div className="hidden md:block px-4 pt-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageClick(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      currentImageIndex === index
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{product.views}</span>
              </div>
            )}
          </div>

          {/* Описание */}
          <div className="mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3">Описание</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      {/* Кнопка связи с менеджером */}
      <ContactButton 
        productName={product.name}
        productPrice={product.price}
      />
    </div>
  );
};

export default Product;
