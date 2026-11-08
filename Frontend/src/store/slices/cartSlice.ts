import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, AppliedVoucher, Product } from '@/types';
import type {
  CartDTO,
  CartItemDTO,
  CartItemRequest,
  CartSyncRequest,
  PhoneDetailDTO,
} from '@/types/api';
import { cartService, phoneService } from '@/services';
import { clearGuestCart } from '@/store/guestCartStorage';

export interface CartState {
  items: CartItem[];
  appliedVoucher: AppliedVoucher | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: CartState = {
  items: [],
  appliedVoucher: null,
  status: 'idle',
  error: null,
};

const supportedBrands = ['apple', 'samsung', 'xiaomi', 'oppo', 'realme', 'vivo'] as const;

function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const errObj = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    if (errObj.response?.data?.message) {
      return errObj.response.data.message;
    }
    if (errObj.message) {
      return errObj.message;
    }
  }
  return fallback;
}

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
    status: 'succeeded',
    error: null,
  };
}

async function fetchCartState(): Promise<CartState> {
  return mapCart(await cartService.get());
}

/**
 * BE2-01: Sync and merge client guest cart with user database cart.
 * Clears local guest cart strictly after server confirms merge success.
 */
export const syncCart = createAsyncThunk<
  CartState,
  CartItemRequest[] | CartSyncRequest,
  { rejectValue: string }
>('cart/sync', async (payload, thunkAPI) => {
  try {
    const getAuth = () =>
      (thunkAPI.getState() as {
        auth?: { user?: { id: number } | null; token?: string | null };
      }).auth;
    const auth = getAuth();
    if (!auth?.token) {
      return thunkAPI.rejectWithValue('Chưa đăng nhập');
    }

    const request: CartSyncRequest = Array.isArray(payload)
      ? { items: payload }
      : payload;

    const res = await cartService.sync(request);
    const mapped = await mapCart(res);

    if (
      getAuth()?.user?.id !== auth?.user?.id ||
      getAuth()?.token !== auth?.token
    ) {
      return thunkAPI.rejectWithValue('Phiên đăng nhập đã thay đổi');
    }

    clearGuestCart();
    return mapped;
  } catch (error: unknown) {
    return thunkAPI.rejectWithValue(
      extractErrorMessage(error, 'Không thể đồng bộ giỏ hàng'),
    );
  }
});

/**
 * Fetch authenticated user's remote shopping cart.
 */
export const fetchCart = createAsyncThunk<
  CartState,
  void,
  { rejectValue: string }
>('cart/fetch', async (_, thunkAPI) => {
  try {
    const getAuth = () =>
      (thunkAPI.getState() as {
        auth?: { user?: { id: number } | null; token?: string | null };
      }).auth;
    const auth = getAuth();
    const cart = await fetchCartState();
    if (
      getAuth()?.user?.id !== auth?.user?.id ||
      getAuth()?.token !== auth?.token
    ) {
      return thunkAPI.rejectWithValue('Cart session changed');
    }
    return cart;
  } catch (error: unknown) {
    return thunkAPI.rejectWithValue(
      extractErrorMessage(error, 'Không thể tải giỏ hàng'),
    );
  }
});

// Alias for backward compatibility
export const loadCart = fetchCart;

/**
 * Add an item to backend cart when authenticated.
 */
export const addCartItem = createAsyncThunk<
  CartState,
  { phoneVariantId: number; quantity: number },
  { rejectValue: string }
>('cart/addItem', async (data, thunkAPI) => {
  try {
    await cartService.addItem(data);
    return await fetchCartState();
  } catch (error: unknown) {
    return thunkAPI.rejectWithValue(
      extractErrorMessage(error, 'Không thể thêm sản phẩm vào giỏ hàng'),
    );
  }
});

export const addToCartAsync = addCartItem;

/**
 * Update quantity of a cart item.
 */
export const updateCartItem = createAsyncThunk<
  CartState,
  { id: string; quantity: number },
  { rejectValue: string }
>('cart/updateItem', async (data, thunkAPI) => {
  const state = thunkAPI.getState() as {
    auth?: { isAuthenticated: boolean };
    cart: CartState;
  };
  if (!state.auth?.isAuthenticated || !Number.isInteger(Number(data.id))) {
    const items = state.cart.items.map((i) =>
      i.id === data.id ? { ...i, quantity: Math.max(1, data.quantity) } : i,
    );
    return {
      items,
      appliedVoucher: state.cart.appliedVoucher,
      status: 'succeeded',
      error: null,
    };
  }
  try {
    await cartService.updateItem(Number(data.id), data.quantity);
    return await fetchCartState();
  } catch (error: unknown) {
    return thunkAPI.rejectWithValue(
      extractErrorMessage(error, 'Không thể cập nhật số lượng'),
    );
  }
});

