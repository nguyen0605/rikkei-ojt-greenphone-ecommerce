import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { restoreSessionThunk } from '@/store/slices/authSlice';
import { getAccessToken } from '@/services/api';

/**
 * SessionHydrator: Tự động khôi phục Access Token lên RAM từ HttpOnly Cookie khi người dùng F5 / reload trang.
 * Giữ vững nguyên tắc: Access Token chỉ lưu trên RAM (In-Memory), không lưu vào localStorage.
 */
export default function SessionHydrator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    // Nếu chưa có Access Token trên RAM và có cờ session (hoặc lần đầu mở app), gọi refresh để lấy token
    if (!getAccessToken()) {
      const hasSession = typeof window !== 'undefined' && sessionStorage.getItem('greenphone.has_session') === 'true';
      if (hasSession || !isAuthenticated) {
        dispatch(restoreSessionThunk());
      }
    }
  }, [dispatch, isAuthenticated]);

  return null;
}
