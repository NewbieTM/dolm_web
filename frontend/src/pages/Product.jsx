import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ContactButton from '../components/ContactButton';
import { getProductById, trackView } from '../utils/api';
import { getUserId, vibrate } from '../utils/telegram';

const Product = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const userId = getUserId();

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await getProductById(id);
      if (response.success) {
        setProduct(response.data);
        // Отслеживаем просмотр
        await trackView(userId, id);
      }
    } catch (error) {
      console.error('Ошибка загрузки товара:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    vibrate('light');
    navigate(-1);
  };

  const handlePhotoChange = (index) => {
    vibrate('light');
    setCurrentPhotoIndex(index);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <div className="animate-pulse">
          <div className="h-screen bg-dark-card" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Товар не найден
          </h2>
          <button
            onClick={handleBack}
            className="mt-4 px-6 py-2 bg-accent text-white rounded-full"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg pb-24">
      {/* Кнопка назад */}
      <button
        onClick={handleBack}
        className="fixed top-4 left-4 z-30 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-black/70"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Контейнер с максимальной шириной для ПК */}
      <div className="max-w-6xl mx-auto">
        {/* Галерея фото - адаптивная */}
        <div className="relative bg-dark-card md:rounded-2xl md:m-4 md:p-4">
          {/* Основное фото - ограничена высота на ПК */}
          <div className="relative w-full md:max-h-[600px] md:flex md:items-center md:justify-center">
            <img
              src={product.photos[currentPhotoIndex]}
              alt={product.name}
              className="w-full h-auto md:max-h-[600px] md:rounded-xl object-contain"
              style={{ aspectRatio: '1/1' }}
            />
          </div>

          {/* Миниатюры фото */}
          {product.photos.length > 1 && (
            <div className="p-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {product.photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => handlePhotoChange(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      index === currentPhotoIndex
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

        {/* Информация о товаре - адаптивные отступы */}
        <div className="p-4 md:p-8 max-w-4xl md:mx-auto">
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
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
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
            <p className="text-gray-300 leading-relaxed whitespace-pre-line text-base md:text-lg">
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
