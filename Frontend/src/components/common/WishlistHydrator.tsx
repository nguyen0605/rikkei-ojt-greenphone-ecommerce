import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchWishlist, clearWishlist } from '@/store/slices/wishlistSlice';

/**
 * Chỉ tải danh sách yêu thích từ máy chủ khi phiên đăng nhập hợp lệ.
 * Khi chưa đăng nhập hoặc đăng xuất, đảm bảo state wishlist luôn được giữ ở mảng rỗng [].
 */
export default function WishlistHydrator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, token } = useAppSelector((state) => state.auth);
  const items = useAppSelector((state) => state.wishlist?.items ?? []);
  const userId = user?.id;

  const prevAuthRef = useRef(false);
  const syncedUserRef = useRef<number | null>(null);

  useEffect(() => {
    prevAuthRef.current = isAuthenticated;

    if (isAuthenticated && userId !== undefined && token) {
      if (syncedUserRef.current === userId) return;
      syncedUserRef.current = userId;

      // Khi người dùng đăng nhập hợp lệ: tải danh sách từ máy chủ
      void dispatch(fetchWishlist());
    } else {
      syncedUserRef.current = null;
      // Khi không đăng nhập: đảm bảo state items của wishlist luôn ở trạng thái mảng rỗng []
      if (items.length > 0) {
        dispatch(clearWishlist());
      }
    }
  }, [isAuthenticated, userId, token, dispatch, items.length]);

  return null;
}
