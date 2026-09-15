import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor: Attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch 401 Unauthorized errors and trigger logout cleanup
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      tokenStorage.removeToken();
      // Optional: Dispatch window event or allow AuthContext to handle redirect
    }
    return Promise.reject(error);
  }
);

export default api;
