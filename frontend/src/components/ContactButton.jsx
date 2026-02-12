import React, { useState, useEffect } from 'react';
import { vibrate, openTelegramLink } from '../utils/telegram';
import { getConfig } from '../utils/api';

const ContactButton = ({ productName, productPrice }) => {
  const [managerUsername, setManagerUsername] = useState('');

  useEffect(() => {
    loadConfig();
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
    <button
      onClick={handleClick}
      className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-accent hover:bg-accent-hover rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
      aria-label="Связаться с менеджером"
    >
      {/* Иконка чата */}
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
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
        />
      </svg>
      
      {/* Пульсирующий эффект */}
      <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-20"></span>
    </button>
  );
};

export default ContactButton;
