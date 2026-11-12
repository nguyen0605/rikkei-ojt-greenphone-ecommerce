import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchWishlist, syncWishlistToServer } from '@/store/slices/wishlistSlice';

/**
 * Tự động đồng bộ danh sách yêu thích giữa Local (Khách vãng lai) và Server (Khách đăng nhập)
 */
export default function WishlistHydrator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, token } = useAppSelector((state) => state.auth);
  const items = useAppSelector((state) => state.wishlist?.items ?? []);
  const userId = user?.id;

  const prevAuthRef = useRef(false);
  const syncedUserRef = useRef<number | null>(null);

  useEffect(() => {
    const wasAuth = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (isAuthenticated && userId !== undefined && token) {
      if (syncedUserRef.current === userId) return;
      syncedUserRef.current = userId;

      // Khi người dùng vừa đăng nhập từ trạng thái khách vãng lai:
      if (!wasAuth && items.length > 0) {
        // Đồng bộ các sản phẩm đã thích từ local lên server
        void dispatch(syncWishlistToServer());
      } else {
        // Tải danh sách yêu thích mới nhất từ tài khoản server
        void dispatch(fetchWishlist());
      }
    } else if (wasAuth && !isAuthenticated) {
      syncedUserRef.current = null;
    }
  }, [isAuthenticated, userId, token, dispatch, items.length]);

  return null;
}

