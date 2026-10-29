import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import cartReducer, {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  applyVoucher,
  removeVoucher,
} from '@/store/slices/cartSlice';
import type { RootState } from '@/store/rootReducer';
import type { CartItem, AppliedVoucher, Product } from '@/types';

/**
 * Creates a fresh test store with only the cart reducer.
 */
function createTestStore(): EnhancedStore<{ cart: ReturnType<typeof cartReducer> }> {
  return configureStore({
    reducer: { cart: cartReducer },
  });
}

/**
 * Minimal product factory. Only the fields consumed by cartSlice are populated.
 */
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'phone-1',
    slug: 'iphone-16-pro',
    name: 'iPhone 16 Pro',
    brand: 'apple',
    category: 'smartphone',
    price: 29_990_000,
    originalPrice: 34_990_000,
    discount: 14,
    rating: 4.8,
    reviewCount: 256,
    sold: 1200,
    images: ['img1.jpg'],
    thumbnail: 'thumb.jpg',
    colors: [
      { id: 'c1', name: 'Natural Titanium', hex: '#C5C1B8' },
      { id: 'c2', name: 'Black Titanium', hex: '#3A3A3A' },
    ],
    storage: [
      { id: 's1', capacity: '256GB' },
      { id: 's2', capacity: '512GB' },
    ],
    description: 'The best iPhone yet.',
    specifications: [],
    features: [],
    inStock: true,
    ...overrides,
  };
}

