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
    const status = error.response?.status;
    const responseData = error.response?.data;
    const backendMessage = responseData?.message || '';
    const errorCode = responseData?.code || responseData?.errorCode || '';

    // Kiểm tra tài khoản bị Admin khóa tức thì (HTTP 403 Forbidden hoặc code ACCOUNT_BLOCKED)
    const isExplicitlyBlocked =
      errorCode === 'ACCOUNT_BLOCKED' ||
      (status === 403 &&
        (backendMessage.toLowerCase().includes('bị khóa') ||
          backendMessage.toUpperCase().includes('BLOCKED') ||
          backendMessage.toUpperCase().includes('LOCKED')));

    if (isExplicitlyBlocked) {
      clearClientStorage();
      if (typeof window !== 'undefined') {
        // Nếu không phải đang ở trang đăng nhập, phát sự kiện mở Modal khóa màn hình cố định (Bước 2)
        if (window.location.pathname !== '/dang-nhap') {
          window.dispatchEvent(
            new CustomEvent('greenphone:account-blocked', {
              detail: {
                code: 'ACCOUNT_BLOCKED',
                message: backendMessage || 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.',
                reason: responseData?.reason || 'Phát hiện hành vi vi phạm chính sách và điều khoản bảo mật của GreenPhone.',
                supportEmail: responseData?.supportEmail || 'hotro@greenphone.com',
                supportHotline: responseData?.supportHotline || '1900 1234',
              },
            })
          );
        }
      }
    } else if (status === 401) {
      // 401 Token hết hạn hoặc không hợp lệ -> xóa storage và điều hướng về trang đăng nhập
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
