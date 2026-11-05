import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductCard from '../ProductCard';
import rootReducer from '@/store/rootReducer';
import { cartService, phoneService } from '@/services';
import type { CartDTO, PhoneDetailDTO, PhoneDTO } from '@/types/api';

const messages = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: messages }) } }));
vi.mock('@/services', () => ({
  phoneService: { detail: vi.fn() },
  cartService: { addItem: vi.fn(), get: vi.fn() },
}));

const product: PhoneDTO = {
  id: 1, brandId: 1, brandName: 'Apple', name: 'Test phone', description: '', screen: '',
  os: '', chip: '', rearCamera: '', frontCamera: '', battery: '', warranty: '', status: 'ACTIVE',
  mainImageUrl: '/test-phone.jpg', variantCount: 1, avgRating: 0, lowestPrice: 1000,
};
const detail: PhoneDetailDTO = {
  ...product, images: [], reviewCount: 0,
  variants: [{ id: 42, phoneId: 1, ramItemId: 1, storageItemId: 2, colorItemId: 3,
    ram: '8GB', storage: '128GB', color: 'Black', price: 1000, discountPrice: null,
    stockQuantity: 5, sku: 'TEST', status: 'ACTIVE' }],
};
const cart: CartDTO = { id: 1, userId: 7, items: [], totalAmount: 0, totalItems: 0 };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function renderCard(authenticated = true) {
  const state = rootReducer(undefined, { type: '@@INIT' });
  const store = configureStore({ reducer: rootReducer,
    preloadedState: { ...state, auth: { ...state.auth, isAuthenticated: authenticated } } });
  render(<Provider store={store}><MemoryRouter><ProductCard product={product} /></MemoryRouter></Provider>);
  return store;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(phoneService.detail).mockResolvedValue(detail);
  vi.mocked(cartService.addItem).mockResolvedValue(cart);
  vi.mocked(cartService.get).mockResolvedValue(cart);
});
afterEach(cleanup);

describe('ProductCard add to cart', () => {
  it('blocks repeated clicks immediately and stays busy until the cart request succeeds', async () => {
    const pendingDetail = deferred<PhoneDetailDTO>();
    const pendingAdd = deferred<CartDTO>();
    vi.mocked(phoneService.detail).mockReturnValue(pendingDetail.promise);
    vi.mocked(cartService.addItem).mockReturnValue(pendingAdd.promise);
    renderCard();
    const button = screen.getByRole('button', { name: 'Thêm vào giỏ' });

    act(() => { fireEvent.click(button); fireEvent.click(button); });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveTextContent('Đang thêm...');
    expect(phoneService.detail).toHaveBeenCalledExactlyOnceWith(1);
    await act(async () => { pendingDetail.resolve(detail); });
    expect(cartService.addItem).toHaveBeenCalledExactlyOnceWith({ phoneVariantId: 42, quantity: 1 });
    fireEvent.click(button);
    expect(cartService.addItem).toHaveBeenCalledOnce();
    expect(button).toBeDisabled();
    await act(async () => { pendingAdd.resolve(cart); });
    await waitFor(() => expect(button).toBeEnabled());
    expect(messages.success).toHaveBeenCalledOnce();
  });

  it.each(['detail', 'cart'] as const)('unlocks after a %s API failure and allows retry', async (stage) => {
    const pending = deferred<PhoneDetailDTO & CartDTO>();
    if (stage === 'detail') vi.mocked(phoneService.detail).mockReturnValueOnce(pending.promise);
    else vi.mocked(cartService.addItem).mockReturnValueOnce(pending.promise);
    renderCard();
    const button = screen.getByRole('button', { name: 'Thêm vào giỏ' });
    fireEvent.click(button);
    if (stage === 'cart') await waitFor(() => expect(cartService.addItem).toHaveBeenCalledOnce());
    await act(async () => { pending.reject(new Error('Network unavailable')); });
    await waitFor(() => expect(button).toBeEnabled());
    expect(messages.error).toHaveBeenCalledWith(stage === 'detail' ? 'Network unavailable' : 'Không thể thêm vào giỏ hàng');
    fireEvent.click(button);
    await waitFor(() => expect(messages.success).toHaveBeenCalledOnce());
    expect(button).toBeEnabled();
  });

  it('unlocks when no variant is in stock without calling the cart API', async () => {
    vi.mocked(phoneService.detail).mockResolvedValue({ ...detail, variants: [] });
    renderCard();
    const button = screen.getByRole('button', { name: 'Thêm vào giỏ' });
    fireEvent.click(button);
    await waitFor(() => expect(messages.warning).toHaveBeenCalledOnce());
    expect(button).toBeEnabled();
    expect(cartService.addItem).not.toHaveBeenCalled();
  });

  it('adds the guest item locally and unlocks without calling the account cart API', async () => {
    const store = renderCard(false);
    const button = screen.getByRole('button', { name: 'Thêm vào giỏ' });
    fireEvent.click(button);
    await waitFor(() => expect(store.getState().cart.items).toHaveLength(1));
    expect(store.getState().cart.items[0]).toMatchObject({ variantId: 42, quantity: 1 });
    expect(button).toBeEnabled();
    expect(cartService.addItem).not.toHaveBeenCalled();
  });
});
