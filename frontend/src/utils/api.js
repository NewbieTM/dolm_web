import axios from 'axios';
import { getCache, setCache, clearCache } from './cache';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// ========== PRODUCTS ==========

export const getProducts = async (filters = {}) => {
  // Создаем уникальный ключ кеша на основе фильтров
  const cacheKey = `products_${JSON.stringify(filters)}`;
  
  // Проверяем кеш
  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Загружаем с сервера
  const params = new URLSearchParams();
  
  if (filters.category) params.append('category', filters.category);
  if (filters.search) params.append('search', filters.search);
  if (filters.sort) params.append('sort', filters.sort);
  
  const response = await api.get(`/api/products?${params.toString()}`);
  
  // Сохраняем в кеш
  setCache(cacheKey, response.data);
  
  return response.data;
};

export const getProduct = async (id) => {
  const cacheKey = `product_${id}`;
  
  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  const response = await api.get(`/api/products/${id}`);
  setCache(cacheKey, response.data);
  
  return response.data;
};

export const viewProduct = async (id) => {
  const response = await api.post(`/api/products/${id}/view`);
  // Инвалидируем кеш товара после просмотра
  clearCache(`product_${id}`);
  return response.data;
};

// ========== CATEGORIES ==========

export const getCategories = async () => {
  const cacheKey = 'categories';
  
  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  const response = await api.get('/api/categories');
  setCache(cacheKey, response.data);
  
  return response.data;
};

// ========== FAVORITES ==========

export const getFavorites = async (userId) => {
  // Не кешируем избранное - оно меняется часто
  const response = await api.get(`/api/users/${userId}/favorites`);
  return response.data;
};

export const addToFavorites = async (userId, productId) => {
  const response = await api.post(`/api/users/${userId}/favorites/${productId}`);
  return response.data;
};

export const removeFromFavorites = async (userId, productId) => {
  const response = await api.delete(`/api/users/${userId}/favorites/${productId}`);
  return response.data;
};

// ========== HISTORY ==========

export const getHistory = async (userId) => {
  const response = await api.get(`/api/users/${userId}/history`);
  return response.data;
};

export const addToHistory = async (userId, productId) => {
  const response = await api.post(`/api/users/${userId}/history/${productId}`);
  return response.data;
};

// ========== USER ==========

export const upsertUser = async (userId, userData) => {
  const response = await api.post(`/api/users/${userId}`, userData);
  return response.data;
};

export const getUser = async (userId) => {
  const response = await api.get(`/api/users/${userId}`);
  return response.data;
};

// ========== CONFIG ==========

export const getConfig = async () => {
  const cacheKey = 'config';
  
  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  const response = await api.get('/api/config');
  setCache(cacheKey, response.data);
  
  return response.data;
};

// ========== STATS ==========

export const getStats = async () => {
  const response = await api.get('/api/stats');
  return response.data;
};

export default api;
