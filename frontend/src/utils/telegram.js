// Telegram Web App SDK
const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

// Константа для тестового пользователя
const TEST_USER_ID = 'test_user_stable';

// Инициализация приложения
export function initTelegramApp() {
  if (!tg) {
    console.warn('⚠️  Telegram WebApp SDK не найден');
    console.log('Работаем в режиме разработки');
    return null;
  }

  try {
    console.log('🔧 Инициализация Telegram WebApp...');
    
    // ВАЖНО: Готовим приложение
    tg.ready();
    
    // Разворачиваем на весь экран
    if (tg.expand) {
      tg.expand();
    }

    // Устанавливаем цвета
    if (tg.setHeaderColor) {
      tg.setHeaderColor('#0F0F0F');
    }
    if (tg.setBackgroundColor) {
      tg.setBackgroundColor('#0F0F0F');
    }

    console.log('✅ Telegram WebApp готов');
    console.log('📱 Platform:', tg.platform);
    console.log('🆔 User ID:', getUserId());
    console.log('👤 User:', getUserData());
    console.log('🔗 Init Data:', tg.initData ? 'присутствует' : 'отсутствует');
    
    return tg;
  } catch (error) {
    console.error('❌ Ошибка инициализации Telegram WebApp:', error);
    return null;
  }
}

// Получить стабильный ID пользователя
export function getUserId() {
  // В Telegram Mini App
  if (tg?.initDataUnsafe?.user?.id) {
    const id = tg.initDataUnsafe.user.id.toString();
    console.log('🆔 Telegram User ID:', id);
    return id;
  }
  
  // Для обычного браузера (не Telegram) - используем localStorage для стабильности
  if (typeof window !== 'undefined' && window.localStorage) {
    let storedId = localStorage.getItem('dev_user_id');
    
    if (!storedId) {
      // Создаём стабильный ID только один раз
      storedId = TEST_USER_ID;
      localStorage.setItem('dev_user_id', storedId);
      console.log('🆔 Создан новый dev user ID:', storedId);
    } else {
      console.log('🆔 Загружен dev user ID:', storedId);
    }
    
    return storedId;
  }
  
  // Fallback - но это не должно использоваться
  console.warn('⚠️  Используется fallback ID');
  return TEST_USER_ID;
}

// Получить данные пользователя
export function getUserData() {
  if (tg?.initDataUnsafe?.user) {
    return tg.initDataUnsafe.user;
  }
  
  // Для разработки
  return {
    id: getUserId(),
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'ru'
  };
}

// Проверка запуска в Telegram
export function isRunningInTelegram() {
  const inTelegram = !!(tg && tg.initData);
  console.log('📱 Running in Telegram:', inTelegram);
  return inTelegram;
}

// Показать кнопку назад
export function showBackButton(onClick) {
  if (!tg || !tg.BackButton) {
    console.log('⚠️  BackButton недоступна');
    return;
  }
  
  tg.BackButton.show();
  tg.BackButton.onClick(onClick);
  console.log('◀️  Back button показана');
}

// Скрыть кнопку назад
export function hideBackButton() {
  if (!tg || !tg.BackButton) return;
  
  tg.BackButton.hide();
  tg.BackButton.offClick();
  console.log('◀️  Back button скрыта');
}

// Вибрация
export function vibrate(style = 'light') {
  if (!tg || !tg.HapticFeedback) return;
  
  const styles = {
    light: 'impact',
    medium: 'notification',
    heavy: 'heavy'
  };

  tg.HapticFeedback.impactOccurred(styles[style] || 'light');
}

// Открыть Telegram ссылку
export function openTelegramLink(url) {
  if (!tg || !tg.openTelegramLink) {
    window.open(url, '_blank');
    return;
  }

  tg.openTelegramLink(url);
  console.log('🔗 Открываем Telegram ссылку:', url);
}

// Показать главную кнопку
export function showMainButton(text, onClick) {
  if (!tg || !tg.MainButton) return;

  tg.MainButton.text = text;
  tg.MainButton.color = '#6366F1';
  tg.MainButton.textColor = '#FFFFFF';
  tg.MainButton.show();
  tg.MainButton.onClick(onClick);
}

// Скрыть главную кнопку
export function hideMainButton() {
  if (!tg || !tg.MainButton) return;
  
  tg.MainButton.hide();
  tg.MainButton.offClick();
}

// Закрыть приложение
export function closeApp() {
  if (!tg || !tg.close) {
    window.close();
    return;
  }

  tg.close();
}

// Получить высоту viewport
export function getViewportHeight() {
  if (!tg) return window.innerHeight;
  return tg.viewportHeight || window.innerHeight;
}

export default tg;
