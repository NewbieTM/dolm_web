import React, { useState, useEffect } from 'react';
import { vibrate, openTelegramLink } from '../utils/telegram';
import { getConfig } from '../utils/api';

const ContactButton = ({ productName, productPrice }) => {
  const [managerUsername, setManagerUsername] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    loadConfig();
    
    // Показываем подсказку через 2 секунды после загрузки
    const tooltipTimer = setTimeout(() => {
      setShowTooltip(true);
      // Скрываем через 5 секунд
      setTimeout(() => setShowTooltip(false), 5000);
    }, 2000);

    return () => clearTimeout(tooltipTimer);
  }, []);

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

  const handleClick = () => {
    vibrate('medium');
    setShowTooltip(false);
    
    let message = 'Здравствуйте! ';
    
    if (productName && productPrice) {
      message += `Интересует товар: ${productName}\nЦена: ${productPrice} ₽`;
    } else {
      message += 'Хочу оформить заказ';
    }
    
    const encodedMessage = encodeURIComponent(message);
    openTelegramLink(`https://t.me/${managerUsername}?text=${encodedMessage}`);
  };

  if (!managerUsername) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {/* Подсказка */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 animate-fade-in">
          <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            Оформить заказ
            <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
          </div>
        </div>
      )}

      {/* Кнопка */}
      <button
        onClick={handleClick}
        className="w-14 h-14 bg-accent hover:bg-accent-hover rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group"
        aria-label="Оформить заказ"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Иконка корзины с чеком */}
        <svg 
          className="w-7 h-7 text-white" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
          />
        </svg>
        
        {/* Пульсирующий эффект */}
        <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-20"></span>
        
        {/* Текстовая подсказка внутри кнопки (при hover) */}
        <span className="absolute -top-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
          Заказать
        </span>
      </button>
    </div>
  );
};

export default ContactButton;
