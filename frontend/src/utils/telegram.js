// Telegram Web App SDK
const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

// Генерируем уникальный ID для каждого браузера/устройства
function generateDevUserId() {
  let userId = localStorage.getItem('dev_user_id');
  
  if (!userId) {
    userId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('dev_user_id', userId);
    console.log('🆔 Создан dev user ID:', userId);
  } else {
    console.log('🆔 Загружен dev user ID:', userId);
  }
  
  return userId;
}

// Инициализация
export function initTelegramApp() {
  if (!tg) {
    console.warn('⚠️ Telegram WebApp SDK не найден, работаем в dev режиме');
    return null;
  }

  try {
    tg.ready();
    
    if (tg.expand) tg.expand();
    if (tg.setHeaderColor) tg.setHeaderColor('#0F0F0F');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#0F0F0F');

    console.log('✅ Telegram WebApp готов');
    console.log('🆔 User ID:', getUserId());
    
    return tg;
  } catch (error) {
    console.error('❌ Ошибка Telegram WebApp:', error);
    return null;
  }
}

// Получить ID пользователя
export function getUserId() {
  if (tg?.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user.id.toString();
  }
  
  if (typeof window !== 'undefined' && window.localStorage) {
    return generateDevUserId();
  }
  
  return `temp_${Date.now()}`;
}

// Получить данные пользователя
export function getUserData() {
  if (tg?.initDataUnsafe?.user) {
    return tg.initDataUnsafe.user;
  }
  
  return {
    id: getUserId(),
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser'
  };
}

// Проверка запуска в Telegram
export function isRunningInTelegram() {
  return !!(tg && tg.initData);
}

// Показать кнопку назад
export function showBackButton(onClick) {
  if (!tg?.BackButton) return;
  
  tg.BackButton.show();
  tg.BackButton.onClick(onClick);
}

// Скрыть кнопку назад
export function hideBackButton() {
  if (!tg?.BackButton) return;
  
  tg.BackButton.hide();
  tg.BackButton.offClick();
}

// Вибрация
export function vibrate(style = 'light') {
  if (!tg?.HapticFeedback) return;
  
  const styles = {
    light: 'impact',
    medium: 'notification',
    heavy: 'heavy'
  };

  tg.HapticFeedback.impactOccurred(styles[style] || 'light');
}

// Открыть ссылку
export function openTelegramLink(url) {
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
}

export default tg;
