import { useState, useEffect, useRef } from 'react';
import { getProduct, getFavorites, addToFavorites, removeFromFavorites, getConfig } from '../utils/api';
import { getUserId, vibrate, showBackButton, hideBackButton, isRunningInTelegram, openTelegramLink } from '../utils/telegram';

const SCROLL_OFFSET = 40;

const Product = ({ productId, navigate }) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [managerUsername, setManagerUsername] = useState('');
  const userId = getUserId();

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startX, setStartX] = useState(0);

  const imageContainerRef = useRef(null);
  const scrollAppliedRef = useRef(false);

  useEffect(() => {
    loadProduct();
    loadConfig();

    if (isRunningInTelegram()) {
      showBackButton(() => navigate.back());
    }

    return () => {
      hideBackButton();
      scrollAppliedRef.current = false;
    };
  }, [productId]);

  useEffect(() => {
    if (product && !scrollAppliedRef.current) {
      setTimeout(() => {
        window.scrollTo({ top: SCROLL_OFFSET, behavior: 'instant' });
        scrollAppliedRef.current = true;
      }, 50);
    }
  }, [product]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const [productRes, favRes] = await Promise.all([
        getProduct(productId),
        getFavorites(userId).catch(() => ({ success: false, data: [] })),
      ]);

      if (productRes.success) setProduct(productRes.data);
      if (favRes.success) setIsFavorite(favRes.data.some(p => p.id === productId));
    } catch (err) {
      console.error('Error loading product:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await getConfig();
      if (res.success) setManagerUsername(res.data.managerUsername);
    } catch (err) {}
  };

  const handleFavoriteClick = async () => {
    vibrate('medium');
    try {
      if (isFavorite) {
        await removeFromFavorites(userId, productId);
        setIsFavorite(false);
      } else {
        await addToFavorites(userId, productId);
        setIsFavorite(true);
      }
    } catch (err) {}
  };

  const handleContactManager = () => {
    if (!managerUsername) return;
    vibrate('light');
    const preorderNote = product?.isPreorder ? `\n⏱ Товар на заказ — доставка 7–15 дней` : '';
    const message = `Привет! Интересует товар:\n${product?.name}\nЦена: ${product?.price?.toLocaleString('ru-RU')} ₽${preorderNote}`;
    openTelegramLink(`https://t.me/${managerUsername}?text=${encodeURIComponent(message)}`);
  };

  const handleTouchStart = (e) => { setStartX(e.touches[0].clientX); setIsDragging(true); setDragOffset(0); };
  const handleTouchMove  = (e) => { if (!isDragging) return; setDragOffset(e.touches[0].clientX - startX); };
  const handleTouchEnd   = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 50;
    if (dragOffset < -threshold && currentImageIndex < (product?.photos?.length ?? 1) - 1) setCurrentImageIndex(i => i + 1);
    else if (dragOffset > threshold && currentImageIndex > 0) setCurrentImageIndex(i => i - 1);
    setDragOffset(0);
  };

  const getImageTransform = (index) => {
    const base = (index - currentImageIndex) * 100;
    if (index === currentImageIndex && isDragging) {
      const dragPct = (dragOffset / (imageContainerRef.current?.offsetWidth || 1)) * 100;
      return `translateX(${base + dragPct}%)`;
    }
    return `translateX(${base}%)`;
  };

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-white text-xl">Товар не найден</div>
    </div>
  );

  const isButtonDisabled = !product || !managerUsername;

  return (
    <div className="min-h-screen bg-dark-bg pb-24">
      {!isRunningInTelegram() && (
        <button
          onClick={() => navigate.back()}
          className="fixed z-50 w-10 h-10 bg-dark-card/95 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-dark-hover"
          style={{ top: `${SCROLL_OFFSET + 16}px`, left: '16px' }}
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div className="max-w-5xl mx-auto">
        <div style={{ height: `${SCROLL_OFFSET}px` }} className="bg-dark-bg" />

        {/* Галерея */}
        <div className="relative">
          <div
            ref={imageContainerRef}
            className="relative w-full overflow-hidden bg-dark-card select-none"
            style={{ aspectRatio: '1/1', maxHeight: '600px', touchAction: 'pan-y' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {product.photos.map((photo, index) => (
              <div
                key={index}
                className="absolute inset-0 flex items-center justify-center bg-black"
                style={{
                  transform: getImageTransform(index),
                  transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  pointerEvents: index === currentImageIndex ? 'auto' : 'none',
                }}
              >
                <img src={photo} alt={`${product.name} ${index + 1}`} className="w-full h-full object-contain" draggable="false" />
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end">
            {product.photos.length > 1 && (
              <div className="flex gap-1.5">
                {product.photos.map((_, i) => (
                  <button key={i} onClick={() => setCurrentImageIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${i === currentImageIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/40'}`}
                  />
                ))}
              </div>
            )}
            <button onClick={handleFavoriteClick}
              className="ml-auto w-11 h-11 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70"
            >
              <svg className={`w-6 h-6 transition-all duration-200 ${isFavorite ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-white'}`}
                viewBox="0 0 24 24" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Инфо */}
        <div className="px-4 py-6">
          {product.isPreorder && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center gap-3">
              <span className="text-xl">📦</span>
              <div>
                <p className="text-orange-300 font-semibold text-sm">Товар на заказ</p>
                <p className="text-gray-400 text-xs mt-0.5">Доставим за 7–15 рабочих дней</p>
              </div>
            </div>
          )}

          <h1 className="text-2xl font-bold text-white mb-2">{product.name}</h1>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-bold text-accent">{product.price.toLocaleString('ru-RU')} ₽</span>
            <span className="px-3 py-1 bg-dark-card rounded-full text-sm text-gray-400">{product.category}</span>
          </div>

          {/* whitespace-pre-line — сохраняет переносы строк из Telegram */}
          {product.description && (
            <p className="text-gray-300 text-base leading-relaxed mb-6 whitespace-pre-line">
              {product.description}
            </p>
          )}

          <button
            onClick={handleContactManager}
            disabled={isButtonDisabled}
            className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-200 shadow-lg ${
              isButtonDisabled
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                : product.isPreorder
                  ? 'bg-orange-500 text-white hover:bg-orange-400 shadow-orange-500/20'
                  : 'bg-accent text-white hover:bg-accent/90 shadow-accent/20'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {product.isPreorder ? 'Оформить заказ' : 'Связаться с менеджером'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Product;
