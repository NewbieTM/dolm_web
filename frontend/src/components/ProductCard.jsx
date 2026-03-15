import { useState, memo } from 'react';
import { vibrate } from '../utils/telegram';

const ProductCard = memo(({ product, isFavorite, onToggleFavorite, onNavigate }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleCardClick = () => {
    vibrate('light');
    if (onNavigate) {
      onNavigate.toProduct(product.id);
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    vibrate('medium');
    if (onToggleFavorite) {
      onToggleFavorite(product.id);
    }
  };

  const photo = product.photos?.[0];

  return (
    <div
      onClick={handleCardClick}
      className="bg-dark-card rounded-2xl overflow-hidden cursor-pointer hover:bg-dark-hover transition-colors duration-200 active:scale-95 transform"
    >
      <div className="relative aspect-square bg-dark-hover">
        {/* Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 skeleton" />
        )}

        {photo && (
          <img
            src={photo}
            alt={product.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
        )}

        {/* Кнопка избранного */}
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

        {/* Бейджи внизу слева */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1">
          <span className="px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs font-medium text-white">
            {product.category}
          </span>
          {product.isPreorder && (
            <span className="px-3 py-1 bg-orange-500/80 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
              📦 На заказ
            </span>
          )}
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
          {product.isPreorder && (
            <span className="text-orange-400 text-xs font-medium">
              7–15 дней
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.product.isPreorder === nextProps.product.isPreorder
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
