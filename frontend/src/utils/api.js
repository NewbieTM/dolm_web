import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Создаём экземпляр axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000
});

// Обработка ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// ========== PRODUCTS ==========

// Получить все товары
export const getProducts = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.category) params.append('category', filters.category);
  if (filters.search) params.append('search', filters.search);
  if (filters.sort) params.append('sort', filters.sort);
  
  const response = await api.get(`/api/products?${params.toString()}`);
  return response.data;
};

// Получить товар по ID
export const getProduct = async (id) => {
  const response = await api.get(`/api/products/${id}`);
  return response.data;
};

// Зафиксировать просмотр товара
export const viewProduct = async (id) => {
  const response = await api.post(`/api/products/${id}/view`);
  return response.data;
};

// ========== CATEGORIES ==========

// Получить категории
export const getCategories = async () => {
  const response = await api.get('/api/categories');
  return response.data;
};

// ========== FAVORITES ==========

// Получить избранное
export const getFavorites = async (userId) => {
  const response = await api.get(`/api/users/${userId}/favorites`);
  return response.data;
};

// Добавить в избранное
export const addToFavorites = async (userId, productId) => {
  const response = await api.post(`/api/users/${userId}/favorites/${productId}`);
  return response.data;
};

// Удалить из избранного
export const removeFromFavorites = async (userId, productId) => {
  const response = await api.delete(`/api/users/${userId}/favorites/${productId}`);
  return response.data;
};

// ========== HISTORY ==========

// Получить историю
export const getHistory = async (userId) => {
  const response = await api.get(`/api/users/${userId}/history`);
  return response.data;
};

// Добавить в историю
export const addToHistory = async (userId, productId) => {
  const response = await api.post(`/api/users/${userId}/history/${productId}`);
  return response.data;
};

// ========== USER ==========

// Создать/обновить пользователя
export const upsertUser = async (userId, userData) => {
  const response = await api.post(`/api/users/${userId}`, userData);
  return response.data;
};

// Получить пользователя
export const getUser = async (userId) => {
  const response = await api.get(`/api/users/${userId}`);
  return response.data;
};

// ========== CONFIG ==========

// Получить конфигурацию
export const getConfig = async () => {
  const response = await api.get('/api/config');
  return response.data;
};

// ========== STATS ==========

// Получить статистику
export const getStats = async () => {
  const response = await api.get('/api/stats');
  return response.data;
};

export default api;
