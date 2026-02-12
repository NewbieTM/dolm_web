import React, { useState, useEffect } from 'react';
import { vibrate, openTelegramLink } from '../utils/telegram';
import { getConfig } from '../utils/api';

const ContactButton = ({ productName, productPrice }) => {
  const [managerUsername, setManagerUsername] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    loadConfig();
    
    // Показываем подсказку через 3 секунды после загрузки
    const tooltipTimer = setTimeout(() => {
      setShowTooltip(true);
      // Скрываем через 4 секунды
      setTimeout(() => setShowTooltip(false), 4000);
    }, 3000);

    // Показываем подсказку каждые 30 секунд
    const intervalTimer = setInterval(() => {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 4000);
    }, 30000);

    return () => {
      clearTimeout(tooltipTimer);
      clearInterval(intervalTimer);
    };
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
      {/* Подсказка - только периодически, БЕЗ hover */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 animate-fade-in pointer-events-none">
          <div className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-xl whitespace-nowrap">
            Оформить свой заказ
            <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
          </div>
        </div>
      )}

      {/* Кнопка БЕЗ группы и hover подсказок */}
      <button
        onClick={handleClick}
        className="w-14 h-14 bg-accent hover:bg-accent-hover rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        aria-label="Оформить заказ"
      >
        {/* Иконка корзины */}
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
      </button>
    </div>
  );
};

export default ContactButton;
