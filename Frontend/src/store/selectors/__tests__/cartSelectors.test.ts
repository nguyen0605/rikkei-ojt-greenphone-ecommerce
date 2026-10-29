import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import cartReducer, { addToCart, applyVoucher } from '@/store/slices/cartSlice';
import {
  selectCartItemsList,
  selectCartTotalItems,
  selectCartSubtotal,
  selectCartSummary,
  selectIsInCart,
} from '@/store/selectors/cartSelectors';
import type { RootState } from '@/store/rootReducer';
import type { Product, AppliedVoucher } from '@/types';

/**
 * Creates a test store with the cart reducer (same shape as RootState.cart).
 */
function createTestStore(): EnhancedStore<{ cart: ReturnType<typeof cartReducer> }> {
  return configureStore({
    reducer: { cart: cartReducer },
  });
}

function getRootState(store: EnhancedStore<{ cart: ReturnType<typeof cartReducer> }>): RootState {
  return store.getState() as unknown as RootState;
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p-1',
    slug: 'iphone-16',
    name: 'iPhone 16',
    brand: 'apple',
    category: 'smartphone',
    price: 10_000_000,
    originalPrice: 12_000_000,
    discount: 16,
    rating: 4.7,
    reviewCount: 100,
    sold: 500,
    images: ['img.jpg'],
    thumbnail: 'thumb.jpg',
    colors: [{ id: 'c1', name: 'Blue', hex: '#00F' }],
    storage: [{ id: 's1', capacity: '128GB' }],
    description: '',
    specifications: [],
    features: [],
    inStock: true,
    ...overrides,
  };
}

