import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types/api';

// In production the nginx container proxies /api → backend; in dev Vite proxies too.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Xóa sạch toàn bộ dữ liệu lưu trữ phía client của GreenPhone (Zero-Trace Logout)
 * Giữ lại duy nhất email ghi nhớ nếu người dùng có chọn ghi nhớ.
 */
export function clearClientStorage(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('greenphone.') || key.startsWith('persist:greenphone'))) {
        if (key !== 'greenphone.rememberedEmail') {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionStorage.clear();
  }
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
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
    // Logout on 401: Xóa sạch toàn bộ dấu vết PII và phiên trên client
    if (error.response?.status === 401) {
      clearClientStorage();
      if (typeof window !== 'undefined' && window.location.pathname !== '/dang-nhap') {
        window.location.href = '/dang-nhap';
      }
    }
    // Replace generic axios message with backend message if available
    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }
    if (error.response?.data?.errorCode) {
      error.errorCode = error.response.data.errorCode;
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
