import { useState, useEffect, Component } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { initTelegramApp, isRunningInTelegram } from './utils/telegram';

// ErrorBoundary для отлова ошибок в компонентах
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-red-900/20 border border-red-500 rounded-2xl p-6 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-500 mb-2">Ошибка компонента</h2>
            <p className="text-red-400 text-sm mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-500 text-white font-semibold py-3 rounded-xl"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Ленивая загрузка страниц с логами
console.log('📦 Импорт страниц...');

let Catalog, Product, Favorites;

try {
  console.log('  → Импорт Catalog...');
  Catalog = require('./pages/Catalog').default;
  console.log('  ✅ Catalog импортирован');
} catch (err) {
  console.error('  ❌ Ошибка импорта Catalog:', err);
  Catalog = () => <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold mb-2">Ошибка загрузки Catalog</h2>
      <p className="text-gray-400">{err.message}</p>
    </div>
  </div>;
}

try {
  console.log('  → Импорт Product...');
  Product = require('./pages/Product').default;
  console.log('  ✅ Product импортирован');
} catch (err) {
  console.error('  ❌ Ошибка импорта Product:', err);
  Product = () => <div className="min-h-screen bg-gray-900 text-white p-6">
    <h2>Ошибка загрузки страницы товара</h2>
  </div>;
}

try {
  console.log('  → Импорт Favorites...');
  Favorites = require('./pages/Favorites').default;
  console.log('  ✅ Favorites импортирован');
} catch (err) {
  console.error('  ❌ Ошибка импорта Favorites:', err);
  Favorites = () => <div className="min-h-screen bg-gray-900 text-white p-6">
    <h2>Ошибка загрузки избранного</h2>
  </div>;
}

console.log('✅ Все импорты завершены');

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('🚀 =================================');
    console.log('📱 App запускается...');
    console.log('🚀 =================================');
    console.log('🌐 URL:', window.location.href);
    console.log('🔗 API URL:', import.meta.env.VITE_API_URL);
    console.log('🖥️  User Agent:', navigator.userAgent);
    
    try {
      console.log('🔧 Инициализация Telegram SDK...');
      const tg = initTelegramApp();
      
      if (tg) {
        console.log('✅ Telegram SDK загружен');
      } else {
        console.log('⚠️  Telegram SDK недоступен (браузер)');
      }
      
      const inTelegram = isRunningInTelegram();
      console.log('📱 В Telegram:', inTelegram ? 'ДА' : 'НЕТ');
      
      console.log('✅ App готов!');
      setIsReady(true);
      
    } catch (err) {
      console.error('❌ Ошибка инициализации:', err);
      setIsReady(true);
    }
    
    console.log('🚀 =================================');
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  console.log('🔄 Рендер App - рендерим роутер...');

  return (
    <ErrorBoundary>
      <HashRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={
              <ErrorBoundary>
                <Catalog />
              </ErrorBoundary>
            } />
            <Route path="/product/:id" element={
              <ErrorBoundary>
                <Product />
              </ErrorBoundary>
            } />
            <Route path="/favorites" element={
              <ErrorBoundary>
                <Favorites />
              </ErrorBoundary>
            } />
          </Routes>
        </ErrorBoundary>
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
