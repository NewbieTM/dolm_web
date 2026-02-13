// Инициализация Telegram WebApp
let tg = null;

export const initTelegramApp = () => {
  // Проверяем наличие window и Telegram
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    
    console.log('🔧 Настройка Telegram WebApp...');
    
    // Разворачиваем приложение на весь экран
    tg.expand();
    
    // Включаем закрытие свайпом вниз
    tg.enableClosingConfirmation();
    
    // Устанавливаем цвета темы
    tg.setHeaderColor('#0f0f0f');
    tg.setBackgroundColor('#0f0f0f');
    
    // Говорим Telegram что приложение готово
    tg.ready();
    
    console.log('✅ Telegram WebApp инициализирован');
    console.log('User ID:', tg.initDataUnsafe?.user?.id);
    console.log('Platform:', tg.platform);
    console.log('Version:', tg.version);
    
    return tg;
  } else {
    console.warn('⚠️ Telegram WebApp API недоступен (вероятно, открыто в браузере)');
    
    // Возвращаем mock-объект для тестирования в браузере
    return {
      initDataUnsafe: {
        user: {
          id: 123456789, // Тестовый ID для разработки
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser'
        }
      },
      platform: 'web',
      version: '6.0',
      ready: () => console.log('Mock: ready()'),
      expand: () => console.log('Mock: expand()'),
      close: () => console.log('Mock: close()'),
      enableClosingConfirmation: () => console.log('Mock: enableClosingConfirmation()'),
      setHeaderColor: (color) => console.log('Mock: setHeaderColor(' + color + ')'),
      setBackgroundColor: (color) => console.log('Mock: setBackgroundColor(' + color + ')'),
      BackButton: {
        show: () => console.log('Mock: BackButton.show()'),
        hide: () => console.log('Mock: BackButton.hide()'),
        onClick: (callback) => console.log('Mock: BackButton.onClick()'),
        offClick: (callback) => console.log('Mock: BackButton.offClick()')
      },
      HapticFeedback: {
        impactOccurred: (style) => console.log('Mock: HapticFeedback.impactOccurred(' + style + ')'),
        notificationOccurred: (type) => console.log('Mock: HapticFeedback.notificationOccurred(' + type + ')'),
        selectionChanged: () => console.log('Mock: HapticFeedback.selectionChanged()')
      }
    };
  }
};

// Получить ID пользователя
export const getUserId = () => {
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    return tg.initDataUnsafe.user.id.toString();
  }
  
  console.warn('⚠️ Использую тестовый User ID');
  return '123456789'; // Дефолтный ID для тестов в браузере
};

// Получить данные пользователя
export const getUserData = () => {
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    return tg.initDataUnsafe.user;
  }
  
  console.warn('⚠️ Использую тестовые данные пользователя');
  return {
    id: 123456789,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser'
  };
};

// Вибрация (тактильная обратная связь)
export const vibrate = (style = 'light') => {
  if (!tg || !tg.HapticFeedback) {
    return;
  }

  try {
    // Impact стили: light, medium, heavy, rigid, soft
    if (['light', 'medium', 'heavy', 'rigid', 'soft'].includes(style)) {
      tg.HapticFeedback.impactOccurred(style);
    } 
    // Notification типы: success, warning, error
    else if (['success', 'warning', 'error'].includes(style)) {
      tg.HapticFeedback.notificationOccurred(style);
    } 
    // Selection changed
    else if (style === 'selection') {
      tg.HapticFeedback.selectionChanged();
    }
  } catch (error) {
    console.error('Ошибка вибрации:', error);
  }
};

// Показать кнопку "Назад"
export const showBackButton = (callback) => {
  if (tg && tg.BackButton) {
    // Убираем предыдущие обработчики
    tg.BackButton.offClick(callback);
    // Добавляем новый обработчик
    tg.BackButton.onClick(callback);
    // Показываем кнопку
    tg.BackButton.show();
  }
};

// Скрыть кнопку "Назад"
export const hideBackButton = () => {
  if (tg && tg.BackButton) {
    tg.BackButton.hide();
  }
};

// Закрыть приложение
export const closeApp = () => {
  if (tg && tg.close) {
    tg.close();
  }
};

// Открыть ссылку в Telegram (для ссылок вида t.me/...)
export const openTelegramLink = (url) => {
  if (tg && tg.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
};

// Открыть внешнюю ссылку
export const openLink = (url) => {
  if (tg && tg.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, '_blank');
  }
};

// Проверка, запущено ли в Telegram
export const isTelegramWebApp = () => {
  return tg && tg.platform !== 'web';
};

export default tg;