describe('cartSelectors', () => {
  describe('selectCartTotalItems', () => {
    it('should return 0 for an empty cart', () => {
      const store = createTestStore();
      expect(selectCartTotalItems(getRootState(store))).toBe(0);
    });

    it('should sum quantities across all items', () => {
      const store = createTestStore();
      const p1 = makeProduct({ id: 'p-1', price: 10_000_000 });
      const p2 = makeProduct({ id: 'p-2', name: 'Galaxy S25', price: 15_000_000 });

      store.dispatch(addToCart({ product: p1, quantity: 3, color: 'A' }));
      store.dispatch(addToCart({ product: p2, quantity: 2, color: 'B' }));

      expect(selectCartTotalItems(getRootState(store))).toBe(5);
    });

    it('should reflect quantity changes', () => {
      const store = createTestStore();
      const p = makeProduct();

      store.dispatch(addToCart({ product: p, quantity: 5 }));

      expect(selectCartTotalItems(getRootState(store))).toBe(5);
    });
  });

  describe('selectCartSubtotal', () => {
    it('should return 0 for an empty cart', () => {
      const store = createTestStore();
      expect(selectCartSubtotal(getRootState(store))).toBe(0);
    });

    it('should compute price * quantity sum', () => {
      const store = createTestStore();
      const p = makeProduct({ price: 5_000_000 });

      store.dispatch(addToCart({ product: p, quantity: 2 }));

      expect(selectCartSubtotal(getRootState(store))).toBe(10_000_000);
    });

    it('should sum across multiple items', () => {
      const store = createTestStore();
      // p1: 1 x 3 = 3_000_000
      // p2: 2 x 2 = 4_000_000 = 7_000_000 total
      const p1 = makeProduct({ id: 'p-1', price: 1_000_000 });
      const p2 = makeProduct({ id: 'p-2', price: 2_000_000 });

      store.dispatch(addToCart({ product: p1, quantity: 3 }));
      store.dispatch(addToCart({ product: p2, quantity: 2 }));

      expect(selectCartSubtotal(getRootState(store))).toBe(7_000_000);
    });
  });

  describe('selectCartSummary', () => {
    it('should return zeroes for an empty cart', () => {
      const store = createTestStore();
      const summary = selectCartSummary(getRootState(store));

      expect(summary).toEqual({
        subtotal: 0,
        totalItems: 0,
        shippingFee: 0,
        discount: 0,
        total: 0,
      });
    });

    it('should compute subtotal, totalItems, and shipping fee for orders under 5M', () => {
      const store = createTestStore();
      // 1 item x 2 quantity * 1,000,000 = 2,000,000 subtotal (below 5M threshold)
      const p = makeProduct({ price: 1_000_000 });

      store.dispatch(addToCart({ product: p, quantity: 2 }));

      const summary = selectCartSummary(getRootState(store));

      expect(summary.subtotal).toBe(2_000_000);
      expect(summary.totalItems).toBe(2);
      expect(summary.shippingFee).toBe(29_000);
      expect(summary.discount).toBe(0);
      expect(summary.total).toBe(2_029_000);
    });

    it('should waive shipping fee when subtotal exceeds 5,000,000', () => {
      const store = createTestStore();
      // 1 item x 1 quantity * 6,000,000 = 6,000,000 (above 5M threshold)
      const p = makeProduct({ price: 6_000_000 });

      store.dispatch(addToCart({ product: p, quantity: 1 }));

      const summary = selectCartSummary(getRootState(store));

      expect(summary.subtotal).toBe(6_000_000);
      expect(summary.shippingFee).toBe(0);
      expect(summary.total).toBe(6_000_000);
    });

    it('should charge shipping when subtotal is exactly 5,000,000 (not waived)', () => {
      const store = createTestStore();
      // 1 item x 1 quantity * 5,000,000 = exactly 5,000,000
      // The logic is subtotal > 5_000_000 → free shipping, so at exactly 5M shipping is still charged.
      const p = makeProduct({ price: 5_000_000 });

      store.dispatch(addToCart({ product: p, quantity: 1 }));

      const summary = selectCartSummary(getRootState(store));

      expect(summary.subtotal).toBe(5_000_000);
      expect(summary.shippingFee).toBe(29_000);
      expect(summary.total).toBe(5_029_000);
    });

    it('should apply voucher discount', () => {
      const store = createTestStore();
      const p = makeProduct({ price: 2_000_000 });
      const voucher: AppliedVoucher = {
        code: 'SAVE200K',
        discountAmount: 200_000,
        title: 'Save 200k',
      };

      store.dispatch(addToCart({ product: p, quantity: 1 }));
      store.dispatch(applyVoucher(voucher));

      const summary = selectCartSummary(getRootState(store));

      expect(summary.subtotal).toBe(2_000_000);
      expect(summary.discount).toBe(200_000);
      // 2,000,000 (subtotal) + 29,000 (shipping) - 200,000 (discount) = 1,829,000
      expect(summary.total).toBe(1_829_000);
    });

    it('should not let total go below 0', () => {
      const store = createTestStore();
      // Subtotal too small for shipping but huge discount
      const p = makeProduct({ price: 50_000 });
      const voucher: AppliedVoucher = {
        code: 'BIG',
        discountAmount: 1_000_000,
        title: 'Huge discount',
      };

      store.dispatch(addToCart({ product: p, quantity: 1 }));
      store.dispatch(applyVoucher(voucher));

      const summary = selectCartSummary(getRootState(store));

      expect(summary.total).toBe(0);
    });
  });

  describe('selectIsInCart', () => {
    it('should return false when the product is not in cart', () => {
      const store = createTestStore();

      const selector = selectIsInCart('p-1');
      expect(selector(getRootState(store))).toBe(false);
    });

    it('should return true when the product is in cart', () => {
      const store = createTestStore();
      const p = makeProduct({ id: 'p-1' });

      store.dispatch(addToCart({ product: p, quantity: 1 }));

      const selector = selectIsInCart('p-1');
      expect(selector(getRootState(store))).toBe(true);
    });

    it('should only match the given product id', () => {
      const store = createTestStore();
      const p = makeProduct({ id: 'p-1' });

      store.dispatch(addToCart({ product: p, quantity: 1 }));

      const selector = selectIsInCart('p-other');
      expect(selector(getRootState(store))).toBe(false);
    });

    it('should return different selectors for different product ids', () => {
      const store = createTestStore();
      const p1 = makeProduct({ id: 'p-1' });
      const p2 = makeProduct({ id: 'p-2' });

      store.dispatch(addToCart({ product: p1, quantity: 1 }));

      expect(selectIsInCart('p-1')(getRootState(store))).toBe(true);
      expect(selectIsInCart('p-2')(getRootState(store))).toBe(false);
    });
  });

  describe('selectCartItemsList', () => {
    it('should return an empty array for an empty cart', () => {
      const store = createTestStore();
      expect(selectCartItemsList(getRootState(store))).toEqual([]);
    });

    it('should return all cart items', () => {
      const store = createTestStore();
      const p1 = makeProduct({ id: 'p-1' });
      const p2 = makeProduct({ id: 'p-2' });

      store.dispatch(addToCart({ product: p1, quantity: 1 }));
      store.dispatch(addToCart({ product: p2, quantity: 1 }));

      const items = selectCartItemsList(getRootState(store));
      expect(items).toHaveLength(2);
    });
  });
});
