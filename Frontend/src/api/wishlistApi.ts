import { get, post, del } from '@/services/api';

export interface WishlistItemDTO {
  phoneId: number | string;
  name?: string;
  thumbnail?: string;
  price?: number;
  addedAt?: string;
  productId?: string;
}

export const getWishlist = async (): Promise<WishlistItemDTO[]> => {
  return get<WishlistItemDTO[]>('/wishlist');
};

export const addToWishlist = async (phoneId: number | string): Promise<WishlistItemDTO> => {
  return post<WishlistItemDTO>('/wishlist', { phoneId });
};

export const removeFromWishlist = async (phoneId: number | string): Promise<void> => {
  return del<void>(`/wishlist/${phoneId}`);
};

export const syncWishlist = async (
  items: (WishlistItemDTO | number | string)[]
): Promise<WishlistItemDTO[]> => {
  return post<WishlistItemDTO[]>('/wishlist/sync', { items });
};

export const wishlistApi = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  syncWishlist,
};

export default wishlistApi;

