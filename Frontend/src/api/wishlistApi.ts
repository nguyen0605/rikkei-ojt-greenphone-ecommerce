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

export const wishlistApi = {
  /**
   * Lấy danh sách sản phẩm yêu thích từ server của người dùng đã xác thực
   */
  getWishlist: async (): Promise<WishlistApiItem[]> => {
    const data = await get<
      WishlistApiItem[] | { content: WishlistApiItem[] } | { items: WishlistApiItem[] }
    >('/wishlist');
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as any).content)) return (data as any).content;
    if (data && Array.isArray((data as any).items)) return (data as any).items;
    return [];
  },

  /**
   * Thêm sản phẩm vào danh sách yêu thích trên server
   */
  addToWishlist: async (phoneId: number | string): Promise<void> => {
    await post<void>(`/wishlist/${phoneId}`);
  },

  /**
   * Xóa sản phẩm khỏi danh sách yêu thích trên server
   */
  removeFromWishlist: async (phoneId: number | string): Promise<void> => {
    await del<void>(`/wishlist/${phoneId}`);
  },

  /**
   * Đồng bộ danh sách ID yêu thích từ client lên server
   */
  syncWishlist: async (phoneIds: (number | string)[]): Promise<WishlistApiItem[]> => {
    return await post<WishlistApiItem[]>('/wishlist/sync', { phoneIds });
  },
};

export default wishlistApi;
