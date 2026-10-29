import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types/api';

// In production the nginx container proxies /api → backend; in dev Vite proxies too.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('greenphone.token');
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

// Response interceptor: unwrap ApiResponse, extract error message from backend
api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Logout on 401
    if (error.response?.status === 401) {
      localStorage.removeItem('greenphone.token');
      localStorage.removeItem('greenphone.user');
      if (window.location.pathname !== '/dang-nhap') {
        window.location.href = '/';
      }
    }
    // Replace generic axios message with backend message if available
    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }
    return Promise.reject(error);
  },
);

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get<ApiResponse<T>>(url, config);
  return res.data.data;
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.post<ApiResponse<T>>(url, data, config);
  return res.data.data;
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.put<ApiResponse<T>>(url, data, config);
  return res.data.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.delete<ApiResponse<T>>(url, config);
  return res.data.data;
}

export default api;
