import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, AppliedVoucher } from '@/types';
import type { Product } from '@/types';
import type { CartDTO, CartItemDTO, PhoneDetailDTO } from '@/types/api';
import { cartService, phoneService } from '@/services';

interface CartState {
  items: CartItem[];
  appliedVoucher: AppliedVoucher | null;
}

const initialState: CartState = {
  items: [],
  appliedVoucher: null,
};

const supportedBrands = ['apple', 'samsung', 'xiaomi', 'oppo', 'realme', 'vivo'] as const;

function toProduct(item: CartItemDTO, detail?: PhoneDetailDTO): Product {
  const image = item.imageUrl || detail?.mainImageUrl || detail?.images?.[0]?.imageUrl || '';
  const brandName = detail?.brandName?.toLowerCase() || 'apple';
  const brand = supportedBrands.includes(brandName as (typeof supportedBrands)[number])
    ? (brandName as Product['brand'])
    : 'apple';
  const price = Number(item.discountPrice ?? item.price ?? 0);

  return {
    id: String(item.phoneId),
    slug: item.phoneName.toLowerCase().replace(/\s+/g, '-'),
    name: item.phoneName,
    brand,
    category: 'smartphone',
    price,
    originalPrice: item.discountPrice ? Number(item.price) : undefined,
    rating: detail?.avgRating || 0,
    reviewCount: detail?.reviewCount || 0,
    sold: 0,
    images: [image],
    thumbnail: image,
    colors: item.color ? [{ id: String(item.phoneVariantId), name: item.color, hex: '#000' }] : [],
    storage: item.storage ? [{ id: String(item.phoneVariantId), capacity: item.storage }] : [],
    description: detail?.description || '',
    specifications: [],
    features: [],
    inStock: true,
  };
}

async function mapCart(dto: CartDTO): Promise<CartState> {
  const phoneIds = [...new Set(dto.items.map((item) => item.phoneId))];
  const details = await Promise.all(
    phoneIds.map(async (phoneId) => {
      try {
        return [phoneId, await phoneService.detail(phoneId)] as const;
      } catch {
        return [phoneId, undefined] as const;
      }
    }),
  );
  const detailByPhoneId = new Map<number, PhoneDetailDTO | undefined>(details);

  return {
    items: dto.items.map((item) => ({
      id: String(item.id),
      productId: String(item.phoneId),
      variantId: item.phoneVariantId,
      product: toProduct(item, detailByPhoneId.get(item.phoneId)),
      quantity: item.quantity,
      selectedColor: item.color,
      selectedStorage: item.storage,
      addedAt: new Date().toISOString(),
    })),
    appliedVoucher: null,
  };
}

async function fetchCartState(): Promise<CartState> {
  return mapCart(await cartService.get());
}

export const loadCart = createAsyncThunk('cart/load', fetchCartState);

export const addCartItem = createAsyncThunk(
  'cart/addItem',
  async (data: { phoneVariantId: number; quantity: number }) => {
    await cartService.addItem(data);
    return fetchCartState();
  },
);

export const updateCartItem = createAsyncThunk(
  'cart/updateItem',
  async (data: { id: string; quantity: number }, thunkAPI) => {
    const state = thunkAPI.getState() as { auth?: { isAuthenticated: boolean }; cart: CartState };
    if (!state.auth?.isAuthenticated || !Number.isInteger(Number(data.id))) {
      const items = state.cart.items.map((i) =>
        i.id === data.id ? { ...i, quantity: Math.max(1, data.quantity) } : i,
      );
      return { items, appliedVoucher: state.cart.appliedVoucher };
    }
    await cartService.updateItem(Number(data.id), data.quantity);
    return fetchCartState();
  },
);

export const removeCartItem = createAsyncThunk(
  'cart/removeItem',
  async (id: string, thunkAPI) => {
    const state = thunkAPI.getState() as { auth?: { isAuthenticated: boolean }; cart: CartState };
    if (!state.auth?.isAuthenticated || !Number.isInteger(Number(id))) {
      const items = state.cart.items.filter((i) => i.id !== id);
      return { items, appliedVoucher: state.cart.appliedVoucher };
    }
    await cartService.removeItem(Number(id));
    return fetchCartState();
  },
);

export const clearCartRemote = createAsyncThunk('cart/clearRemote', async (_, thunkAPI) => {
  const state = thunkAPI.getState() as { auth?: { isAuthenticated: boolean } };
  if (!state.auth?.isAuthenticated) {
    return initialState;
  }
  await cartService.clear();
  return initialState;
});

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
  extraReducers: (builder) => {
    const replaceCart = (state: CartState, action: { payload: CartState }) => {
      state.items = action.payload.items;
      state.appliedVoucher = action.payload.appliedVoucher;
    };

    builder
      .addCase(loadCart.fulfilled, replaceCart)
      .addCase(addCartItem.fulfilled, replaceCart)
      .addCase(updateCartItem.fulfilled, replaceCart)
      .addCase(removeCartItem.fulfilled, replaceCart)
      .addCase(clearCartRemote.fulfilled, replaceCart);
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
