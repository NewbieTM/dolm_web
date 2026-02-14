import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Favorites from './pages/Favorites';
import { initTelegramApp, isRunningInTelegram } from './utils/telegram';

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('🚀 =================================');
    console.log('📱 App запускается...');
    console.log('🚀 =================================');
    
    try {
      const tg = initTelegramApp();
      console.log(tg ? '✅ Telegram SDK' : '⚠️  Browser mode');
      console.log('✅ App готов!');
      setIsReady(true);
    } catch (err) {
      console.error('❌ Error:', err);
      setIsReady(true);
    }
    
    console.log('🚀 =================================');
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/favorites" element={<Favorites />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
