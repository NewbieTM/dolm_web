import { useState, memo } from 'react';
import { vibrate } from '../utils/telegram';

const ProductCard = memo(({ product, isFavorite, onToggleFavorite, onNavigate }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = () => {
    vibrate('light');
    onNavigate.toProduct(product.id);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    vibrate('medium');
    onToggleFavorite(product.id);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-dark-card rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] fade-in"
    >
      {/* Изображение БЕЗ обрезки - object-contain показывает всё фото */}
      <div className="relative aspect-square bg-dark-hover flex items-center justify-center">
        {!imageLoaded && (
          <div className="absolute inset-0 skeleton" />
        )}
        <img
          src={product.photos[0]}
          alt={product.name}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
        
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-black/70"
        >
          <svg
            className={`w-5 h-5 transition-all duration-200 ${
              isFavorite 
                ? 'fill-red-500 stroke-red-500' 
                : 'fill-none stroke-white'
            }`}
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        <div className="absolute bottom-3 left-3">
          <span className="px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs font-medium text-white">
            {product.category}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-white font-semibold text-base line-clamp-2 mb-2">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <span className="text-accent text-lg font-bold">
            {product.price.toLocaleString('ru-RU')} ₽
          </span>
          
          {product.views > 0 && (
            <div className="flex items-center gap-1 text-gray-400 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{product.views}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Оптимизация: перерендериваем только если изменились важные пропсы
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.product.views === nextProps.product.views
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
