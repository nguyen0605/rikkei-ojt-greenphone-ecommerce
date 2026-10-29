import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, AppliedVoucher } from '@/types';
import type { Product } from '@/types';

interface CartState {
  items: CartItem[];
  appliedVoucher: AppliedVoucher | null;
}

const initialState: CartState = {
  items: [],
  appliedVoucher: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (
      state,
      action: PayloadAction<{
        product: Product;
        variantId?: number;
        quantity: number;
        color?: string;
        storage?: string;
      }>,
    ) => {
      const { product, variantId, quantity, color, storage } = action.payload;
      const existingItem = state.items.find(
        (item) =>
          item.productId === product.id &&
          item.selectedColor === color &&
          item.selectedStorage === storage,
      );

      if (existingItem) {
        existingItem.quantity += quantity;
        if (existingItem.variantId === undefined && variantId !== undefined) {
          existingItem.variantId = variantId;
        }
      } else {
        state.items.push({
          id: `${product.id}-${variantId ?? ''}-${color || ''}-${storage || ''}-${Date.now()}`,
          productId: product.id,
          variantId,
          product,
          quantity,
          selectedColor: color,
          selectedStorage: storage,
          addedAt: new Date().toISOString(),
        });
      }
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },

    updateQuantity: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>,
    ) => {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) {
        item.quantity = Math.max(1, action.payload.quantity);
      }
    },

    moveItem: (state, action: PayloadAction<{ id: string; dir: -1 | 1 }>) => {
      const idx = state.items.findIndex((i) => i.id === action.payload.id);
      const target = idx + action.payload.dir;
      if (idx < 0 || target < 0 || target >= state.items.length) return;
      const next = [...state.items];
      [next[idx], next[target]] = [next[target], next[idx]];
      state.items = next;
    },

    clearCart: (state) => {
      state.items = [];
      state.appliedVoucher = null;
    },

    applyVoucher: (state, action: PayloadAction<AppliedVoucher>) => {
      state.appliedVoucher = action.payload;
    },

    removeVoucher: (state) => {
      state.appliedVoucher = null;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  moveItem,
  clearCart,
  applyVoucher,
  removeVoucher,
} = cartSlice.actions;

export default cartSlice.reducer;
