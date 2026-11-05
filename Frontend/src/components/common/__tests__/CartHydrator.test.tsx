import { StrictMode } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, type UnknownAction } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CartHydrator from '../CartHydrator';
import rootReducer, { type RootState } from '@/store/rootReducer';
import { addToCart, updateCartItem, removeCartItem, loadCart } from '@/store/slices/cartSlice';
import { persistGuestCart, readGuestCart } from '@/store/guestCartStorage';
import { cartService } from '@/services';
import type { Product } from '@/types';
import type { CartDTO } from '@/types/api';

vi.mock('@/services', () => ({
  cartService: { get: vi.fn(), sync: vi.fn(), updateItem: vi.fn(), removeItem: vi.fn() },
  phoneService: { detail: vi.fn() },
}));

const product: Product = {
  id: '1', slug: 'test-phone', name: 'Guest phone', brand: 'apple', category: 'smartphone',
  price: 1000, rating: 0, reviewCount: 0, sold: 0, images: [], thumbnail: '', colors: [],
  storage: [], description: '', specifications: [], features: [], inStock: true,
};
const emptyCart: CartDTO = { id: 1, userId: 7, items: [], totalAmount: 0, totalItems: 0 };

function makeStore(userId: number | null = null) {
  const initial = rootReducer(undefined, { type: '@@INIT' });
  const store = configureStore({
    reducer: (state: RootState | undefined, action: UnknownAction): RootState => {
      const next = rootReducer(state, action);
      if (action.type !== 'test/auth') return next;
      const id = action.payload as number | null;
      return { ...next, auth: { ...next.auth, isAuthenticated: id !== null, token: id === null ? null : `token-${id}`,
        user: id === null ? null : { id, email: 'test@example.com', fullName: 'Test user', role: 'CUSTOMER' } } };
    },
    preloadedState: { ...initial, cart: readGuestCart() },
  });
  store.dispatch({ type: 'test/auth', payload: userId });
  persistGuestCart(store);
  return store;
}

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  vi.mocked(cartService.get).mockResolvedValue(emptyCart);
  vi.mocked(cartService.sync).mockResolvedValue(emptyCart);
});
afterEach(cleanup);

describe('guest cart lifecycle', () => {
  it('preserves guest items on mount and restores them after reload', () => {
    const store = makeStore();
    store.dispatch(addToCart({ product, variantId: 42, quantity: 2 }));
    const view = render(<Provider store={store}><CartHydrator /></Provider>);
    expect(store.getState().cart.items).toHaveLength(1);
    view.unmount();
    const reloaded = makeStore();
    render(<Provider store={reloaded}><CartHydrator /></Provider>);
    expect(reloaded.getState().cart.items[0]).toMatchObject({ variantId: 42, quantity: 2 });
    expect(cartService.get).not.toHaveBeenCalled();
    expect(cartService.sync).not.toHaveBeenCalled();
  });

  it('merges guest quantities once on login under StrictMode', async () => {
    const store = makeStore();
    store.dispatch(addToCart({ product, variantId: 42, quantity: 2 }));
    render(<StrictMode><Provider store={store}><CartHydrator /></Provider></StrictMode>);
    act(() => { store.dispatch({ type: 'test/auth', payload: 7 }); });
    await waitFor(() => expect(cartService.get).toHaveBeenCalledOnce());
    expect(cartService.sync).toHaveBeenCalledExactlyOnceWith({ items: [{ phoneVariantId: 42, quantity: 2 }] });
    expect(readGuestCart().items).toEqual([]);
  });

  it('retries a saved guest cart after an authenticated reload without double sync', async () => {
    const guest = makeStore();
    guest.dispatch(addToCart({ product, variantId: 42, quantity: 2 }));
    const store = makeStore(7);
    render(<StrictMode><Provider store={store}><CartHydrator /></Provider></StrictMode>);
    await waitFor(() => expect(cartService.get).toHaveBeenCalledOnce());
    expect(cartService.sync).toHaveBeenCalledOnce();
  });

  it('keeps guest items and their saved copy when merging fails', async () => {
    vi.mocked(cartService.sync).mockRejectedValue(new Error('Offline'));
    const store = makeStore();
    store.dispatch(addToCart({ product, variantId: 42, quantity: 2 }));
    render(<Provider store={store}><CartHydrator /></Provider>);
    act(() => { store.dispatch({ type: 'test/auth', payload: 7 }); });
    await waitFor(() => expect(cartService.sync).toHaveBeenCalledOnce());
    expect(store.getState().cart.items[0].quantity).toBe(2);
    expect(readGuestCart().items[0].quantity).toBe(2);
    expect(cartService.get).not.toHaveBeenCalled();
  });

  it('clears account items on logout and ignores an old sync response', async () => {
    let resolve!: (value: CartDTO) => void;
    vi.mocked(cartService.sync).mockReturnValue(new Promise((done) => { resolve = done; }));
    const store = makeStore();
    store.dispatch(addToCart({ product, variantId: 42, quantity: 2 }));
    render(<Provider store={store}><CartHydrator /></Provider>);
    act(() => { store.dispatch({ type: 'test/auth', payload: 7 }); });
    act(() => { store.dispatch({ type: 'test/auth', payload: null }); });
    await act(async () => { resolve(emptyCart); });
    expect(store.getState().cart.items).toEqual([]);
    expect(readGuestCart().items).toEqual([]);
    expect(cartService.get).not.toHaveBeenCalled();
  });

  it('updates and removes temporary guest IDs without calling account APIs', async () => {
    const store = makeStore();
    store.dispatch(addToCart({ product, variantId: 42, quantity: 2 }));
    const id = store.getState().cart.items[0].id;
    await store.dispatch(updateCartItem({ id, quantity: 3 }));
    expect(store.getState().cart.items[0].quantity).toBe(3);
    await store.dispatch(removeCartItem(id));
    expect(store.getState().cart.items).toEqual([]);
    expect(cartService.updateItem).not.toHaveBeenCalled();
    expect(cartService.removeItem).not.toHaveBeenCalled();
  });

  it('ignores a cart fetch that finishes after the account changes', async () => {
    let resolve!: (value: CartDTO) => void;
    vi.mocked(cartService.get).mockReturnValue(new Promise((done) => { resolve = done; }));
    const store = makeStore(7);
    const pending = store.dispatch(loadCart());
    store.dispatch({ type: 'test/auth', payload: 8 });
    resolve(emptyCart);
    expect((await pending).type).toBe(loadCart.rejected.type);
  });

  it('does not save an authenticated account cart as the next guest cart', () => {
    const store = makeStore(7);
    store.dispatch(addToCart({ product, variantId: 42, quantity: 2 }));
    expect(store.getState().cart.items).toHaveLength(1);
    expect(readGuestCart().items).toEqual([]);
    store.dispatch({ type: 'test/auth', payload: null });
    expect(readGuestCart().items).toEqual([]);
  });
});
