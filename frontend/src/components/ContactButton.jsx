import React from 'react';
import { openTelegramLink } from '../utils/telegram';

const ContactButton = ({ productName, productPrice }) => {
  const MANAGER_USERNAME = 'your_manager_username';

  const handleContact = () => {
    let message = 'Здравствуйте! Интересует ваш магазин.';
    
    if (productName) {
      message = `Здравствуйте! Интересует товар "${productName}"`;
      if (productPrice) {
        message += ` (${productPrice.toLocaleString('ru-RU')} ₽)`;
      }
    }
    
    const url = `https://t.me/${MANAGER_USERNAME}?text=${encodeURIComponent(message)}`;
    openTelegramLink(url);
  };

  return (
    <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
      <button
        onClick={handleContact}
        className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-200 active:scale-95"
      >
        💬 Связаться с менеджером
      </button>
    </div>
  );
};

export default ContactButton;
