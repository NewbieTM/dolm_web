import React from 'react';
import { vibrate } from '../utils/telegram';

const CategoryFilter = ({ categories, activeCategory, onCategoryChange }) => {
  const handleCategoryClick = (category) => {
    vibrate('light');
    onCategoryChange(category);
  };

  return (
    <div className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur-lg pb-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1">
        {/* Кнопка "Все" */}
        <button
          onClick={() => handleCategoryClick(null)}
          className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all duration-200 flex-shrink-0 ${
            activeCategory === null
              ? 'bg-accent text-white'
              : 'bg-dark-card text-gray-400 hover:bg-dark-hover'
          }`}
        >
          Все
        </button>

        {/* Категории */}
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all duration-200 flex-shrink-0 ${
              activeCategory === category
                ? 'bg-accent text-white'
                : 'bg-dark-card text-gray-400 hover:bg-dark-hover'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
