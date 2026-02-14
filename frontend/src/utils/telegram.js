// Telegram Web App SDK
const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

// Генерируем уникальный ID для dev режима
function generateDevUserId() {
  let userId = localStorage.getItem('dev_user_id');
  
  if (!userId) {
    userId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('dev_user_id', userId);
    console.log('🆔 Создан новый уникальный dev user ID:', userId);
  } else {
    console.log('🆔 Загружен существующий dev user ID:', userId);
  }
  
  return userId;
}

// Инициализация приложения
export function initTelegramApp() {
  if (!tg) {
    console.warn('⚠️  Telegram WebApp SDK не найден');
    console.log('Работаем в режиме разработки');
    return null;
  }

  try {
    console.log('🔧 Инициализация Telegram WebApp...');
    
    tg.ready();
    
    if (tg.expand) {
      tg.expand();
    }

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

// Получить ID пользователя
export function getUserId() {
  if (tg?.initDataUnsafe?.user?.id) {
    const id = tg.initDataUnsafe.user.id.toString();
    console.log('🆔 Telegram User ID:', id);
    return id;
  }
  
  if (typeof window !== 'undefined' && window.localStorage) {
    const devId = generateDevUserId();
    return devId;
  }
  
  console.warn('⚠️  Используется fallback ID');
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Получить данные пользователя
export function getUserData() {
  if (tg?.initDataUnsafe?.user) {
    return tg.initDataUnsafe.user;
  }
  
  const devId = getUserId();
  return {
    id: devId,
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

// Вибрация - ИСПРАВЛЕНО!
export function vibrate(style = 'light') {
  if (!tg || !tg.HapticFeedback) return;
  
  try {
    // Используем правильные значения для impactOccurred
    // Допустимые значения: 'light', 'medium', 'heavy', 'rigid', 'soft'
    if (['light', 'medium', 'heavy', 'rigid', 'soft'].includes(style)) {
      tg.HapticFeedback.impactOccurred(style);
    } else if (style === 'success' || style === 'warning' || style === 'error') {
      // Для notification используем notificationOccurred
      tg.HapticFeedback.notificationOccurred(style);
    } else {
      // По умолчанию используем light
      tg.HapticFeedback.impactOccurred('light');
    }
  } catch (error) {
    // Игнорируем ошибки вибрации чтобы не ломать приложение
    console.warn('⚠️  Vibrate error:', error.message);
  }
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
