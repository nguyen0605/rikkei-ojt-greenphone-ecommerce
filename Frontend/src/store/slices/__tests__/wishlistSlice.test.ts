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
  syncWishlistToServer,
} from '../wishlistSlice';
import authReducer from '../authSlice';
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
    it('should return initial state', () => {
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
      const stateAfterLogout = wishlistReducer(stateWithItems, { type: 'auth/logout' });
      expect(stateAfterLogout.items).toEqual([]);
    });
  });

  // ===== Async Thunks & Optimistic UI Tests =====
  describe('Async Thunks and Optimistic UI', () => {
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

    it('optimistically adds item in guest mode without calling API', async () => {
      const store = setupStore({ isAuthenticated: false, token: null });

      const promise = store.dispatch(
        toggleWishlistAsync({ productId: '5', name: 'Xiaomi 14 Ultra' })
      );

      // Optimistic check: immediately added in pending state (< 50ms)
      expect(store.getState().wishlist.items).toHaveLength(1);
      expect(store.getState().wishlist.items[0].productId).toBe('5');

      const result = await promise;
      expect(result.payload).toEqual({
        productId: '5',
        isLiked: true,
        item: expect.objectContaining({ productId: '5', name: 'Xiaomi 14 Ultra' }),
      });
      expect(wishlistApi.addToWishlist).not.toHaveBeenCalled();
      expect(store.getState().wishlist.items).toHaveLength(1);
      expect(store.getState().wishlist.previousItems).toBeNull();
    });

    it('optimistically removes item in guest mode', async () => {
      const store = setupStore({ isAuthenticated: false, token: null });
      store.dispatch(addToWishlist({ productId: '5', name: 'Xiaomi 14 Ultra' }));
      expect(store.getState().wishlist.items).toHaveLength(1);

      await store.dispatch(toggleWishlistAsync('5'));

      expect(store.getState().wishlist.items).toHaveLength(0);
      expect(wishlistApi.removeFromWishlist).not.toHaveBeenCalled();
    });

    it('calls server API when user is authenticated and succeeds', async () => {
      vi.mocked(wishlistApi.addToWishlist).mockResolvedValueOnce(undefined);
      const store = setupStore({ isAuthenticated: true, token: 'mock-jwt-token' });

      const promise = store.dispatch(
        toggleWishlistAsync({ productId: '7', name: 'iPhone 15 Pro' })
      );

      // Optimistic update verified immediately
      expect(store.getState().wishlist.items).toHaveLength(1);

      await promise;

      expect(wishlistApi.addToWishlist).toHaveBeenCalledWith('7');
      expect(store.getState().wishlist.items).toHaveLength(1);
      expect(store.getState().wishlist.previousItems).toBeNull();
      expect(store.getState().wishlist.error).toBeNull();
    });

    it('rolls back optimistic update when server API fails (Rollback UI)', async () => {
      vi.mocked(wishlistApi.addToWishlist).mockRejectedValueOnce(new Error('Network error 500'));
      const store = setupStore({ isAuthenticated: true, token: 'mock-jwt-token' });

      expect(store.getState().wishlist.items).toHaveLength(0);

      const promise = store.dispatch(
        toggleWishlistAsync({ productId: '99', name: 'Faulty Product' })
      );

      // Optimistic UI shows it added immediately
      expect(store.getState().wishlist.items).toHaveLength(1);

      // Await rejection
      await promise;

      // Rollback verified: items restored to empty list, error logged
      expect(store.getState().wishlist.items).toHaveLength(0);
      expect(store.getState().wishlist.previousItems).toBeNull();
      expect(store.getState().wishlist.error).toContain('Network error 500');
    });

    it('fetches server wishlist when authenticated', async () => {
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

    it('synchronizes local wishlist to server upon login', async () => {
      vi.mocked(wishlistApi.syncWishlist).mockResolvedValueOnce([
        { phoneId: 10, name: 'Phone 10' },
        { phoneId: 20, name: 'Phone 20' },
      ]);
      vi.mocked(wishlistApi.getWishlist).mockResolvedValueOnce([
        { phoneId: 10, name: 'Phone 10' },
        { phoneId: 20, name: 'Phone 20' },
      ]);

      const store = setupStore({ isAuthenticated: true, token: 'token-123' });
      store.dispatch(addToWishlist({ productId: '10', name: 'Phone 10' }));
      store.dispatch(addToWishlist({ productId: '20', name: 'Phone 20' }));

      await store.dispatch(syncWishlistToServer());

      expect(wishlistApi.syncWishlist).toHaveBeenCalledWith(['10', '20']);
      expect(wishlistApi.getWishlist).toHaveBeenCalledTimes(1);
      expect(store.getState().wishlist.items).toHaveLength(2);
    });
  });
});
