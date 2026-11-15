import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { WishlistItem } from '@/types';
import { wishlistApi, type WishlistApiItem } from '@/api/wishlistApi';
import { loginThunk, verifyOTPThunk, logoutThunk, logout } from '@/store/slices/authSlice';

export type WishlistProductPayload =
  | string
  | {
      productId: string;
      phoneId?: number | string;
      name?: string;
      thumbnail?: string;
      imageUrl?: string;
      price?: number;
      originalPrice?: number;
      brandName?: string;
      inStock?: boolean;
    };

export interface WishlistState {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;
  previousItems: WishlistItem[] | null;
}

const initialState: WishlistState = {
  items: [],
  loading: false,
  error: null,
  previousItems: null,
};

function normalizeItem(payload: WishlistProductPayload): WishlistItem {
  if (typeof payload === 'string') {
    return {
      productId: payload,
      phoneId: Number.isInteger(Number(payload)) ? Number(payload) : undefined,
      addedAt: new Date().toISOString(),
      inStock: true,
    };
  }
  return {
    productId: String(payload.productId),
    phoneId: payload.phoneId || (Number.isInteger(Number(payload.productId)) ? Number(payload.productId) : undefined),
    name: payload.name,
    thumbnail: payload.thumbnail || payload.imageUrl,
    imageUrl: payload.imageUrl || payload.thumbnail,
    price: payload.price,
    originalPrice: payload.originalPrice,
    brandName: payload.brandName,
    inStock: payload.inStock ?? true,
    addedAt: new Date().toISOString(),
  };
}

function mapApiItemToWishlistItem(item: WishlistApiItem): WishlistItem {
  const productId = String(item.phoneId || item.id);
  return {
    productId,
    phoneId: item.phoneId || item.id,
    name: item.name,
    thumbnail: item.thumbnail || item.imageUrl,
    imageUrl: item.imageUrl || item.thumbnail,
    price: item.price,
    originalPrice: item.originalPrice,
    brandName: item.brandName,
    inStock: item.inStock ?? true,
    addedAt: item.addedAt || new Date().toISOString(),
  };
}

/**
 * Lấy danh sách sản phẩm yêu thích từ server (chỉ dành riêng cho người dùng đã đăng nhập)
 */
export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth?: { isAuthenticated?: boolean; token?: string | null }; wishlist?: WishlistState };
    const isAuth = Boolean(state.auth?.isAuthenticated && state.auth?.token);

    if (!isAuth) {
      return [];
    }

    try {
      const data = await wishlistApi.getWishlist();
      return data.map(mapApiItemToWishlistItem);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải danh sách yêu thích');
    }
  }
);

/**
 * Thao tác bật/tắt yêu thích với cơ chế Optimistic UI (< 50ms) dành cho người dùng đã đăng nhập
 */
export const toggleWishlistAsync = createAsyncThunk<
  { productId: string; isLiked: boolean; item?: WishlistItem },
  WishlistProductPayload,
  { state: { auth?: { isAuthenticated?: boolean; token?: string | null }; wishlist?: WishlistState } }
>(
  'wishlist/toggleWishlistAsync',
  async (payload, { getState, rejectWithValue }) => {
    const state = getState();
    const isAuth = Boolean(state.auth?.isAuthenticated && state.auth?.token);

    // Chặn tuyệt đối nếu chưa đăng nhập
    if (!isAuth) {
      return rejectWithValue('Vui lòng đăng nhập để lưu sản phẩm vào danh sách yêu thích');
    }

    const item = normalizeItem(payload);
    const productId = item.productId;

    // Xác định trạng thái trước khi dispatch pending
    const wasLiked = Boolean(state.wishlist?.previousItems?.some((i) => i.productId === productId));
    const isNowLiked = !wasLiked;

    try {
      if (isNowLiked) {
        await wishlistApi.addToWishlist(productId);
      } else {
        await wishlistApi.removeFromWishlist(productId);
      }
      return { productId, isLiked: isNowLiked, item };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể đồng bộ danh sách yêu thích với máy chủ');
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action: PayloadAction<WishlistProductPayload>) => {
      const item = normalizeItem(action.payload);
      const existing = state.items.find((i) => i.productId === item.productId);
      if (!existing) {
        state.items.push(item);
      }
    },
    removeFromWishlist: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    toggleWishlist: (state, action: PayloadAction<WishlistProductPayload>) => {
      const item = normalizeItem(action.payload);
      const index = state.items.findIndex((i) => i.productId === item.productId);
      if (index >= 0) {
        state.items.splice(index, 1);
      } else {
        state.items.push(item);
      }
    },
    clearWishlist: (state) => {
      state.items = [];
      state.previousItems = null;
    },
    rollbackWishlist: (state) => {
      if (state.previousItems !== null) {
        state.items = state.previousItems;
        state.previousItems = null;
      }
    },
    setWishlistItems: (state, action: PayloadAction<WishlistItem[]>) => {
      state.items = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // ===== toggleWishlistAsync (Optimistic UI) =====
      .addCase(toggleWishlistAsync.pending, (state, action) => {
        const item = normalizeItem(action.meta.arg);
        // Lưu snapshot để rollback nếu API gặp lỗi
        state.previousItems = [...state.items];
        state.loading = true;
        state.error = null;

        // Optimistic Update: Thêm hoặc xóa ngay lập tức (< 50ms)
        const index = state.items.findIndex((i) => i.productId === item.productId);
        if (index >= 0) {
          state.items.splice(index, 1);
        } else {
          state.items.push(item);
        }
      })
      .addCase(toggleWishlistAsync.fulfilled, (state) => {
        state.loading = false;
        state.previousItems = null; // Thành công -> xóa snapshot rollback
      })
      .addCase(toggleWishlistAsync.rejected, (state, action) => {
        state.loading = false;
        // Rollback: Hoàn nguyên trạng thái cũ nếu API gặp lỗi
        if (state.previousItems !== null) {
          state.items = state.previousItems;
          state.previousItems = null;
        }
        state.error = (action.payload as string) || action.error.message || 'Lỗi khi cập nhật danh sách yêu thích';
      })

      // ===== fetchWishlist =====
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || null;
      })

      // ===== Tự động kích hoạt khi đăng nhập thành công =====
      .addCase(loginThunk.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(verifyOTPThunk.fulfilled, (state) => {
        state.error = null;
      })

      // ===== Dọn dẹp Redux Store khi Đăng xuất (Tránh rò rỉ dữ liệu sang tài khoản khác) =====
      .addCase(logoutThunk.fulfilled, (state) => {
        state.items = [];
        state.previousItems = null;
        state.error = null;
      })
      .addCase(logout, (state) => {
        state.items = [];
        state.previousItems = null;
        state.error = null;
      });
  },
});

export const {
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  clearWishlist,
  rollbackWishlist,
  setWishlistItems,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;
