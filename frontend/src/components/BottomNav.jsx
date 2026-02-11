import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { vibrate } from '../utils/telegram';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path) => {
    vibrate('light');
    navigate(path);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-card/95 backdrop-blur-lg border-t border-gray-800 z-50">
      <div className="flex items-center justify-around h-16 px-4">
        {/* Главная */}
        <button
          onClick={() => handleNavigate('/')}
          className={`flex flex-col items-center gap-1 transition-colors duration-200 ${
            isActive('/') ? 'text-accent' : 'text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-medium">Главная</span>
        </button>

        {/* Избранное */}
        <button
          onClick={() => handleNavigate('/favorites')}
          className={`flex flex-col items-center gap-1 transition-colors duration-200 ${
            isActive('/favorites') ? 'text-accent' : 'text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill={isActive('/favorites') ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-xs font-medium">Избранное</span>
        </button>

        {/* История */}
        <button
          onClick={() => handleNavigate('/history')}
          className={`flex flex-col items-center gap-1 transition-colors duration-200 ${
            isActive('/history') ? 'text-accent' : 'text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium">История</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
