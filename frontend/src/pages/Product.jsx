import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, viewProduct, addToHistory, addToFavorites, removeFromFavorites, getConfig } from '../utils/api';
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

  useEffect(() => {
    loadProduct();
    loadConfig();
    
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
        
        // Добавляем в историю
        await addToHistory(userId, id);
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
      {/* Галерея */}
      <div className="relative">
        {/* Главное фото */}
        <div className="aspect-square bg-dark-card">
          <img
            src={product.photos[currentImageIndex]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
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
            <div className="flex gap-2 justify-center">
              {product.photos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleImageClick(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    currentImageIndex === index
                      ? 'bg-white w-6'
                      : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Информация о товаре */}
      <div className="p-4 space-y-6">
        {/* Название и цена */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-2xl font-bold text-white flex-1">
              {product.name}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-accent">
              {product.price.toLocaleString('ru-RU')} ₽
            </span>
            <span className="px-3 py-1 bg-dark-card rounded-full text-sm text-gray-400">
              {product.category}
            </span>
          </div>
        </div>

        {/* Описание */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">Описание</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>

        {/* Просмотры */}
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

      {/* Кнопка связи с менеджером */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-dark-bg via-dark-bg to-transparent">
        <button
          onClick={handleContactManager}
          className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-4 rounded-xl transition-all duration-200 transform active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-.962 4.038-1.36 5.358-.168.559-.5.746-.82.764-.696.064-1.225-.46-1.9-.902-1.056-.692-1.653-1.123-2.678-1.799-1.185-.782-.417-1.213.258-1.915.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.121.098.155.231.171.325.016.094.036.308.02.475z"/>
          </svg>
          Связаться с менеджером
        </button>
      </div>
    </div>
  );
};

export default Product;
