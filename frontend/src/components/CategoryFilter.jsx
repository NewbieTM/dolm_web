import React from 'react';

const CategoryFilter = ({ categories, activeCategory, onCategoryChange }) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onCategoryChange('')}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          activeCategory === ''
            ? 'bg-accent text-white'
            : 'bg-dark-card text-gray-300 hover:bg-dark-hover'
        }`}
      >
        Все
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeCategory === category
              ? 'bg-accent text-white'
              : 'bg-dark-card text-gray-300 hover:bg-dark-hover'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