export const updateQuantityAsync = updateCartItem;

/**
 * Remove an item from cart.
 */
export const removeCartItem = createAsyncThunk<
  CartState,
  string,
  { rejectValue: string }
>('cart/removeItem', async (id, thunkAPI) => {
  const state = thunkAPI.getState() as {
    auth?: { isAuthenticated: boolean };
    cart: CartState;
  };
  if (!state.auth?.isAuthenticated || !Number.isInteger(Number(id))) {
    const items = state.cart.items.filter((i) => i.id !== id);
    return {
      items,
      appliedVoucher: state.cart.appliedVoucher,
      status: 'succeeded',
      error: null,
    };
  }
  try {
    await cartService.removeItem(Number(id));
    return await fetchCartState();
  } catch (error: unknown) {
    return thunkAPI.rejectWithValue(
      extractErrorMessage(error, 'Không thể xóa sản phẩm'),
    );
  }
});

export const removeItemAsync = removeCartItem;

/**
 * Clear user cart on server when authenticated.
 */
export const clearCartRemote = createAsyncThunk<
  CartState,
  void,
  { rejectValue: string }
>('cart/clearRemote', async (_, thunkAPI) => {
  const state = thunkAPI.getState() as { auth?: { isAuthenticated: boolean } };
  if (!state.auth?.isAuthenticated) {
    return initialState;
  }
  try {
    await cartService.clear();
    return initialState;
  } catch (error: unknown) {
    return thunkAPI.rejectWithValue(
      extractErrorMessage(error, 'Không thể xóa toàn bộ giỏ hàng'),
    );
  }
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
      state.status = 'idle';
      state.error = null;
    },

    applyVoucher: (state, action: PayloadAction<AppliedVoucher>) => {
      state.appliedVoucher = action.payload;
    },

    removeVoucher: (state) => {
      state.appliedVoucher = null;
    },
  },
  extraReducers: (builder) => {
    const setPending = (state: CartState) => {
      state.status = 'loading';
      state.error = null;
    };

    const setFulfilled = (
      state: CartState,
      action: PayloadAction<CartState>,
    ) => {
      state.status = 'succeeded';
      state.items = action.payload.items;
      state.appliedVoucher = action.payload.appliedVoucher;
      state.error = null;
    };

    const setRejected = (
      state: CartState,
      action: { payload?: unknown; error?: { message?: string } },
    ) => {
      state.status = 'failed';
      state.error =
        (typeof action.payload === 'string' && action.payload) ||
        action.error?.message ||
        'Lỗi thao tác giỏ hàng';
    };

    builder
      // fetchCart / loadCart
      .addCase(fetchCart.pending, setPending)
      .addCase(fetchCart.fulfilled, setFulfilled)
      .addCase(fetchCart.rejected, setRejected)
      // syncCart
      .addCase(syncCart.pending, setPending)
      .addCase(syncCart.fulfilled, setFulfilled)
      .addCase(syncCart.rejected, setRejected)
      // addCartItem
      .addCase(addCartItem.pending, setPending)
      .addCase(addCartItem.fulfilled, setFulfilled)
      .addCase(addCartItem.rejected, setRejected)
      // updateCartItem
      .addCase(updateCartItem.pending, setPending)
      .addCase(updateCartItem.fulfilled, setFulfilled)
      .addCase(updateCartItem.rejected, setRejected)
      // removeCartItem
      .addCase(removeCartItem.pending, setPending)
      .addCase(removeCartItem.fulfilled, setFulfilled)
      .addCase(removeCartItem.rejected, setRejected)
      // clearCartRemote
      .addCase(clearCartRemote.pending, setPending)
      .addCase(clearCartRemote.fulfilled, setFulfilled)
      .addCase(clearCartRemote.rejected, setRejected)
      // Reset on logout
      .addMatcher(
        (action) =>
          action.type === 'auth/logout' ||
          action.type === 'auth/logout/fulfilled',
        (state) => {
          state.items = [];
          state.appliedVoucher = null;
          state.status = 'idle';
          state.error = null;
          clearGuestCart();
        },
      );
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
