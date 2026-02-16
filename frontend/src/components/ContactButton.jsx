import { useState, useEffect } from 'react';
import { vibrate, openTelegramLink } from '../utils/telegram';
import { getConfig } from '../utils/api';
import { shouldShowTooltip, markTooltipShown } from '../utils/tooltipManager';

const ContactButton = ({ productName, productPrice }) => {
  const [managerUsername, setManagerUsername] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  // ИСПРАВЛЕНИЕ: Добавляем состояние загрузки
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
    
    // Проверяем нужно ли показать подсказку сразу
    checkAndShowTooltip();
    
    // Проверяем каждую секунду нужно ли показать подсказку
    const checkInterval = setInterval(() => {
      checkAndShowTooltip();
    }, 1000);

    return () => {
      clearInterval(checkInterval);
    };
  }, []);

  const loadConfig = async () => {
    // ИСПРАВЛЕНИЕ: Устанавливаем loading в начале
    setLoading(true);
    try {
      const response = await getConfig();
      if (response.success) {
        setManagerUsername(response.data.managerUsername);
      }
    } catch (error) {
      console.error('Ошибка загрузки конфига:', error);
    } finally {
      // ИСПРАВЛЕНИЕ: Снимаем loading после завершения
      setLoading(false);
    }
  };

  const checkAndShowTooltip = () => {
    if (shouldShowTooltip()) {
      setShowTooltip(true);
      markTooltipShown();
      
      // Скрываем через 3 секунды
      setTimeout(() => {
        setShowTooltip(false);
      }, 3000);
    }
  };

  const handleClick = () => {
    // ИСПРАВЛЕНИЕ: Проверяем ВСЕ необходимые данные перед отправкой
    if (!managerUsername || loading) {
      console.warn('⚠️ Невозможно связаться с менеджером: данные еще не загружены');
      return;
    }
    
    vibrate('medium');
    setShowTooltip(false);
    
    // Сообщение для общей кнопки - подталкивает прикрепить фото
    const message = 'Здравствуйте, хотел бы заказать свой товар с фото. Сколько это будет стоить?';
    const encodedMessage = encodeURIComponent(message);
    
    console.log('📤 Отправка сообщения в ContactButton');
    openTelegramLink(`https://t.me/${managerUsername}?text=${encodedMessage}`);
  };

  // ИСПРАВЛЕНИЕ: Не показываем кнопку пока идет загрузка
  if (loading || !managerUsername) {
    return null;
  }

  // ИСПРАВЛЕНИЕ: Вычисляем состояние кнопки
  const isButtonDisabled = loading || !managerUsername;

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {/* Подсказка - глобальная, показывается раз в 20 секунд */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 animate-fade-in pointer-events-none">
          <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
            Привезем любой товар
            <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
          </div>
        </div>
      )}

      {/* ИСПРАВЛЕННАЯ Кнопка с иконкой доставки */}
      <button
        onClick={handleClick}
        disabled={isButtonDisabled}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          isButtonDisabled
            ? 'bg-gray-600 cursor-not-allowed opacity-50'
            : 'bg-accent hover:bg-accent-hover hover:scale-110 active:scale-95'
        }`}
        aria-label="Привезем любой товар"
      >
        {loading ? (
          // Показываем спиннер во время загрузки
          <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          <>
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
            
            <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-20"></span>
          </>
        )}
      </button>
    </div>
  );
};

export default ContactButton;
