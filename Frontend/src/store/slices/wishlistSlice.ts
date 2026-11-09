import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WishlistItem } from '@/types';

interface WishlistState {
  items: WishlistItem[];
}

const initialState: WishlistState = {
  items: [],
};

export type WishlistProductPayload =
  | string
  | {
      productId: string;
      name?: string;
      price?: number;
      originalPrice?: number;
      imageUrl?: string;
      brandName?: string;
      inStock?: boolean;
    };

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action: PayloadAction<WishlistProductPayload>) => {
      const payload =
        typeof action.payload === 'string'
          ? { productId: action.payload }
          : action.payload;
      const existing = state.items.find((i) => i.productId === payload.productId);
      if (!existing) {
        state.items.push({
          productId: payload.productId,
          addedAt: new Date().toISOString(),
          name: payload.name,
          price: payload.price,
          originalPrice: payload.originalPrice,
          imageUrl: payload.imageUrl,
          brandName: payload.brandName,
          inStock: payload.inStock ?? true,
        });
      }
    },
    removeFromWishlist: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    toggleWishlist: (state, action: PayloadAction<WishlistProductPayload>) => {
      const payload =
        typeof action.payload === 'string'
          ? { productId: action.payload }
          : action.payload;
      const index = state.items.findIndex((i) => i.productId === payload.productId);
      if (index >= 0) {
        state.items.splice(index, 1);
      } else {
        state.items.push({
          productId: payload.productId,
          addedAt: new Date().toISOString(),
          name: payload.name,
          price: payload.price,
          originalPrice: payload.originalPrice,
          imageUrl: payload.imageUrl,
          brandName: payload.brandName,
          inStock: payload.inStock ?? true,
        });
      }
    },
    clearWishlist: (state) => {
      state.items = [];
    },
  },
});

export const { addToWishlist, removeFromWishlist, toggleWishlist, clearWishlist } =
  wishlistSlice.actions;

export default wishlistSlice.reducer;
