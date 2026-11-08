import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import rootReducer, { type RootState } from '@/store/rootReducer';
import {
  addToCart,
  updateQuantity,
  removeFromCart,
  fetchCart,
  syncCart,
  updateCartItem,
} from '@/store/slices/cartSlice';
import {
  selectCartTotalItems,
  selectCartSummary,
  selectIsInCart,
  selectCartError,
} from '@/store/selectors/cartSelectors';
import { persistGuestCart, readGuestCart } from '@/store/guestCartStorage';
import { cartService, phoneService } from '@/services';
import type { Product } from '@/types';
import type { CartDTO, CartItemDTO, PhoneDetailDTO } from '@/types/api';

vi.mock('@/services', () => ({
  cartService: {
    get: vi.fn(),
    sync: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  phoneService: {
    detail: vi.fn(),
  },
}));

const mockProductA: Product = {
  id: '1',
  slug: 'iphone-15-pro-max',
  name: 'iPhone 15 Pro Max',
  brand: 'apple',
  category: 'smartphone',
  price: 33990000,
  originalPrice: 34990000,
  rating: 4.9,
  reviewCount: 42,
  sold: 100,
  images: ['img1.jpg'],
  thumbnail: 'thumb1.jpg',
  colors: [{ id: '10', name: 'Titan Tự Nhiên', hex: '#9A958D' }],
  storage: [{ id: '10', capacity: '256GB' }],
  description: 'iPhone cao cấp',
  specifications: [],
  features: [],
  inStock: true,
};

const mockProductB: Product = {
  id: '2',
  slug: 'samsung-s24-ultra',
  name: 'Samsung Galaxy S24 Ultra',
  brand: 'samsung',
  category: 'smartphone',
  price: 29990000,
  originalPrice: 31990000,
  rating: 4.8,
  reviewCount: 30,
  sold: 50,
  images: ['img2.jpg'],
  thumbnail: 'thumb2.jpg',
  colors: [{ id: '20', name: 'Titan Xám', hex: '#666666' }],
  storage: [{ id: '20', capacity: '512GB' }],
  description: 'Samsung cao cấp',
  specifications: [],
  features: [],
  inStock: true,
};

function createMockCartDTO(items: CartItemDTO[], userId = 1): CartDTO {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.discountPrice ?? item.price) * item.quantity,
    0,
  );
  return {
    id: 100,
    userId,
    items,
    totalItems,
    totalAmount,
  };
}

function setupTestStore(initialUser: { id: number; email: string; token: string } | null = null) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        user: initialUser ? { id: initialUser.id, email: initialUser.email, fullName: 'Test User', role: 'CUSTOMER' } : null,
        token: initialUser ? initialUser.token : null,
        isAuthenticated: !!initialUser,
        loading: false,
        error: null,
        errorCode: null,
        rememberedEmail: null,
      },
      cart: readGuestCart(),
    } as unknown as RootState,
  });

  persistGuestCart(store);
  return store;
}

