import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import authReducer from '@/store/slices/authSlice';
import cartReducer from '@/store/slices/cartSlice';
import checkoutReducer, { startBuyNow, updateShipping } from '@/store/slices/checkoutSlice';
import settingsReducer from '@/store/slices/settingsSlice';
import CheckoutPage from '../CheckoutPage';
import { orderService } from '@/services';
import { ROUTES } from '@/routes/routePaths';
import type { CartItem } from '@/types';

vi.mock('@/services', () => ({
  orderService: {
    create: vi.fn(),
  },
  paymentService: {
    create: vi.fn(),
  },
  phoneService: {
    detail: vi.fn(),
  },
  userService: {
    getAddresses: vi.fn().mockResolvedValue([]),
  },
  promotionService: {
    available: vi.fn().mockResolvedValue([]),
  },
}));

const cartSamsungItem: CartItem = {
  id: 'cart-200',
  productId: '200',
  variantId: 2001,
  quantity: 2,
  selectedColor: 'Đen',
  selectedStorage: '256GB',
  addedAt: '2026-11-11T00:00:00.000Z',
  product: {
    id: '200',
    slug: 'samsung-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra',
    brand: 'samsung',
    category: 'smartphone',
    price: 25000000,
    rating: 5,
    reviewCount: 0,
    sold: 0,
    images: ['https://example.com/iphone.jpg'],
    thumbnail: 'https://example.com/iphone.jpg',
    colors: [],
    storage: [],
    description: '',
    specifications: [],
    features: [],
    inStock: true,
  },
};

const buyNowIphoneItem: CartItem = {
  id: 'buy-now-101',
  productId: '100',
  variantId: 101,
  quantity: 1,
  maxStock: 2,
  selectedColor: 'Titan Tự Nhiên',
  selectedStorage: '256GB',
  addedAt: '2026-11-11T01:00:00.000Z',
  product: {
    id: '100',
    slug: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    brand: 'apple',
    category: 'smartphone',
    price: 28000000,
    rating: 5,
    reviewCount: 0,
    sold: 0,
    images: ['https://example.com/iphone.jpg'],
    thumbnail: 'https://example.com/iphone.jpg',
    colors: [],
    storage: [],
    description: '',
    specifications: [],
    features: [],
    inStock: true,
  },
};

describe('CheckoutPage Buy Now isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('chỉ hiển thị và tạo đơn đúng 1 sản phẩm Mua ngay, giữ nguyên sản phẩm đang có trong giỏ', async () => {
    vi.mocked(orderService.create).mockResolvedValue({
      id: 777,
      userId: 7,
      userName: 'Nguyen Van A',
      receiverName: 'Nguyen Van A',
      receiverPhone: '0987654321',
      shippingAddress: '123 Le Loi, Q1',
      totalAmount: 28000000,
      discountAmount: 0,
      finalAmount: 28000000,
      orderStatus: 'PENDING',
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      note: '',
      promotionCode: '',
      createdAt: '2026-11-11T01:00:00Z',
      orderDetails: [],
    });

    const store = configureStore({
      reducer: {
        auth: authReducer,
        cart: cartReducer,
        checkout: checkoutReducer,
        settings: settingsReducer,
      },
      preloadedState: {
        auth: {
          user: { id: 7, fullName: 'Nguyen Van A', email: 'a@test.com', role: 'CUSTOMER' as const },
          token: 'jwt',
          isAuthenticated: true,
          loading: false,
          error: null,
          errorCode: null,
          rememberedEmail: null,
        },
        cart: {
          items: [cartSamsungItem],
          appliedVoucher: null,
        },
      },
    });

    store.dispatch(startBuyNow(buyNowIphoneItem));
    store.dispatch(
      updateShipping({
        fullName: 'Nguyen Van A',
        phone: '0987654321',
        address: '123 Le Loi, Q1',
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <App>
            <MemoryRouter initialEntries={[ROUTES.CHECKOUT]}>
              <Routes>
                <Route path={ROUTES.CHECKOUT} element={<CheckoutPage />} />
                <Route path="/thanh-toan/hoan-tat" element={<div data-testid="success-page">Done</div>} />
              </Routes>
            </MemoryRouter>
          </App>
        </QueryClientProvider>
      </Provider>,
    );

    // Chỉ hiện đúng 1 sản phẩm Mua ngay, KHÔNG hiện sản phẩm cũ trong giỏ
    expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    expect(screen.getByText('(1 sản phẩm)')).toBeInTheDocument();
    expect(screen.getByText('Mua ngay')).toBeInTheDocument();
    expect(screen.queryByText('Samsung Galaxy S24 Ultra')).not.toBeInTheDocument();

    // Có thể tăng/giảm bằng nút hoặc nhập trực tiếp số lượng (giới hạn 1..maxStock)
    const decreaseBtn = screen.getByTestId('buy-now-qty-decrease');
    const increaseBtn = screen.getByTestId('buy-now-qty-increase');
    const qtyInput = screen.getByTestId('buy-now-qty-input');
    expect(decreaseBtn).toBeDisabled();
    expect(qtyInput).toHaveValue('1');

    // Nhập trực tiếp: xóa trống rồi gõ vượt tồn kho -> tự giới hạn về maxStock = 2
    fireEvent.focus(qtyInput);
    fireEvent.change(qtyInput, { target: { value: '' } });
    expect(qtyInput).toHaveValue('');
    fireEvent.change(qtyInput, { target: { value: '99' } });
    fireEvent.blur(qtyInput);
    expect(qtyInput).toHaveValue('2');
    expect(increaseBtn).toBeDisabled();
    expect(decreaseBtn).toBeEnabled();

    // Bấm giảm về 1 rồi bấm tăng lên 2
    fireEvent.click(decreaseBtn);
    expect(qtyInput).toHaveValue('1');
    fireEvent.click(increaseBtn);
    expect(qtyInput).toHaveValue('2');

    // Sang Bước 2 & đặt hàng
    fireEvent.click(screen.getByRole('button', { name: /tiếp tục xác nhận đơn hàng/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /đặt hàng \(cod\)/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /đặt hàng \(cod\)/i }));

    await waitFor(() => {
      expect(orderService.create).toHaveBeenCalledTimes(1);
    });

    expect(orderService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        buyNow: true,
        items: [{ phoneVariantId: 101, quantity: 2 }],
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('success-page')).toBeInTheDocument();
    });

    // Giỏ hàng cũ vẫn nguyên vẹn 100%, buyNowItem đã được dọn
    expect(store.getState().cart.items).toHaveLength(1);
    expect(store.getState().cart.items[0].variantId).toBe(2001);
    expect(store.getState().checkout.buyNowItem).toBeUndefined();
  });
});

