import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import wishlistReducer, {
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  clearWishlist,
  rollbackWishlist,
  setWishlistItems,
  fetchWishlist,
  toggleWishlistAsync,
} from '../wishlistSlice';
import authReducer, { logout } from '../authSlice';
import { wishlistApi } from '@/api/wishlistApi';

vi.mock('@/api/wishlistApi', () => ({
  wishlistApi: {
    getWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    syncWishlist: vi.fn(),
  },
}));

describe('wishlistSlice', () => {
  const initialState = {
    items: [],
    loading: false,
    error: null,
    previousItems: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== Synchronous Reducer Tests =====
  describe('Synchronous Reducers', () => {
    it('should return initial state with empty items array', () => {
      expect(wishlistReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    it('should add item to wishlist with string payload', () => {
      const state = wishlistReducer(initialState, addToWishlist('phone-1'));
      expect(state.items).toHaveLength(1);
      expect(state.items[0].productId).toBe('phone-1');
      expect(state.items[0].addedAt).toBeDefined();
    });

    it('should add item with detailed metadata', () => {
      const state = wishlistReducer(
        initialState,
        addToWishlist({
          productId: '10',
          name: 'iPhone 16 Pro Max',
          price: 32990000,
          originalPrice: 34990000,
          brandName: 'Apple',
          imageUrl: 'https://example.com/img.png',
          inStock: true,
        })
      );
      expect(state.items).toHaveLength(1);
      expect(state.items[0].productId).toBe('10');
      expect(state.items[0].name).toBe('iPhone 16 Pro Max');
      expect(state.items[0].price).toBe(32990000);
      expect(state.items[0].brandName).toBe('Apple');
    });

    it('should not add duplicate item', () => {
      const state1 = wishlistReducer(initialState, addToWishlist('phone-1'));
      const state2 = wishlistReducer(state1, addToWishlist('phone-1'));
      expect(state2.items).toHaveLength(1);
    });

    it('should remove item from wishlist', () => {
      const state1 = wishlistReducer(initialState, addToWishlist('phone-1'));
      const state2 = wishlistReducer(state1, addToWishlist('phone-2'));
      const state3 = wishlistReducer(state2, removeFromWishlist('phone-1'));
      expect(state3.items).toHaveLength(1);
      expect(state3.items[0].productId).toBe('phone-2');
    });

    it('should toggle item in wishlist (add then remove)', () => {
      const state1 = wishlistReducer(initialState, toggleWishlist('phone-1'));
      expect(state1.items).toHaveLength(1);
      expect(state1.items[0].productId).toBe('phone-1');

      const state2 = wishlistReducer(state1, toggleWishlist('phone-1'));
      expect(state2.items).toHaveLength(0);
    });

    it('should clear wishlist and reset previousItems', () => {
      const state1 = wishlistReducer(initialState, addToWishlist('phone-1'));
      const state2 = wishlistReducer(state1, clearWishlist());
      expect(state2.items).toEqual([]);
      expect(state2.previousItems).toBeNull();
    });

    it('should rollback items to previous snapshot', () => {
      const previous = [{ productId: 'item-old', addedAt: '2026-01-01' }];
      const stateWithPrevious = {
        ...initialState,
        items: [{ productId: 'item-new', addedAt: '2026-01-02' }],
        previousItems: previous,
      };

      const rolledBack = wishlistReducer(stateWithPrevious, rollbackWishlist());
      expect(rolledBack.items).toEqual(previous);
      expect(rolledBack.previousItems).toBeNull();
    });

    it('should set items via setWishlistItems', () => {
      const newItems = [{ productId: '100', name: 'Galaxy S24', addedAt: '2026-01-01' }];
      const state = wishlistReducer(initialState, setWishlistItems(newItems));
      expect(state.items).toEqual(newItems);
    });

    it('should clear wishlist on logout action to prevent data leakage between accounts', () => {
      const stateWithItems = {
        ...initialState,
        items: [{ productId: '1', name: 'User 1 Phone', addedAt: '2026-01-01' }],
      };
      const stateAfterLogout = wishlistReducer(stateWithItems, logout());
      expect(stateAfterLogout.items).toEqual([]);
    });
  });

  // ===== Async Thunks & Authentication Protection Tests =====
  describe('Async Thunks and Authentication Protection', () => {
    function setupStore(preloadedAuth = { isAuthenticated: false, token: null as string | null }) {
      return configureStore({
        reducer: {
          auth: authReducer,
          wishlist: wishlistReducer,
        },
        preloadedState: {
          auth: {
            user: preloadedAuth.isAuthenticated ? ({ id: 1, email: 'user@test.com' } as any) : null,
            token: preloadedAuth.token,
            isAuthenticated: preloadedAuth.isAuthenticated,
            loading: false,
            error: null,
            errorCode: null,
            rememberedEmail: null,
          },
          wishlist: {
            items: [],
            loading: false,
            error: null,
            previousItems: null,
          },
        },
      });
    }

    it('khi khách chưa đăng nhập: toggleWishlistAsync bị reject và không gọi API server', async () => {
      const store = setupStore({ isAuthenticated: false, token: null });

      const result = await store.dispatch(
        toggleWishlistAsync({ productId: '5', name: 'Xiaomi 14 Ultra' })
      );

      expect(result.type).toBe('wishlist/toggleWishlistAsync/rejected');
      expect(result.payload).toBe('Vui lòng đăng nhập để lưu sản phẩm vào danh sách yêu thích');
      expect(wishlistApi.addToWishlist).not.toHaveBeenCalled();
      expect(store.getState().wishlist.items).toHaveLength(0);
    });

    it('khi khách chưa đăng nhập: fetchWishlist trả về mảng rỗng [] và không gọi server', async () => {
      const store = setupStore({ isAuthenticated: false, token: null });

      await store.dispatch(fetchWishlist());

      expect(wishlistApi.getWishlist).not.toHaveBeenCalled();
      expect(store.getState().wishlist.items).toEqual([]);
    });

    it('khi người dùng đã đăng nhập: gọi API server để thêm yêu thích', async () => {
      vi.mocked(wishlistApi.addToWishlist).mockResolvedValueOnce(undefined);
      const store = setupStore({ isAuthenticated: true, token: 'mock-jwt-token' });

      const promise = store.dispatch(
        toggleWishlistAsync({ productId: '7', name: 'iPhone 15 Pro' })
      );

      // Optimistic update
      expect(store.getState().wishlist.items).toHaveLength(1);

      await promise;

      expect(wishlistApi.addToWishlist).toHaveBeenCalledWith('7');
      expect(store.getState().wishlist.items).toHaveLength(1);
      expect(store.getState().wishlist.error).toBeNull();
    });

    it('khi server API gặp lỗi: tự động rollback trạng thái về mảng rỗng', async () => {
      vi.mocked(wishlistApi.addToWishlist).mockRejectedValueOnce(new Error('Network error 500'));
      const store = setupStore({ isAuthenticated: true, token: 'mock-jwt-token' });

      expect(store.getState().wishlist.items).toHaveLength(0);

      const promise = store.dispatch(
        toggleWishlistAsync({ productId: '99', name: 'Faulty Product' })
      );

      // Optimistic update
      expect(store.getState().wishlist.items).toHaveLength(1);

      await promise;

      // Rollback về trạng thái ban đầu
      expect(store.getState().wishlist.items).toHaveLength(0);
      expect(store.getState().wishlist.previousItems).toBeNull();
      expect(store.getState().wishlist.error).toContain('Network error 500');
    });

    it('khi đã đăng nhập: fetchWishlist tải danh sách từ server', async () => {
      vi.mocked(wishlistApi.getWishlist).mockResolvedValueOnce([
        { phoneId: 1, name: 'Samsung Galaxy S24', price: 20000000 },
        { phoneId: 2, name: 'iPhone 16', price: 25000000 },
      ]);
      const store = setupStore({ isAuthenticated: true, token: 'valid-token' });

      await store.dispatch(fetchWishlist());

      expect(wishlistApi.getWishlist).toHaveBeenCalledTimes(1);
      expect(store.getState().wishlist.items).toHaveLength(2);
      expect(store.getState().wishlist.items[0].productId).toBe('1');
      expect(store.getState().wishlist.items[1].name).toBe('iPhone 16');
    });

    it('khi đăng xuất (logout): danh sách yêu thích tự động được xóa sạch về mảng rỗng', () => {
      const store = setupStore({ isAuthenticated: true, token: 'valid-token' });
      store.dispatch(addToWishlist({ productId: '10', name: 'User Phone' }));
      expect(store.getState().wishlist.items).toHaveLength(1);

      store.dispatch(logout());

      expect(store.getState().wishlist.items).toEqual([]);
      expect(store.getState().wishlist.previousItems).toBeNull();
    });
  });
});
