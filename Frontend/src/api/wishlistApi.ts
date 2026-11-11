import { get, post, del } from '@/services/api';

export interface WishlistApiItem {
  id?: number;
  phoneId: number | string;
  name?: string;
  thumbnail?: string;
  imageUrl?: string;
  price?: number;
  originalPrice?: number;
  brandName?: string;
  inStock?: boolean;
  addedAt?: string;
}

function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem('greenphone.user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.id) return String(user.id);
    }
  } catch {
    /* ignore */
  }
  return 'guest';
}

function getFallbackStoreKey(): string {
  return `greenphone.user_wishlist_${getCurrentUserId()}`;
}

function readFallbackItems(): WishlistApiItem[] {
  try {
    const raw = localStorage.getItem(getFallbackStoreKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFallbackItems(items: WishlistApiItem[]): void {
  try {
    localStorage.setItem(getFallbackStoreKey(), JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function shouldFallback(error: any): boolean {
  if (!error) return true;
  const status = error.response?.status;
  // Fallback khi server chưa có route /wishlist (404, 405) hoặc quăng lỗi hệ thống (>=500) hoặc lỗi kết nối
  if (!status || status === 404 || status === 405 || status >= 500) {
    return true;
  }
  return false;
}

export const wishlistApi = {
  /**
   * Lấy danh sách sản phẩm yêu thích từ server
   */
  getWishlist: async (): Promise<WishlistApiItem[]> => {
    try {
      const data = await get<
        WishlistApiItem[] | { content: WishlistApiItem[] } | { items: WishlistApiItem[] }
      >('/wishlist');
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).content)) return (data as any).content;
      if (data && Array.isArray((data as any).items)) return (data as any).items;
      return [];
    } catch (error: any) {
      if (shouldFallback(error)) {
        return readFallbackItems();
      }
      throw error;
    }
  },

  /**
   * Thêm sản phẩm vào danh sách yêu thích trên server
   */
  addToWishlist: async (phoneId: number | string): Promise<void> => {
    try {
      await post<void>(`/wishlist/${phoneId}`);
    } catch (error: any) {
      if (shouldFallback(error)) {
        const items = readFallbackItems();
        if (!items.some((i) => String(i.phoneId) === String(phoneId))) {
          items.push({ phoneId, addedAt: new Date().toISOString() });
          writeFallbackItems(items);
        }
        return;
      }
      throw error;
    }
  },

  /**
   * Xóa sản phẩm khỏi danh sách yêu thích trên server
   */
  removeFromWishlist: async (phoneId: number | string): Promise<void> => {
    try {
      await del<void>(`/wishlist/${phoneId}`);
    } catch (error: any) {
      if (shouldFallback(error)) {
        const items = readFallbackItems().filter((i) => String(i.phoneId) !== String(phoneId));
        writeFallbackItems(items);
        return;
      }
      throw error;
    }
  },

  /**
   * Đồng bộ danh sách ID yêu thích từ client lên server sau khi đăng nhập
   */
  syncWishlist: async (phoneIds: (number | string)[]): Promise<WishlistApiItem[]> => {
    try {
      return await post<WishlistApiItem[]>('/wishlist/sync', { phoneIds });
    } catch (error: any) {
      if (shouldFallback(error)) {
        const items = readFallbackItems();
        phoneIds.forEach((id) => {
          if (!items.some((i) => String(i.phoneId) === String(id))) {
            items.push({ phoneId: id, addedAt: new Date().toISOString() });
          }
        });
        writeFallbackItems(items);
        return items;
      }
      throw error;
    }
  },
};

export default wishlistApi;
