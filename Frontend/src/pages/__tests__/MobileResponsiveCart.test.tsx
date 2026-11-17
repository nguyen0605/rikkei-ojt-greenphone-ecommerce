import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import cartReducer from '@/store/slices/cartSlice';
import authReducer from '@/store/slices/authSlice';
import checkoutReducer from '@/store/slices/checkoutSlice';
import CartPage from '../cart/CartPage';
import { phoneService, brandService, promotionService } from '@/services';
import type { CartItem } from '@/types';

vi.mock('@/services', () => ({
  phoneService: {
    list: vi.fn().mockResolvedValue({ content: [] }),
  },
  brandService: {
    list: vi.fn().mockResolvedValue([]),
  },
  promotionService: {
    available: vi.fn().mockResolvedValue([]),
  },
}));

const mockCartItem: CartItem = {
  id: 'cart-1',
  productId: '1',
  quantity: 2,
  selectedColor: 'Titan Tự Nhiên',
  selectedStorage: '256GB',
  addedAt: new Date().toISOString(),
  product: {
    id: '1',
    slug: 'iphone-15-pro-max',
    name: 'iPhone 15 Pro Max',
    brand: 'apple',
    category: 'smartphone',
    price: 29990000,
    originalPrice: 34990000,
    rating: 5,
    reviewCount: 10,
    sold: 100,
    images: ['https://example.com/ip15.jpg'],
    thumbnail: 'https://example.com/ip15-thumb.jpg',
    colors: [],
    storage: [],
    description: '',
    specifications: [],
    features: [],
    inStock: true,
  },
};

function renderCartPage(items: CartItem[] = [mockCartItem]) {
  const store = configureStore({
    reducer: {
      cart: cartReducer,
      auth: authReducer,
      checkout: checkoutReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
        errorCode: null,
        rememberedEmail: null,
      },
      cart: {
        items,
        total: items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
        appliedVoucher: null,
        shippingFee: 0,
        syncStatus: 'idle',
        syncError: null,
      },
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <App>
              <CartPage />
            </App>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    ),
  };
}

describe('CartPage Mobile Responsive & Card Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị thông tin sản phẩm đầy đủ với nhãn phân loại màu sắc/dung lượng', () => {
    renderCartPage();

    // Tên máy và nhãn phân loại
    const names = screen.getAllByText('iPhone 15 Pro Max');
    expect(names.length).toBeGreaterThanOrEqual(1);

    const variants = screen.getAllByText('256GB • Titan Tự Nhiên');
    expect(variants.length).toBeGreaterThanOrEqual(1);
  });

  it('tăng số lượng sản phẩm khi người dùng bấm nút (+)', () => {
    const { store } = renderCartPage();

    const increaseBtns = screen.getAllByLabelText('Tăng số lượng');
    expect(increaseBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(increaseBtns[0]);

    // Redux item quantity tăng từ 2 lên 3
    expect(store.getState().cart.items[0].quantity).toBe(3);
  });

  it('giảm số lượng sản phẩm khi người dùng bấm nút (-)', () => {
    const { store } = renderCartPage();

    const decreaseBtns = screen.getAllByLabelText('Giảm số lượng');
    expect(decreaseBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(decreaseBtns[0]);

    // Redux item quantity giảm từ 2 xuống 1
    expect(store.getState().cart.items[0].quantity).toBe(1);
  });

  it('hiển thị empty state khi giỏ hàng trống', () => {
    renderCartPage([]);

    expect(screen.getByText('Giỏ hàng trống')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tiếp tục mua sắm' })).toBeInTheDocument();
  });
});
