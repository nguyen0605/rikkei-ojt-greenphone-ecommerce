import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types/api';

// In production the nginx container proxies /api → backend; in dev Vite proxies too.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Access Token lưu trực tiếp trên RAM (In-Memory).
 * Tuyệt đối không lưu vào localStorage hay sessionStorage để phòng tránh tấn công XSS.
 */
let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

/**
 * Xóa sạch toàn bộ dữ liệu lưu trữ phía client của GreenPhone (Zero-Trace Logout)
 * Giữ lại duy nhất email ghi nhớ nếu người dùng có chọn ghi nhớ.
 */
export function clearClientStorage(): void {
  setAccessToken(null);
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
  withCredentials: true, // BẮT BUỘC để trình duyệt tự gửi kèm HttpOnly Cookie
});

// Request interceptor: attach token từ RAM
api.interceptors.request.use((config) => {
  const token = inMemoryAccessToken;
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

// Biến giữ promise refresh đang thực thi để tránh gọi trùng lặp song song
let refreshPromise: Promise<string | null> | null = null;

// Response interceptor: Silent Refresh on 401 & error unwrap & blocked account handling
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const responseData = error.response?.data;
    const backendMessage = responseData?.message || '';
    const errorCode = responseData?.code || responseData?.errorCode || '';
    const url = originalRequest?.url || '';

    // 1. Kiểm tra tài khoản bị Admin khóa tức thì (HTTP 403 Forbidden hoặc code ACCOUNT_BLOCKED)
    const isExplicitlyBlocked =
      errorCode === 'ACCOUNT_BLOCKED' ||
      (status === 403 &&
        (backendMessage.toLowerCase().includes('khóa') ||
          backendMessage.toLowerCase().includes('không hoạt động') ||
          backendMessage.toUpperCase().includes('BLOCKED') ||
          backendMessage.toUpperCase().includes('LOCKED'))) ||
      (status === 401 &&
        (backendMessage.toLowerCase().includes('khóa') ||
          backendMessage.toUpperCase().includes('BLOCKED')));

    if (isExplicitlyBlocked) {
      setAccessToken(null);
      clearClientStorage();
      if (typeof window !== 'undefined') {
        const reason =
          responseData?.reason ||
          'Phát hiện hành vi vi phạm chính sách và điều khoản bảo mật của GreenPhone.';
        sessionStorage.setItem(
          'greenphone.blocked_message',
          `Tài khoản của bạn đã bị khóa do: ${reason}. Vui lòng kiểm tra email để biết hướng dẫn chi tiết hoặc liên hệ Hotline 1900 1234.`
        );
        // Nếu không phải đang ở trang đăng nhập, phát sự kiện mở Modal khóa màn hình cố định (Bước 2)
        if (window.location.pathname !== '/dang-nhap') {
          window.dispatchEvent(
            new CustomEvent('greenphone:account-blocked', {
              detail: {
                code: 'ACCOUNT_BLOCKED',
                message: backendMessage || 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.',
                reason: reason,
                supportEmail: responseData?.supportEmail || 'hotro@greenphone.com',
                supportHotline: responseData?.supportHotline || '1900 1234',
              },
            })
          );
        }
      }
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/register') ||
      url.includes('/auth/verify-otp') ||
      url.includes('/auth/reset-password');

    // 2. Tự động gọi /refresh khi Access Token hết hạn (lỗi 401)
    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post<ApiResponse<{ token: string; refreshToken?: string }>>(
              `${BASE_URL}/auth/refresh`,
              {},
              { withCredentials: true }
            )
            .then((res) => {
              const newToken =
                res.data?.data?.token ||
                (res.data as any)?.token ||
                (res.data as any)?.accessToken;
              if (newToken) {
                setAccessToken(newToken);
                return newToken;
              }
              return null;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;
        if (newToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = 'Bearer ' + newToken;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        setAccessToken(null);
        clearClientStorage();
        if (typeof window !== 'undefined' && window.location.pathname !== '/dang-nhap') {
          window.location.href = '/dang-nhap';
        }
        return Promise.reject(refreshErr);
      }
    }

    // 3. Fallback cho 401 không thể refresh
    if (status === 401 && !isAuthEndpoint) {
      setAccessToken(null);
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
