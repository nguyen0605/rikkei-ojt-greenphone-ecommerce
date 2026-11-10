import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { message } from 'antd';
import wishlistReducer, {
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  setWishlist,
  syncLocalToServer,
  fetchWishlist,
  toggleWishlistAsync,
  syncWishlistWithServer,
  selectWishlistCount,
  selectIsInWishlist,
  selectWishlistItems,
  type WishlistItem,
} from '../wishlistSlice';
import { wishlistApi } from '@/api/wishlistApi';

vi.mock('@/api/wishlistApi', () => ({
  wishlistApi: {
    getWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    syncWishlist: vi.fn(),
  },
  getWishlist: vi.fn(),
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
  syncWishlist: vi.fn(),
}));

vi.mock('antd', () => ({
  message: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('wishlistSlice', () => {
  const initialState = {
    items: [],
    loading: false,
    error: null,
  };

  const sampleItem1: WishlistItem = {
    phoneId: '101',
    productId: '101',
    name: 'iPhone 15 Pro Max',
    thumbnail: 'https://example.com/iphone15.jpg',
    price: 30000000,
    addedAt: '2026-01-01T00:00:00.000Z',
  };

  const sampleItem2: WishlistItem = {
    phoneId: '102',
    productId: '102',
    name: 'Samsung Galaxy S24 Ultra',
    thumbnail: 'https://example.com/s24.jpg',
    price: 28000000,
    addedAt: '2026-01-02T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Synchronous Reducers', () => {
    it('should return initial state', () => {
      expect(wishlistReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    it('should add item using string phoneId', () => {
      const state = wishlistReducer(initialState, addToWishlist('phone-1'));
      expect(state.items).toHaveLength(1);
      expect(state.items[0].productId).toBe('phone-1');
      expect(state.items[0].phoneId).toBe('phone-1');
    });

    it('should add item using full WishlistItem object', () => {
      const state = wishlistReducer(initialState, addToWishlist(sampleItem1));
      expect(state.items).toHaveLength(1);
      expect(state.items[0].phoneId).toBe('101');
      expect(state.items[0].name).toBe('iPhone 15 Pro Max');
      expect(state.items[0].price).toBe(30000000);
      expect(state.items[0].thumbnail).toBe('https://example.com/iphone15.jpg');
    });

    it('should not add duplicate items by phoneId', () => {
      const state1 = wishlistReducer(initialState, addToWishlist(sampleItem1));
      const state2 = wishlistReducer(state1, addToWishlist(sampleItem1));
      expect(state2.items).toHaveLength(1);
    });

    it('should remove item by phoneId', () => {
      const state1 = wishlistReducer(initialState, addToWishlist(sampleItem1));
      const state2 = wishlistReducer(state1, addToWishlist(sampleItem2));
      expect(state2.items).toHaveLength(2);

      const state3 = wishlistReducer(state2, removeFromWishlist('101'));
      expect(state3.items).toHaveLength(1);
      expect(state3.items[0].phoneId).toBe('102');
    });

    it('should handle removing non-existent item gracefully', () => {
      const state1 = wishlistReducer(initialState, addToWishlist(sampleItem1));
      const state2 = wishlistReducer(state1, removeFromWishlist('999'));
      expect(state2.items).toHaveLength(1);
      expect(state2.items[0].phoneId).toBe('101');
    });

    it('should clear all items with clearWishlist', () => {
      const state1 = wishlistReducer(initialState, addToWishlist(sampleItem1));
      const state2 = wishlistReducer(state1, clearWishlist());
      expect(state2.items).toEqual([]);
    });

    it('should reset wishlist to empty when user logs out', () => {
      const state1 = wishlistReducer(initialState, addToWishlist(sampleItem1));
      const state2 = wishlistReducer(state1, { type: 'auth/logout' });
      expect(state2.items).toEqual([]);
    });

    it('should replace items with setWishlist', () => {
      const state = wishlistReducer(initialState, setWishlist([sampleItem1, sampleItem2]));
      expect(state.items).toHaveLength(2);
    });

    it('should merge local and server items with syncLocalToServer without duplicates', () => {
      const state1 = wishlistReducer(initialState, addToWishlist(sampleItem1));
      const state2 = wishlistReducer(state1, syncLocalToServer([sampleItem1, sampleItem2]));
      expect(state2.items).toHaveLength(2);
      expect(state2.items.map((i) => i.phoneId)).toContain('101');
      expect(state2.items.map((i) => i.phoneId)).toContain('102');
    });
  });

  describe('Optimistic UI & toggleWishlistAsync', () => {
    const setupStore = (auth: { isAuthenticated: boolean; token: string | null }, initialWishlist = [sampleItem1]) => {
      return configureStore({
        reducer: {
          wishlist: wishlistReducer,
          auth: () => auth,
        },
        preloadedState: {
          wishlist: {
            items: initialWishlist,
            loading: false,
            error: null,
          },
        },
      });
    };

    it('Guest User (Chưa đăng nhập): toggles locally without calling API', async () => {
      const store = setupStore({ isAuthenticated: false, token: null }, []);

      // Add item
      await store.dispatch(toggleWishlistAsync(sampleItem1));
      expect(wishlistApi.addToWishlist).not.toHaveBeenCalled();
      expect(wishlistApi.removeFromWishlist).not.toHaveBeenCalled();
      expect(selectWishlistCount(store.getState() as any)).toBe(1);
      expect(selectIsInWishlist('101')(store.getState() as any)).toBe(true);

      // Remove item by toggling again
      await store.dispatch(toggleWishlistAsync(sampleItem1));
      expect(selectWishlistCount(store.getState() as any)).toBe(0);
    });

    it('Authenticated User: Optimistic Add succeeds (< 50ms state update then API success)', async () => {
      vi.mocked(wishlistApi.addToWishlist).mockResolvedValueOnce({ phoneId: '102' });
      const store = setupStore({ isAuthenticated: true, token: 'mock-jwt-token' }, [sampleItem1]);

      const promise = store.dispatch(toggleWishlistAsync(sampleItem2));

      // Immediate state check (< 50ms)
      const pendingState = store.getState().wishlist;
      expect(pendingState.items).toHaveLength(2);
      expect(pendingState.items[1].phoneId).toBe('102');

      // Await API completion
      await promise;
      expect(wishlistApi.addToWishlist).toHaveBeenCalledWith('102');
      expect(store.getState().wishlist.items).toHaveLength(2);
      expect(store.getState().wishlist.previousItems).toBeUndefined();
    });

    it('Authenticated User: Optimistic Add fails -> rolls back to previous state and displays toast error', async () => {
      vi.mocked(wishlistApi.addToWishlist).mockRejectedValueOnce(new Error('Network connection error'));
      const store = setupStore({ isAuthenticated: true, token: 'mock-jwt-token' }, [sampleItem1]);

      const promise = store.dispatch(toggleWishlistAsync(sampleItem2));

      // Optimistic update
      expect(store.getState().wishlist.items).toHaveLength(2);

      // When API fails
      await promise;

      // State is rolled back to original 1 item
      const finalState = store.getState().wishlist;
      expect(finalState.items).toHaveLength(1);
      expect(finalState.items[0].phoneId).toBe('101');
      expect(finalState.error).toContain('Network connection error');
      expect(message.error).toHaveBeenCalled();
    });

    it('Authenticated User: Optimistic Remove succeeds', async () => {
      vi.mocked(wishlistApi.removeFromWishlist).mockResolvedValueOnce(undefined);
      const store = setupStore({ isAuthenticated: true, token: 'mock-jwt-token' }, [sampleItem1]);

      const promise = store.dispatch(toggleWishlistAsync(sampleItem1));

      // Immediate state update (item removed right away)
      expect(store.getState().wishlist.items).toHaveLength(0);

      await promise;
      expect(wishlistApi.removeFromWishlist).toHaveBeenCalledWith('101');
      expect(store.getState().wishlist.items).toHaveLength(0);
    });

    it('Authenticated User: Optimistic Remove fails -> rolls back to previous state and displays toast error', async () => {
      vi.mocked(wishlistApi.removeFromWishlist).mockRejectedValueOnce(new Error('Server 500 error'));
      const store = setupStore({ isAuthenticated: true, token: 'mock-jwt-token' }, [sampleItem1]);

      const promise = store.dispatch(toggleWishlistAsync(sampleItem1));

      // Immediately removed
      expect(store.getState().wishlist.items).toHaveLength(0);

      await promise;

      // Rollback
      expect(store.getState().wishlist.items).toHaveLength(1);
      expect(store.getState().wishlist.items[0].phoneId).toBe('101');
      expect(message.error).toHaveBeenCalled();
    });
  });

  describe('fetchWishlist Async Thunk', () => {
    it('returns local items if user has no token', async () => {
      const store = configureStore({
        reducer: {
          wishlist: wishlistReducer,
          auth: () => ({ isAuthenticated: false, token: null }),
        },
        preloadedState: {
          wishlist: { items: [sampleItem1], loading: false, error: null },
        },
      });

      await store.dispatch(fetchWishlist());
      expect(wishlistApi.getWishlist).not.toHaveBeenCalled();
      expect(store.getState().wishlist.items).toHaveLength(1);
    });

    it('fetches wishlist from server if user is logged in', async () => {
      vi.mocked(wishlistApi.getWishlist).mockResolvedValueOnce([
        { phoneId: '201', name: 'Xiaomi 14 Ultra', thumbnail: 'thumb.jpg', price: 21000000 },
      ]);

      const store = configureStore({
        reducer: {
          wishlist: wishlistReducer,
          auth: () => ({ isAuthenticated: true, token: 'valid-token' }),
        },
      });

      await store.dispatch(fetchWishlist());
      expect(wishlistApi.getWishlist).toHaveBeenCalled();
      expect(store.getState().wishlist.items).toHaveLength(1);
      expect(store.getState().wishlist.items[0].phoneId).toBe('201');
      expect(store.getState().wishlist.items[0].name).toBe('Xiaomi 14 Ultra');
    });
  });

  describe('syncWishlistWithServer Async Thunk', () => {
    it('syncs local items to server after login', async () => {
      vi.mocked(wishlistApi.syncWishlist).mockResolvedValueOnce([
        { phoneId: '101', name: 'iPhone 15 Pro Max', thumbnail: 'img1.jpg', price: 30000000 },
        { phoneId: '202', name: 'Server Stored Phone', thumbnail: 'img2.jpg', price: 15000000 },
      ]);

      const store = configureStore({
        reducer: {
          wishlist: wishlistReducer,
          auth: () => ({ isAuthenticated: true, token: 'valid-token' }),
        },
        preloadedState: {
          wishlist: { items: [sampleItem1], loading: false, error: null },
        },
      });

      await store.dispatch(syncWishlistWithServer());
      expect(wishlistApi.syncWishlist).toHaveBeenCalledWith([sampleItem1]);
      expect(store.getState().wishlist.items).toHaveLength(2);
      expect(store.getState().wishlist.items[1].phoneId).toBe('202');
    });
  });

  describe('Selectors', () => {
    it('correctly calculates count and checks item presence', () => {
      const mockState: any = {
        wishlist: {
          items: [sampleItem1, sampleItem2],
        },
      };

      expect(selectWishlistCount(mockState)).toBe(2);
      expect(selectIsInWishlist('101')(mockState)).toBe(true);
      expect(selectIsInWishlist('999')(mockState)).toBe(false);
      expect(selectWishlistItems(mockState)).toEqual([sampleItem1, sampleItem2]);
    });
  });
});

