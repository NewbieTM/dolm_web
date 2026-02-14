// Глобальное управление подсказкой "Привезем любой товар"
const TOOLTIP_INTERVAL = 20000; // 20 секунд
const TOOLTIP_DURATION = 3000;   // 3 секунды
const INITIAL_DELAY = 2000;      // 2 секунды при первом запуске

let lastTooltipTime = 0;
let isTooltipShowing = false;

// Инициализация при загрузке приложения
export function initTooltipTimer() {
  // Загружаем время последнего показа из localStorage
  const savedTime = localStorage.getItem('lastTooltipTime');
  if (savedTime) {
    lastTooltipTime = parseInt(savedTime, 10);
  } else {
    // Первый запуск - показываем через 2 секунды
    lastTooltipTime = Date.now() - TOOLTIP_INTERVAL + INITIAL_DELAY;
    localStorage.setItem('lastTooltipTime', lastTooltipTime.toString());
  }
}

// Проверяем нужно ли показать подсказку
export function shouldShowTooltip() {
  if (isTooltipShowing) return false;
  
  const now = Date.now();
  const timeSinceLastShow = now - lastTooltipTime;
  
  return timeSinceLastShow >= TOOLTIP_INTERVAL;
}

// Отмечаем что подсказка показана
export function markTooltipShown() {
  lastTooltipTime = Date.now();
  isTooltipShowing = true;
  localStorage.setItem('lastTooltipTime', lastTooltipTime.toString());
  
  // Скрываем через 3 секунды
  setTimeout(() => {
    isTooltipShowing = false;
  }, TOOLTIP_DURATION);
}

// Получаем оставшееся время до следующего показа (для отладки)
export function getTimeUntilNextShow() {
  const now = Date.now();
  const timeSinceLastShow = now - lastTooltipTime;
  const timeRemaining = TOOLTIP_INTERVAL - timeSinceLastShow;
  
  return Math.max(0, timeRemaining);
}

// Сброс таймера (если нужно)
export function resetTooltipTimer() {
  lastTooltipTime = 0;
  localStorage.removeItem('lastTooltipTime');
}
