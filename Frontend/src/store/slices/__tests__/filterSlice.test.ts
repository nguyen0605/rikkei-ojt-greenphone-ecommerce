import { describe, it, expect } from 'vitest';
import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import filterReducer, {
  setBrands,
  setBrandId,
  toggleBrand,
  setPriceRange,
  toggleRam,
  toggleStorage,
  toggleColor,
  toggleFeature,
  setSearch,
  setSortBy,
  clearAllFilters,
} from '@/store/slices/filterSlice';

function createTestStore(): EnhancedStore<{ filter: ReturnType<typeof filterReducer> }> {
  return configureStore({ reducer: { filter: filterReducer } });
}

describe('filterSlice', () => {
  describe('initial state', () => {
    it('should have sensible defaults', () => {
      const s = createTestStore().getState().filter;
      expect(s.brandIds).toEqual([]);
      expect(s.priceRange).toEqual([0, 50_000_000]);
      expect(s.rams).toEqual([]);
      expect(s.storages).toEqual([]);
      expect(s.colors).toEqual([]);
      expect(s.features).toEqual([]);
      expect(s.search).toBe('');
      expect(s.sortBy).toBe('newest');
    });
  });

  describe('setBrands', () => {
    it('should replace brandIds', () => {
      const store = createTestStore();
      store.dispatch(setBrands([1, 2]));
      expect(store.getState().filter.brandIds).toEqual([1, 2]);
    });
    it('should accept empty array', () => {
      const store = createTestStore();
      store.dispatch(setBrands([1]));
      store.dispatch(setBrands([]));
      expect(store.getState().filter.brandIds).toEqual([]);
    });
  });

  describe('setBrandId', () => {
    it('should set single brand', () => {
      const store = createTestStore();
      store.dispatch(setBrandId(5));
      expect(store.getState().filter.brandIds).toEqual([5]);
    });
  });

  describe('toggleBrand', () => {
    it('adds if absent, removes if present', () => {
      const store = createTestStore();
      store.dispatch(toggleBrand(1));
      expect(store.getState().filter.brandIds).toEqual([1]);
      store.dispatch(toggleBrand(2));
      store.dispatch(toggleBrand(1));
      expect(store.getState().filter.brandIds).toEqual([2]);
    });
  });

  describe('setPriceRange', () => {
    it('updates range', () => {
      const store = createTestStore();
      store.dispatch(setPriceRange([5_000_000, 20_000_000]));
      expect(store.getState().filter.priceRange).toEqual([5_000_000, 20_000_000]);
    });
  });

  describe('toggleRam / toggleStorage / toggleColor / toggleFeature', () => {
    it('adds and removes correctly', () => {
      const store = createTestStore();
      store.dispatch(toggleRam('8GB'));
      store.dispatch(toggleRam('8GB'));
      expect(store.getState().filter.rams).toEqual([]);

      store.dispatch(toggleStorage('256GB'));
      expect(store.getState().filter.storages).toEqual(['256GB']);

      store.dispatch(toggleColor('Titanium'));
      store.dispatch(toggleColor('Black'));
      store.dispatch(toggleColor('Titanium'));
      expect(store.getState().filter.colors).toEqual(['Black']);

      store.dispatch(toggleFeature('5G'));
      store.dispatch(toggleFeature('5G'));
      expect(store.getState().filter.features).toEqual([]);
    });
  });

  describe('setSearch', () => {
    it('updates and clears search', () => {
      const store = createTestStore();
      store.dispatch(setSearch('iPhone'));
      expect(store.getState().filter.search).toBe('iPhone');
      store.dispatch(setSearch(''));
      expect(store.getState().filter.search).toBe('');
    });
  });

  describe('setSortBy', () => {
    it('accepts all valid options', () => {
      const store = createTestStore();
      for (const s of ['price-asc', 'price-desc', 'name', 'newest'] as const) {
        store.dispatch(setSortBy(s));
        expect(store.getState().filter.sortBy).toBe(s);
      }
    });
  });

  describe('clearAllFilters', () => {
    it('resets everything', () => {
      const store = createTestStore();
      store.dispatch(setBrands([1, 2]));
      store.dispatch(setPriceRange([10_000_000, 30_000_000]));
      store.dispatch(toggleRam('8GB'));
      store.dispatch(toggleStorage('512GB'));
      store.dispatch(toggleColor('Black'));
      store.dispatch(toggleFeature('5G'));
      store.dispatch(setSearch('pro max'));
      store.dispatch(setSortBy('price-desc'));
      store.dispatch(clearAllFilters());

      const s = store.getState().filter;
      expect(s.brandIds).toEqual([]);
      expect(s.priceRange).toEqual([0, 50_000_000]);
      expect(s.rams).toEqual([]);
      expect(s.storages).toEqual([]);
      expect(s.colors).toEqual([]);
      expect(s.features).toEqual([]);
      expect(s.search).toBe('');
      expect(s.sortBy).toBe('newest');
    });
  });
});
