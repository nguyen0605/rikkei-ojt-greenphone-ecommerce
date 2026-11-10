import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { message } from 'antd';
import type { RootState } from '@/store';
import { wishlistApi, type WishlistItemDTO } from '@/api/wishlistApi';
import { logout, logoutThunk } from '@/store/slices/authSlice';

export interface WishlistItem {
  phoneId: number | string;
  name: string;
  thumbnail: string;
  price: number;
  productId?: string;
  addedAt?: string;
}

export interface WishlistState {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;
  previousItems?: WishlistItem[];
}

const initialState: WishlistState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchWishlist = createAsyncThunk<WishlistItem[], void, { state: RootState }>(
  'wishlist/fetchWishlist',
  async (_, thunkAPI) => {
    const state = thunkAPI.getState();
    const token =
      state.auth?.token ||
      (typeof window !== 'undefined' ? localStorage.getItem('greenphone.token') : null);

    if (!token) {
      return state.wishlist.items;
    }

    const data = await wishlistApi.getWishlist();
    return (data || []).map((item: WishlistItemDTO) => ({
      phoneId: item.phoneId,
      productId: String(item.phoneId),
      name: item.name || '',
      thumbnail: item.thumbnail || '',
      price: Number(item.price || 0),
      addedAt: item.addedAt || new Date().toISOString(),
    }));
  }
);

export const toggleWishlistAsync = createAsyncThunk<
  { action: 'added' | 'removed' | 'guest'; phoneId: number | string },
  WishlistItem | { phoneId: number | string; name?: string; thumbnail?: string; price?: number },
  { state: RootState; rejectValue: string }
