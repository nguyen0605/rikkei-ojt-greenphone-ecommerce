import { describe, it, expect } from 'vitest';
import uiReducer, {
  toggleMobileMenu,
  closeMobileMenu,
  toggleCartDrawer,
  closeCartDrawer,
  toggleSearchModal,
  addRecentlyViewed,
} from '../uiSlice';
import type { RootState } from '@/store/rootReducer';

describe('uiSlice', () => {
  const initialState: Pick<RootState['ui'], 'isMobileMenuOpen' | 'isCartDrawerOpen' | 'isSearchModalOpen' | 'recentlyViewed'> = {
    isMobileMenuOpen: false,
    isCartDrawerOpen: false,
    isSearchModalOpen: false,
    recentlyViewed: [],
  };

  it('should return initial state', () => {
    expect(uiReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('should toggle mobile menu', () => {
    const state1 = uiReducer(initialState, toggleMobileMenu());
    expect(state1.isMobileMenuOpen).toBe(true);
    const state2 = uiReducer(state1, toggleMobileMenu());
    expect(state2.isMobileMenuOpen).toBe(false);
  });

  it('should close mobile menu', () => {
    const state1 = uiReducer(initialState, toggleMobileMenu());
    const state2 = uiReducer(state1, closeMobileMenu());
    expect(state2.isMobileMenuOpen).toBe(false);
  });

  it('should toggle cart drawer', () => {
    const state1 = uiReducer(initialState, toggleCartDrawer());
    expect(state1.isCartDrawerOpen).toBe(true);
    const state2 = uiReducer(state1, closeCartDrawer());
    expect(state2.isCartDrawerOpen).toBe(false);
  });

  it('should toggle search modal', () => {
    const state1 = uiReducer(initialState, toggleSearchModal());
    expect(state1.isSearchModalOpen).toBe(true);
    const state2 = uiReducer(state1, toggleSearchModal());
    expect(state2.isSearchModalOpen).toBe(false);
  });

  it('should add recently viewed and deduplicate', () => {
    const state1 = uiReducer(initialState, addRecentlyViewed('phone-1'));
    expect(state1.recentlyViewed).toEqual(['phone-1']);

    const state2 = uiReducer(state1, addRecentlyViewed('phone-2'));
    expect(state2.recentlyViewed).toEqual(['phone-2', 'phone-1']);

    // Adding same ID should move it to front
    const state3 = uiReducer(state2, addRecentlyViewed('phone-1'));
    expect(state3.recentlyViewed).toEqual(['phone-1', 'phone-2']);
  });

  it('should cap recently viewed at 10', () => {
    let state = initialState;
    for (let i = 1; i <= 15; i++) {
      state = uiReducer(state, addRecentlyViewed(`phone-${i}`));
    }
    expect(state.recentlyViewed.length).toBe(10);
    expect(state.recentlyViewed[0]).toBe('phone-15');
  });
});