describe('cartSlice', () => {
  describe('initial state', () => {
    it('should have an empty items array and null appliedVoucher', () => {
      const store = createTestStore();
      const state = store.getState().cart;

      expect(state.items).toEqual([]);
      expect(state.appliedVoucher).toBeNull();
    });
  });

  describe('addToCart', () => {
    it('should add a new item when the cart is empty', () => {
      const store = createTestStore();
      const product = makeProduct();

      store.dispatch(addToCart({ product, quantity: 1, color: 'Natural Titanium', storage: '256GB' }));

      const items = store.getState().cart.items;
      expect(items).toHaveLength(1);
      expect(items[0].productId).toBe('phone-1');
      expect(items[0].quantity).toBe(1);
      expect(items[0].selectedColor).toBe('Natural Titanium');
      expect(items[0].selectedStorage).toBe('256GB');
      expect(items[0].product).toEqual(product);
      expect(items[0].addedAt).toBeTruthy();
    });

    it('should auto-generate a unique id', () => {
      const store = createTestStore();
      const product = makeProduct();

      store.dispatch(addToCart({ product, quantity: 1 }));

      const item = store.getState().cart.items[0];
      expect(item.id).toBeTruthy();
      expect(typeof item.id).toBe('string');
    });

    it('should increment quantity when the same variant already exists', () => {
      const store = createTestStore();
      const product = makeProduct();

      // Add once
      store.dispatch(addToCart({ product, quantity: 2, color: 'Black Titanium', storage: '512GB' }));
      // Add same variant again
      store.dispatch(addToCart({ product, quantity: 3, color: 'Black Titanium', storage: '512GB' }));

      const items = store.getState().cart.items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(5);
    });

    it('should add a separate item for a different color', () => {
      const store = createTestStore();
      const product = makeProduct();

      store.dispatch(addToCart({ product, quantity: 1, color: 'Natural Titanium', storage: '256GB' }));
      store.dispatch(addToCart({ product, quantity: 1, color: 'Black Titanium', storage: '256GB' }));

      const items = store.getState().cart.items;
      expect(items).toHaveLength(2);
      expect(items[0].selectedColor).toBe('Natural Titanium');
      expect(items[1].selectedColor).toBe('Black Titanium');
    });

    it('should add a separate item for a different storage option', () => {
      const store = createTestStore();
      const product = makeProduct();

      store.dispatch(addToCart({ product, quantity: 1, color: 'Natural Titanium', storage: '256GB' }));
      store.dispatch(addToCart({ product, quantity: 1, color: 'Natural Titanium', storage: '512GB' }));

      const items = store.getState().cart.items;
      expect(items).toHaveLength(2);
      expect(items[0].selectedStorage).toBe('256GB');
      expect(items[1].selectedStorage).toBe('512GB');
    });

    it('should treat undefined color and storage as identical keys', () => {
      const store = createTestStore();
      const product = makeProduct();

      // Both dispatch with no color/storage — they implicitly share the same key
      store.dispatch(addToCart({ product, quantity: 1 }));
      store.dispatch(addToCart({ product, quantity: 2 }));

      const items = store.getState().cart.items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(3);
    });

    it('should NOT match on productId alone when color or storage differ', () => {
      const store = createTestStore();
      const product = makeProduct();

      store.dispatch(addToCart({ product, quantity: 1, color: 'A' }));
      store.dispatch(addToCart({ product, quantity: 1, color: 'B' }));

      expect(store.getState().cart.items).toHaveLength(2);
    });
  });

  describe('removeFromCart', () => {
    it('should remove the item matching the given id', () => {
      const store = createTestStore();
      const product = makeProduct();

      store.dispatch(addToCart({ product, quantity: 1 }));
      const idToRemove = store.getState().cart.items[0].id;

      store.dispatch(removeFromCart(idToRemove));

      expect(store.getState().cart.items).toHaveLength(0);
    });

    it('should leave other items untouched', () => {
      const store = createTestStore();
      const p1 = makeProduct({ id: 'phone-1' });
      const p2 = makeProduct({ id: 'phone-2', name: 'Galaxy S25' });

      store.dispatch(addToCart({ product: p1, quantity: 1, color: 'A' }));
      store.dispatch(addToCart({ product: p2, quantity: 1, color: 'B' }));

      const idToRemove = store.getState().cart.items[0].id;
      store.dispatch(removeFromCart(idToRemove));

      const remaining = store.getState().cart.items;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].productId).toBe('phone-2');
    });

    it('should not throw when the id does not exist', () => {
      const store = createTestStore();

      expect(() => {
        store.dispatch(removeFromCart('non-existent-id'));
      }).not.toThrow();

      expect(store.getState().cart.items).toEqual([]);
    });
  });

  describe('updateQuantity', () => {
    it('should update the quantity to a positive value', () => {
      const store = createTestStore();
      const product = makeProduct();

      store.dispatch(addToCart({ product, quantity: 1 }));
      const itemId = store.getState().cart.items[0].id;

      store.dispatch(updateQuantity({ id: itemId, quantity: 5 }));

      expect(store.getState().cart.items[0].quantity).toBe(5);
    });

    it('should clamp quantity to at least 1 (negative input)', () => {
      const store = createTestStore();
      const product = makeProduct();

      store.dispatch(addToCart({ product, quantity: 3 }));
      const itemId = store.getState().cart.items[0].id;

      store.dispatch(updateQuantity({ id: itemId, quantity: -5 }));

      expect(store.getState().cart.items[0].quantity).toBe(1);
    });

    it('should clamp quantity to at least 1 (zero input)', () => {
      const store = createTestStore();
      const product = makeProduct();

      store.dispatch(addToCart({ product, quantity: 2 }));
      const itemId = store.getState().cart.items[0].id;

      store.dispatch(updateQuantity({ id: itemId, quantity: 0 }));

      expect(store.getState().cart.items[0].quantity).toBe(1);
    });

    it('should not mutate state when the item id is not found', () => {
      const store = createTestStore();
      const product = makeProduct();

      store.dispatch(addToCart({ product, quantity: 2 }));
      const itemsBefore = [...store.getState().cart.items];

      store.dispatch(updateQuantity({ id: 'ghost-id', quantity: 10 }));

      expect(store.getState().cart.items).toEqual(itemsBefore);
    });
  });

  describe('clearCart', () => {
    it('should remove all items and the applied voucher', () => {
      const store = createTestStore();
      const product = makeProduct();
      const voucher: AppliedVoucher = {
        code: 'SUMMER10',
        discountAmount: 100_000,
        title: 'Summer Sale 10%',
      };

      store.dispatch(addToCart({ product, quantity: 2 }));
      store.dispatch(applyVoucher(voucher));

      expect(store.getState().cart.items).toHaveLength(1);
      expect(store.getState().cart.appliedVoucher).not.toBeNull();

      store.dispatch(clearCart());

      expect(store.getState().cart.items).toEqual([]);
      expect(store.getState().cart.appliedVoucher).toBeNull();
    });
  });

  describe('applyVoucher', () => {
    it('should store the applied voucher', () => {
      const store = createTestStore();
      const voucher: AppliedVoucher = {
        code: 'WELCOME',
        discountAmount: 50_000,
        title: 'Welcome Voucher',
      };

      store.dispatch(applyVoucher(voucher));

      expect(store.getState().cart.appliedVoucher).toEqual(voucher);
    });

    it('should overwrite any previously applied voucher', () => {
      const store = createTestStore();
      const first: AppliedVoucher = { code: 'OLD', discountAmount: 10_000, title: 'Old' };
      const second: AppliedVoucher = { code: 'NEW', discountAmount: 20_000, title: 'New' };

      store.dispatch(applyVoucher(first));
      store.dispatch(applyVoucher(second));

      expect(store.getState().cart.appliedVoucher).toEqual(second);
    });
  });

  describe('removeVoucher', () => {
    it('should set appliedVoucher back to null', () => {
      const store = createTestStore();
      const voucher: AppliedVoucher = { code: 'FLASH', discountAmount: 200_000, title: 'Flash Sale' };

      store.dispatch(applyVoucher(voucher));
      expect(store.getState().cart.appliedVoucher).not.toBeNull();

      store.dispatch(removeVoucher());
      expect(store.getState().cart.appliedVoucher).toBeNull();
    });

    it('should be a no-op when no voucher is applied', () => {
      const store = createTestStore();

      store.dispatch(removeVoucher());

      expect(store.getState().cart.appliedVoucher).toBeNull();
    });
  });
});
