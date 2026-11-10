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
 * Lấy danh sách sản phẩm yêu thích (Khách đăng nhập gọi API server, khách vãng lai dùng Redux/localStorage)
 */
export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth?: { isAuthenticated?: boolean; token?: string | null }; wishlist?: WishlistState };
    const isAuth = Boolean(state.auth?.isAuthenticated && state.auth?.token);

    if (!isAuth) {
      return state.wishlist?.items ?? [];
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
 * Thao tác bật/tắt yêu thích với cơ chế Optimistic UI (< 50ms):
 * - Cập nhật tức thì trên Redux state
 * - Nếu là khách vãng lai: Lưu vào localStorage qua Redux Persist
 * - Nếu đã đăng nhập: Gọi API server; nếu lỗi thì hoàn nguyên (rollback) lại trạng thái cũ
 */
export const toggleWishlistAsync = createAsyncThunk<
  { productId: string; isLiked: boolean; item?: WishlistItem },
  WishlistProductPayload,
  { state: { auth?: { isAuthenticated?: boolean; token?: string | null }; wishlist?: WishlistState } }
>(
  'wishlist/toggleWishlistAsync',
  async (payload, { getState, rejectWithValue }) => {
    const state = getState();
    const item = normalizeItem(payload);
    const productId = item.productId;

    // Xác định trạng thái trước khi dispatch pending
    const wasLiked = Boolean(state.wishlist?.previousItems?.some((i) => i.productId === productId));
    const isNowLiked = !wasLiked;

    const isAuth = Boolean(state.auth?.isAuthenticated && state.auth?.token);

    // 1. Khách vãng lai: Đã được lưu Optimistic vào Redux/localStorage
    if (!isAuth) {
      return { productId, isLiked: isNowLiked, item };
    }

    // 2. Khách hàng đã đăng nhập: Đồng bộ hai chiều với Server
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

/**
 * Đồng bộ danh sách yêu thích từ local lên server sau khi đăng nhập thành công
 */
export const syncWishlistToServer = createAsyncThunk<
  WishlistItem[],
  void,
  { state: { auth?: { isAuthenticated?: boolean; token?: string | null }; wishlist?: WishlistState } }
>(
  'wishlist/syncWishlistToServer',
  async (_, { getState }) => {
    const state = getState();
    const localItems = state.wishlist?.items ?? [];
    const isAuth = Boolean(state.auth?.isAuthenticated && state.auth?.token);

    if (!isAuth || localItems.length === 0) {
      return localItems;
    }

    const phoneIds = localItems.map((i) => i.productId).filter(Boolean);

    try {
      try {
        await wishlistApi.syncWishlist(phoneIds);
      } catch {
        // Fallback: Nếu backend chưa có endpoint /sync, gọi addToWishlist theo từng ID
        await Promise.allSettled(phoneIds.map((id) => wishlistApi.addToWishlist(id)));
      }
      const serverItems = await wishlistApi.getWishlist();
      return serverItems.length > 0 ? serverItems.map(mapApiItemToWishlistItem) : localItems;
    } catch {
      // Bảo toàn danh sách local nếu server tạm thời không phản hồi
      return localItems;
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

      // ===== syncWishlistToServer =====
      .addCase(syncWishlistToServer.fulfilled, (state, action) => {
        state.items = action.payload;
      })

      // ===== Tự động kích hoạt đồng bộ khi đăng nhập thành công =====
      .addCase(loginThunk.fulfilled, (state) => {
        // Redux Persist lưu sẵn local items, Hydrator sẽ thực hiện syncWishlistToServer
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