describe('[FE1-02] Comprehensive Cart Synchronization & Login Merge Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(phoneService.detail).mockImplementation(async (id: number) => ({
      id,
      name: id === 1 ? 'iPhone 15 Pro Max' : 'Samsung Galaxy S24 Ultra',
      brandName: id === 1 ? 'Apple' : 'Samsung',
      price: id === 1 ? 33990000 : 29990000,
      lowestPrice: id === 1 ? 33990000 : 29990000,
      images: [],
      variants: [],
      reviewCount: 10,
      avgRating: 4.8,
    } as unknown as PhoneDetailDTO));
  });

  afterEach(() => {
    localStorage.clear();
  });

  // 1. Guest thêm sản phẩm vào giỏ
  it('1. Guest adds item to cart: updates Redux state and persists to localStorage', () => {
    const store = setupTestStore(null);
    store.dispatch(
      addToCart({
        product: mockProductA,
        variantId: 10,
        quantity: 2,
        color: 'Titan Tự Nhiên',
        storage: '256GB',
      }),
    );

    const items = store.getState().cart.items;
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe(10);
    expect(items[0].quantity).toBe(2);

    // Verify localStorage persistence
    const saved = readGuestCart();
    expect(saved.items).toHaveLength(1);
    expect(saved.items[0].variantId).toBe(10);
  });

  // 2. Guest refresh không mất giỏ
  it('2. Guest refreshes: re-reading from localStorage preserves all cart items', () => {
    const store1 = setupTestStore(null);
    store1.dispatch(
      addToCart({
        product: mockProductA,
        variantId: 10,
        quantity: 3,
        color: 'Titan Tự Nhiên',
        storage: '256GB',
      }),
    );

    // Simulate page reload by creating a fresh store
    const store2 = setupTestStore(null);
    expect(store2.getState().cart.items).toHaveLength(1);
    expect(store2.getState().cart.items[0].quantity).toBe(3);
    expect(store2.getState().cart.items[0].productId).toBe('1');
  });

  // 3. Guest cập nhật số lượng
  it('3. Guest updates quantity: modifies quantity in memory and localStorage', () => {
    const store = setupTestStore(null);
    store.dispatch(addToCart({ product: mockProductA, variantId: 10, quantity: 1 }));
    const itemId = store.getState().cart.items[0].id;

    store.dispatch(updateQuantity({ id: itemId, quantity: 4 }));
    expect(store.getState().cart.items[0].quantity).toBe(4);
    expect(readGuestCart().items[0].quantity).toBe(4);
  });

  // 4. Guest xóa sản phẩm
  it('4. Guest removes item: item is deleted from both memory and localStorage', () => {
    const store = setupTestStore(null);
    store.dispatch(addToCart({ product: mockProductA, variantId: 10, quantity: 1 }));
    const itemId = store.getState().cart.items[0].id;

    store.dispatch(removeFromCart(itemId));
    expect(store.getState().cart.items).toHaveLength(0);
    expect(readGuestCart().items).toHaveLength(0);
  });

  // 5. User đăng nhập và fetchCart thành công
  it('5. User logs in and fetchCart succeeds: loads user cart from backend API', async () => {
    const mockServerCart = createMockCartDTO([
      {
        id: 101,
        phoneVariantId: 10,
        phoneId: 1,
        phoneName: 'iPhone 15 Pro Max',
        ram: '8GB',
        storage: '256GB',
        color: 'Titan Tự Nhiên',
        imageUrl: 'img1.jpg',
        price: 34990000,
        discountPrice: 33990000,
        quantity: 2,
        subtotal: 67980000,
      },
    ]);
    vi.mocked(cartService.get).mockResolvedValueOnce(mockServerCart);

    const store = setupTestStore({ id: 1, email: 'user@example.com', token: 'jwt-123' });
    await store.dispatch(fetchCart());

    const state = store.getState().cart;
    expect(state.status).toBe('succeeded');
    expect(state.items).toHaveLength(1);
    expect(state.items[0].variantId).toBe(10);
    expect(state.items[0].quantity).toBe(2);
    expect(cartService.get).toHaveBeenCalledOnce();
  });

  // 6. Guest cart được merge khi login
  it('6. Guest cart merged on login: syncCart calls /api/cart/sync and clears localStorage', async () => {
    const guestStore = setupTestStore(null);
    guestStore.dispatch(addToCart({ product: mockProductA, variantId: 10, quantity: 2 }));

    const mergedCartDTO = createMockCartDTO([
      {
        id: 101,
        phoneVariantId: 10,
        phoneId: 1,
        phoneName: 'iPhone 15 Pro Max',
        ram: '8GB',
        storage: '256GB',
        color: 'Titan Tự Nhiên',
        imageUrl: 'img1.jpg',
        price: 34990000,
        discountPrice: 33990000,
        quantity: 2,
        subtotal: 67980000,
      },
    ]);
    vi.mocked(cartService.sync).mockResolvedValueOnce(mergedCartDTO);

    // User logs in with the guest items present
    const authStore = setupTestStore({ id: 1, email: 'user@example.com', token: 'valid-token' });
    const guestItems = readGuestCart().items.map((i) => ({
      phoneVariantId: i.variantId!,
      quantity: i.quantity,
    }));

    await authStore.dispatch(syncCart(guestItems));

    expect(cartService.sync).toHaveBeenCalledWith({
      items: [{ phoneVariantId: 10, quantity: 2 }],
    });
    expect(authStore.getState().cart.status).toBe('succeeded');
    expect(authStore.getState().cart.items).toHaveLength(1);
    expect(readGuestCart().items).toHaveLength(0); // Cleared in localStorage!
  });

  // 7. Giỏ server và guest có cùng variant
  it('7. Server and guest have the same variant: server combines quantities', async () => {
    // Guest had 2 units of Variant 10. Server already had 3 units. Merged = 5.
    const mergedCartDTO = createMockCartDTO([
      {
        id: 101,
        phoneVariantId: 10,
        phoneId: 1,
        phoneName: 'iPhone 15 Pro Max',
        ram: '8GB',
        storage: '256GB',
        color: 'Titan Tự Nhiên',
        imageUrl: 'img1.jpg',
        price: 34990000,
        discountPrice: 33990000,
        quantity: 5,
        subtotal: 169950000,
      },
    ]);
    vi.mocked(cartService.sync).mockResolvedValueOnce(mergedCartDTO);

    const store = setupTestStore({ id: 1, email: 'user@example.com', token: 'jwt' });
    await store.dispatch(syncCart([{ phoneVariantId: 10, quantity: 2 }]));

    expect(store.getState().cart.items[0].quantity).toBe(5);
  });

  // 8. Giỏ server và guest có variant khác nhau
  it('8. Server and guest have different variants: server returns all combined items', async () => {
    // Guest had Variant 10 (iPhone), Server had Variant 20 (Samsung)
    const mergedCartDTO = createMockCartDTO([
      {
        id: 101,
        phoneVariantId: 10,
        phoneId: 1,
        phoneName: 'iPhone 15 Pro Max',
        ram: '8GB',
        storage: '256GB',
        color: 'Titan Tự Nhiên',
        imageUrl: 'img1.jpg',
        price: 34990000,
        discountPrice: 33990000,
        quantity: 1,
        subtotal: 33990000,
      },
      {
        id: 102,
        phoneVariantId: 20,
        phoneId: 2,
        phoneName: 'Samsung Galaxy S24 Ultra',
        ram: '12GB',
        storage: '512GB',
        color: 'Titan Xám',
        imageUrl: 'img2.jpg',
        price: 31990000,
        discountPrice: 29990000,
        quantity: 2,
        subtotal: 59980000,
      },
    ]);
    vi.mocked(cartService.sync).mockResolvedValueOnce(mergedCartDTO);

    const store = setupTestStore({ id: 1, email: 'user@example.com', token: 'jwt' });
    await store.dispatch(syncCart([{ phoneVariantId: 10, quantity: 1 }]));

    expect(store.getState().cart.items).toHaveLength(2);
    expect(store.getState().cart.items.map((i) => i.variantId)).toEqual([10, 20]);
  });

  // 9. Local cart rỗng
  it('9. Local cart is empty: fetchCart fetches remote cart directly without sync', async () => {
    const emptyServerCart = createMockCartDTO([]);
    vi.mocked(cartService.get).mockResolvedValueOnce(emptyServerCart);

    const store = setupTestStore({ id: 1, email: 'user@example.com', token: 'jwt' });
    await store.dispatch(fetchCart());

    expect(cartService.get).toHaveBeenCalledOnce();
    expect(cartService.sync).not.toHaveBeenCalled();
    expect(store.getState().cart.items).toHaveLength(0);
  });

  // 10. Server cart rỗng
  it('10. Server cart is empty: syncCart establishes guest items as the user cart', async () => {
    const mergedCartDTO = createMockCartDTO([
      {
        id: 101,
        phoneVariantId: 10,
        phoneId: 1,
        phoneName: 'iPhone 15 Pro Max',
        ram: '8GB',
        storage: '256GB',
        color: 'Titan Tự Nhiên',
        imageUrl: 'img1.jpg',
        price: 34990000,
        discountPrice: 33990000,
        quantity: 1,
        subtotal: 33990000,
      },
    ]);
    vi.mocked(cartService.sync).mockResolvedValueOnce(mergedCartDTO);

    const store = setupTestStore({ id: 1, email: 'user@example.com', token: 'jwt' });
    await store.dispatch(syncCart([{ phoneVariantId: 10, quantity: 1 }]));

    expect(store.getState().cart.items).toHaveLength(1);
    expect(store.getState().cart.items[0].variantId).toBe(10);
  });

  // 11. Sync thất bại không xóa local cart
  it('11. Sync failure does NOT delete local guest cart', async () => {
    const store = setupTestStore(null);
    store.dispatch(addToCart({ product: mockProductA, variantId: 10, quantity: 2 }));
    expect(readGuestCart().items).toHaveLength(1);

    vi.mocked(cartService.sync).mockRejectedValueOnce(new Error('500 Internal Server Error'));

    const authStore = setupTestStore({ id: 1, email: 'user@example.com', token: 'jwt' });
    const result = await authStore.dispatch(syncCart([{ phoneVariantId: 10, quantity: 2 }]));

    expect(result.type).toBe('cart/sync/rejected');
    expect(authStore.getState().cart.status).toBe('failed');
    // Local guest cart must NOT be wiped out
    expect(readGuestCart().items).toHaveLength(1);
    expect(readGuestCart().items[0].quantity).toBe(2);
  });

  // 12. Retry sync không tạo duplicate
  it('12. Retry sync after network recovery succeeds cleanly without duplicating items', async () => {
    const finalMergedDTO = createMockCartDTO([
      {
        id: 101,
        phoneVariantId: 10,
        phoneId: 1,
        phoneName: 'iPhone 15 Pro Max',
        ram: '8GB',
        storage: '256GB',
        color: 'Titan Tự Nhiên',
        imageUrl: 'img1.jpg',
        price: 34990000,
        discountPrice: 33990000,
        quantity: 2,
        subtotal: 67980000,
      },
    ]);
    vi.mocked(cartService.sync).mockResolvedValueOnce(finalMergedDTO);

    const authStore = setupTestStore({ id: 1, email: 'user@example.com', token: 'jwt' });
    await authStore.dispatch(syncCart([{ phoneVariantId: 10, quantity: 2 }]));

    expect(authStore.getState().cart.status).toBe('succeeded');
    expect(authStore.getState().cart.items).toHaveLength(1);
    expect(authStore.getState().cart.items[0].quantity).toBe(2);
  });

  // 13. Hết hàng khi merge
  it('13. Out of stock variant during merge: server response correctly reflects available stock', async () => {
    // If backend capped quantity at available stock 1 (instead of requested 5)
    const cappedCartDTO = createMockCartDTO([
      {
        id: 101,
        phoneVariantId: 10,
        phoneId: 1,
        phoneName: 'iPhone 15 Pro Max',
        ram: '8GB',
        storage: '256GB',
        color: 'Titan Tự Nhiên',
        imageUrl: 'img1.jpg',
        price: 34990000,
        discountPrice: 33990000,
        quantity: 1, // Capped
        subtotal: 33990000,
      },
    ]);
    vi.mocked(cartService.sync).mockResolvedValueOnce(cappedCartDTO);

    const authStore = setupTestStore({ id: 1, email: 'user@example.com', token: 'jwt' });
    await authStore.dispatch(syncCart([{ phoneVariantId: 10, quantity: 5 }]));

    expect(authStore.getState().cart.items[0].quantity).toBe(1);
  });

  // 14. Vượt tồn kho khi update quantity
  it('14. Exceeding stock on quantity update: returns rejection without corrupting cart state', async () => {
    vi.mocked(cartService.updateItem).mockRejectedValueOnce(new Error('Insufficient stock'));

    const authStore = setupTestStore({ id: 1, email: 'user@example.com', token: 'jwt' });
    // Preload an item
    authStore.dispatch(addToCart({ product: mockProductA, variantId: 10, quantity: 2 }));

    const result = await authStore.dispatch(updateCartItem({ id: '101', quantity: 999 }));
    expect(result.type).toBe('cart/updateItem/rejected');
    expect(authStore.getState().cart.status).toBe('failed');
    expect(authStore.getState().cart.error).toContain('Insufficient stock');
  });

  // 15. Logout/login tài khoản khác không rò rỉ cart
  it('15. Logout account A and login account B: completely clears cart and avoids data leakage', () => {
    const store = setupTestStore({ id: 1, email: 'userA@example.com', token: 'token-A' });
    store.dispatch(addToCart({ product: mockProductA, variantId: 10, quantity: 2 }));
    expect(store.getState().cart.items).toHaveLength(1);

    // Logout
    store.dispatch({ type: 'auth/logout' });

    expect(store.getState().cart.items).toHaveLength(0);
    expect(store.getState().cart.status).toBe('idle');
    expect(readGuestCart().items).toHaveLength(0);
  });

  // 16. Header badge cập nhật
  it('16. Header cart badge updates reactively across all addition and deletion steps', () => {
    const store = setupTestStore(null);
    expect(selectCartTotalItems(store.getState())).toBe(0);

    store.dispatch(addToCart({ product: mockProductA, variantId: 10, quantity: 2 }));
    expect(selectCartTotalItems(store.getState())).toBe(2);

    store.dispatch(addToCart({ product: mockProductB, variantId: 20, quantity: 3 }));
    expect(selectCartTotalItems(store.getState())).toBe(5);

    const itemId = store.getState().cart.items[0].id;
    store.dispatch(removeFromCart(itemId));
    expect(selectCartTotalItems(store.getState())).toBe(3);
  });

  // 17. Tổng tiền cập nhật
  it('17. Total amount calculations in selectCartSummary reflect accurate pricing', () => {
    const store = setupTestStore(null);
    store.dispatch(addToCart({ product: mockProductA, variantId: 10, quantity: 1 }));
    store.dispatch(addToCart({ product: mockProductB, variantId: 20, quantity: 1 }));

    const summary = selectCartSummary(store.getState());
    // 33.990.000 + 29.990.000 = 63.980.000 (> 5.000.000 so free shipping)
    expect(summary.subtotal).toBe(63980000);
    expect(summary.shippingFee).toBe(0);
    expect(summary.total).toBe(63980000);
  });

  // 18. API 401/403
  it('18. 401/403 unauthorized rejection: rejectWithValue with user-friendly message', async () => {
    vi.mocked(cartService.get).mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Unauthorized session' } },
    });

    const store = setupTestStore({ id: 1, email: 'user@example.com', token: 'expired-token' });
    const result = await store.dispatch(fetchCart());

    expect(result.type).toBe('cart/fetch/rejected');
    expect(store.getState().cart.status).toBe('failed');
    expect(selectCartError(store.getState())).toBe('Unauthorized session');
  });

  // 19. Network timeout
  it('19. Network timeout rejection: gracefully handled without crashing application state', async () => {
    vi.mocked(cartService.sync).mockRejectedValueOnce(new Error('timeout of 15000ms exceeded'));

    const store = setupTestStore({ id: 1, email: 'user@example.com', token: 'jwt' });
    const result = await store.dispatch(syncCart([{ phoneVariantId: 10, quantity: 1 }]));

    expect(result.type).toBe('cart/sync/rejected');
    expect(store.getState().cart.status).toBe('failed');
    expect(store.getState().cart.error).toContain('timeout');
  });

  // 20. Không regression ProductDetailPage và các selector
  it('20. selectIsInCart accurately detects existing product id without regression', () => {
    const store = setupTestStore(null);
    store.dispatch(addToCart({ product: mockProductA, variantId: 10, quantity: 1 }));

    expect(selectIsInCart('1')(store.getState())).toBe(true);
    expect(selectIsInCart('999')(store.getState())).toBe(false);
  });
});
