import { useState, useEffect } from 'react';
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
      // Скрываем через 3 секунды (было 1.5)
      setTimeout(() => setShowTooltip(false), 3000);
    }, 2000);

    // Показываем подсказку каждые 20 секунд
    const intervalTimer = setInterval(() => {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
    }, 20000);

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
    
    let message = 'Здравствуйте!\n';
    
    if (productName && productPrice) {
      message += `Интересует товар: ${productName}\nЦена: ${productPrice.toLocaleString('ru-RU')} ₽`;
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
      {/* Подсказка - 3 секунды */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 animate-fade-in pointer-events-none">
          <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
            Привезем любой товар
            <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
          </div>
        </div>
      )}

      {/* Кнопка с иконкой доставки */}
      <button
        onClick={handleClick}
        className="w-14 h-14 bg-accent hover:bg-accent-hover rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        aria-label="Привезем любой товар"
      >
        {/* Иконка грузовика/доставки */}
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
            d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" 
          />
        </svg>
        
        {/* Пульсирующий эффект */}
        <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-20"></span>
      </button>
    </div>
  );
};

export default ContactButton;
