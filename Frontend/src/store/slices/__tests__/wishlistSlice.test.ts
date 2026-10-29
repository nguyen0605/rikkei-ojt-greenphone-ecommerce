import { describe, it, expect } from 'vitest';
import wishlistReducer, {
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from '../wishlistSlice';

describe('wishlistSlice', () => {
  const initialState = {
    items: [],
  };

  it('should return initial state', () => {
    expect(wishlistReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('should add item to wishlist', () => {
    const state = wishlistReducer(initialState, addToWishlist('phone-1'));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].productId).toBe('phone-1');
    expect(state.items[0].addedAt).toBeDefined();
  });

  it('should not add duplicate item', () => {
    const state1 = wishlistReducer(initialState, addToWishlist('phone-1'));
    const state2 = wishlistReducer(state1, addToWishlist('phone-1'));
    expect(state2.items).toHaveLength(1);
  });

  it('should remove item from wishlist', () => {
    const state1 = wishlistReducer(initialState, addToWishlist('phone-1'));
    const state1b = wishlistReducer(state1, addToWishlist('phone-2'));
    const state2 = wishlistReducer(state1b, removeFromWishlist('phone-1'));
    expect(state2.items).toHaveLength(1);
    expect(state2.items[0].productId).toBe('phone-2');
  });

  it('should clear wishlist', () => {
    const state1 = wishlistReducer(initialState, addToWishlist('phone-1'));
    const state2 = wishlistReducer(state1, clearWishlist());
    expect(state2.items).toEqual([]);
  });

  it('should handle remove non-existent item gracefully', () => {
    const state = wishlistReducer(initialState, removeFromWishlist('nonexistent'));
    expect(state.items).toEqual([]);
  });
});
