// Telegram Web App SDK
const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

// Инициализация приложения
export function initTelegramApp() {
  if (!tg) {
    console.warn('Telegram WebApp SDK не найден, работаем как обычный сайт');
    return null;
  }

  try {
    // Разворачиваем приложение на весь экран (если метод есть)
    tg.expand?.();

    // Устанавливаем цвета темы (если методы есть)
    tg.setHeaderColor?.('#0F0F0F');
    tg.setBackgroundColor?.('#0F0F0F');

    // Включаем подтверждение закрытия только если нужно
    // tg.enableClosingConfirmation?.();

    console.log('✅ Telegram WebApp инициализирован');
    console.log('User ID:', getUserId());
    console.log('Platform:', tg.platform);
  } catch (error) {
    console.warn('Ошибка инициализации Telegram WebApp, продолжаем без него:', error);
  }

  return tg;
}

// Получить ID пользователя
export function getUserId() {
  if (!tg?.initDataUnsafe?.user?.id) {
    // Для локальной разработки
    return 'dev_user_' + Math.random().toString(36).substr(2, 9);
  }
  return tg.initDataUnsafe.user.id.toString();
}

// Получить данные пользователя
export function getUserData() {
  if (!tg?.initDataUnsafe?.user) {
    // Для локальной разработки
    return {
      id: getUserId(),
      first_name: 'Dev',
      last_name: 'User',
      username: 'devuser',
      language_code: 'ru'
    };
  }
  return tg.initDataUnsafe.user;
}

// Показать главную кнопку
export function showMainButton(text, onClick) {
  if (!tg) return;

  tg.MainButton.text = text;
  tg.MainButton.color = '#6366F1';
  tg.MainButton.textColor = '#FFFFFF';
  tg.MainButton.show();
  tg.MainButton.onClick(onClick);
}

// Скрыть главную кнопку
export function hideMainButton() {
  if (!tg) return;
  tg.MainButton.hide();
  tg.MainButton.offClick();
}

// Показать кнопку назад
export function showBackButton(onClick) {
  if (!tg) return;
  tg.BackButton.show();
  tg.BackButton.onClick(onClick);
}

// Скрыть кнопку назад
export function hideBackButton() {
  if (!tg) return;
  tg.BackButton.hide();
  tg.BackButton.offClick();
}

// Вибрация
export function vibrate(style = 'light') {
  if (!tg) return;
  
  const styles = {
    light: 'impact',
    medium: 'notification',
    heavy: 'heavy'
  };

  tg.HapticFeedback.impactOccurred(styles[style] || 'light');
}

// Открыть ссылку
export function openLink(url, options = {}) {
  if (!tg) {
    window.open(url, '_blank');
    return;
  }

  tg.openLink(url, options);
}

// Открыть Telegram ссылку
export function openTelegramLink(url) {
  if (!tg) {
    window.open(url, '_blank');
    return;
  }

  tg.openTelegramLink(url);
}

// Показать всплывающее окно
export function showPopup(message, buttons = []) {
  if (!tg) {
    alert(message);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    tg.showPopup({
      message,
      buttons: buttons.length > 0 ? buttons : [{ type: 'ok' }]
    }, (buttonId) => {
      resolve(buttonId);
    });
  });
}

// Показать уведомление
export function showAlert(message) {
  if (!tg) {
    alert(message);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    tg.showAlert(message, resolve);
  });
}

// Показать подтверждение
export function showConfirm(message) {
  if (!tg) {
    return Promise.resolve(confirm(message));
  }

  return new Promise((resolve) => {
    tg.showConfirm(message, resolve);
  });
}

// Закрыть приложение
export function closeApp() {
  if (!tg) {
    window.close();
    return;
  }

  tg.close();
}

// Проверка запуска в Telegram
export function isRunningInTelegram() {
  return !!window.Telegram?.WebApp;
}

// Получить высоту viewport
export function getViewportHeight() {
  if (!tg) return window.innerHeight;
  return tg.viewportHeight;
}

// Установить цвет заголовка
export function setHeaderColor(color) {
  if (!tg) return;
  tg.setHeaderColor(color);
}

// Установить цвет фона
export function setBackgroundColor(color) {
  if (!tg) return;
  tg.setBackgroundColor(color);
}

export default tg;
