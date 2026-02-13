import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

console.log('🌐 API URL:', API_URL);

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

// ===== PRODUCTS =====
export const getProducts = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.category) params.append('category', filters.category);
  if (filters.search) params.append('search', filters.search);
  if (filters.sort) params.append('sort', filters.sort);
  
  const response = await api.get(`/api/products?${params.toString()}`);
  return response.data;
};

export const getProduct = async (id) => {
  const response = await api.get(`/api/products/${id}`);
  return response.data;
};

export const viewProduct = async (id) => {
  const response = await api.post(`/api/products/${id}/view`);
  return response.data;
};

// ===== CATEGORIES =====
export const getCategories = async () => {
  const response = await api.get('/api/categories');
  return response.data;
};

// ===== FAVORITES =====
export const getFavorites = async (userId) => {
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

// ===== HISTORY =====
export const getHistory = async (userId) => {
  const response = await api.get(`/api/users/${userId}/history`);
  return response.data;
};

export const addToHistory = async (userId, productId) => {
  const response = await api.post(`/api/users/${userId}/history/${productId}`);
  return response.data;
};

export default api;