>(
  'wishlist/toggleWishlistAsync',
  async (rawItem, thunkAPI) => {
    const state = thunkAPI.getState();
    const token =
      state.auth?.token ||
      (typeof window !== 'undefined' ? localStorage.getItem('greenphone.token') : null);
    const isAuthenticated = !!(state.auth?.isAuthenticated && token);

    // Khách vãng lai: không gọi API, lưu trữ cục bộ vào Redux Persist (localStorage)
    if (!isAuthenticated) {
      return { action: 'guest', phoneId: rawItem.phoneId };
    }

    // Kiểm tra trạng thái trước khi bấm (sử dụng previousItems snapshot từ pending)
    const previousItems = state.wishlist.previousItems ?? state.wishlist.items;
    const wasInWishlist = previousItems.some(
      (i) =>
        String(i.phoneId) === String(rawItem.phoneId) ||
        String(i.productId) === String(rawItem.phoneId)
    );

    try {
      if (wasInWishlist) {
        await wishlistApi.removeFromWishlist(rawItem.phoneId);
        return { action: 'removed', phoneId: rawItem.phoneId };
      } else {
        await wishlistApi.addToWishlist(rawItem.phoneId);
        return { action: 'added', phoneId: rawItem.phoneId };
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message || err?.message || 'Không thể cập nhật danh sách yêu thích';
      return thunkAPI.rejectWithValue(errMsg);
    }
  }
);

export const syncWishlistWithServer = createAsyncThunk<
  WishlistItem[],
  void,
  { state: RootState }
>(
  'wishlist/syncWithServer',
  async (_, thunkAPI) => {
    const state = thunkAPI.getState();
    const localItems = state.wishlist.items;
    const token =
      state.auth?.token ||
      (typeof window !== 'undefined' ? localStorage.getItem('greenphone.token') : null);

    if (!token || localItems.length === 0) {
      if (token) {
        try {
          const serverItems = await wishlistApi.getWishlist();
          return (serverItems || []).map((item: WishlistItemDTO) => ({
            phoneId: item.phoneId,
            productId: String(item.phoneId),
            name: item.name || '',
            thumbnail: item.thumbnail || '',
            price: Number(item.price || 0),
            addedAt: item.addedAt || new Date().toISOString(),
          }));
        } catch {
          return localItems;
        }
      }
      return localItems;
    }

    try {
      const synced = await wishlistApi.syncWishlist(localItems);
      if (Array.isArray(synced)) {
        return synced.map((item: WishlistItemDTO) => ({
          phoneId: item.phoneId,
          productId: String(item.phoneId),
          name: item.name || '',
          thumbnail: item.thumbnail || '',
          price: Number(item.price || 0),
          addedAt: item.addedAt || new Date().toISOString(),
        }));
      }
    } catch {
      // Fallback: merge từng item chưa có trên server
      try {
        const serverItems = await wishlistApi.getWishlist();
        const serverPhoneIds = new Set(
          (serverItems || []).map((i: WishlistItemDTO) => String(i.phoneId))
        );

        for (const localItem of localItems) {
          if (!serverPhoneIds.has(String(localItem.phoneId))) {
            try {
              await wishlistApi.addToWishlist(localItem.phoneId);
            } catch {
              // Tiếp tục nếu một item lỗi
            }
          }
        }

        const finalItems = await wishlistApi.getWishlist();
        return (finalItems || []).map((item: WishlistItemDTO) => ({
          phoneId: item.phoneId,
          productId: String(item.phoneId),
          name: item.name || '',
          thumbnail: item.thumbnail || '',
          price: Number(item.price || 0),
          addedAt: item.addedAt || new Date().toISOString(),
        }));
      } catch {
        return localItems;
      }
    }

    return localItems;
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (
      state,
      action: PayloadAction<
        | string
        | number
        | WishlistItem
        | { phoneId: number | string; name?: string; thumbnail?: string; price?: number; productId?: string; addedAt?: string }
      >
    ) => {
      const payload = action.payload;
      const phoneId =
        typeof payload === 'string' || typeof payload === 'number'
          ? payload
          : payload.phoneId;

      const exists = state.items.some(
        (i) =>
          String(i.phoneId) === String(phoneId) ||
          String(i.productId) === String(phoneId)
      );

      if (!exists) {
        if (typeof payload === 'string' || typeof payload === 'number') {
          state.items.push({
            phoneId: payload,
            productId: String(payload),
            name: '',
            thumbnail: '',
            price: 0,
            addedAt: new Date().toISOString(),
          });
        } else {
          state.items.push({
            phoneId: payload.phoneId,
            productId: payload.productId ?? String(payload.phoneId),
            name: payload.name || '',
            thumbnail: payload.thumbnail || '',
            price: Number(payload.price || 0),
            addedAt: payload.addedAt || new Date().toISOString(),
          });
        }
      }
    },
    removeFromWishlist: (state, action: PayloadAction<string | number>) => {
      const target = String(action.payload);
      state.items = state.items.filter(
        (i) =>
          String(i.phoneId) !== target && String(i.productId) !== target
      );
    },
    clearWishlist: (state) => {
      state.items = [];
      state.error = null;
    },
    setWishlist: (state, action: PayloadAction<WishlistItem[]>) => {
      state.items = action.payload;
    },
    syncLocalToServer: (state, action: PayloadAction<WishlistItem[]>) => {
      const incoming = action.payload;
      const map = new Map<string, WishlistItem>();
      incoming.forEach((i) => map.set(String(i.phoneId), i));
      state.items.forEach((i) => {
        if (!map.has(String(i.phoneId))) {
          map.set(String(i.phoneId), i);
        }
      });
      state.items = Array.from(map.values());
    },
  },
  extraReducers: (builder) => {
    // Optimistic UI update in pending (< 50ms)
    builder
      .addCase(toggleWishlistAsync.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // Snapshot items trước khi thay đổi để hoàn nguyên nếu lỗi
        state.previousItems = [...state.items];

        const arg = action.meta.arg;
        const phoneIdStr = String(arg.phoneId);
        const index = state.items.findIndex(
          (i) =>
            String(i.phoneId) === phoneIdStr ||
            String(i.productId) === phoneIdStr
        );

        if (index >= 0) {
          state.items.splice(index, 1);
        } else {
          state.items.push({
            phoneId: arg.phoneId,
            productId: String(arg.phoneId),
            name: arg.name || '',
            thumbnail: arg.thumbnail || '',
            price: Number(arg.price || 0),
            addedAt: (arg as WishlistItem).addedAt || new Date().toISOString(),
          });
        }
      })
      .addCase(toggleWishlistAsync.fulfilled, (state) => {
        state.loading = false;
        state.previousItems = undefined;
      })
      .addCase(toggleWishlistAsync.rejected, (state, action) => {
        state.loading = false;
        // Hoàn nguyên trạng thái cũ nếu API gặp lỗi
        if (state.previousItems !== undefined) {
          state.items = state.previousItems;
          state.previousItems = undefined;
        }
        state.error =
          (action.payload as string) ||
          action.error.message ||
          'Không thể cập nhật danh sách yêu thích';

        // Hiển thị thông báo toast lỗi
        try {
          message.error(state.error);
        } catch {
          // Bỏ qua nếu môi trường test không hỗ trợ message
        }
      })
      // Fetch Wishlist
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
        state.error = action.error.message || 'Lỗi tải danh sách yêu thích';
      })
      // Sync Wishlist with Server
      .addCase(syncWishlistWithServer.pending, (state) => {
        state.loading = true;
      })
      .addCase(syncWishlistWithServer.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(syncWishlistWithServer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi đồng bộ danh sách yêu thích';
      })
      // Clear wishlist khi người dùng đăng xuất
      .addCase(logout, (state) => {
        state.items = [];
        state.error = null;
        state.previousItems = undefined;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.items = [];
        state.error = null;
        state.previousItems = undefined;
      });
  },
});

export const {
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  setWishlist,
  syncLocalToServer,
} = wishlistSlice.actions;

export const selectWishlistItems = (state: RootState) => state.wishlist.items;
export const selectWishlistCount = (state: RootState) => state.wishlist.items.length;
export const selectIsInWishlist =
  (phoneId: number | string) => (state: RootState) =>
    state.wishlist.items.some(
      (i) =>
        String(i.phoneId) === String(phoneId) ||
        String(i.productId) === String(phoneId)
    );

export default wishlistSlice.reducer;
