import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import authReducer from '@/store/slices/authSlice';
import cartReducer from '@/store/slices/cartSlice';
import checkoutReducer, { setCurrentStep } from '@/store/slices/checkoutSlice';
import wishlistReducer from '@/store/slices/wishlistSlice';
import ProductCard from '../ProductCard';
import { phoneService, cartService } from '@/services';
import { ROUTES } from '@/routes/routePaths';
import type { PhoneDTO, PhoneDetailDTO } from '@/types/api';

vi.mock('@/services', () => ({
  phoneService: {
    detail: vi.fn(),
  },
  cartService: {
    get: vi.fn(),
    addItem: vi.fn(),
    sync: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  promotionService: {
    myPromotions: vi.fn().mockResolvedValue([]),
  },
}));

const mockProduct: PhoneDTO = {
  id: 1,
  name: 'OPPO Find N3 Flip 256GB',
  brandId: 2,
  brandName: 'OPPO',
  screen: '6.7 inch AMOLED 120Hz Full HD+',
  chip: 'Dimensity 9200',
  rearCamera: '50MP',
  frontCamera: '32MP',
  battery: '4300 mAh',
  os: 'Android 13',
  warranty: '12 tháng',
  description: 'Màn hình gập đẳng cấp.',
  mainImageUrl: 'https://example.com/oppo.jpg',
  status: 'ACTIVE',
  variantCount: 2,
  avgRating: 4.9,
  lowestPrice: 19990000,
};

const mockDetail: PhoneDetailDTO = {
  ...mockProduct,
  images: [{ id: 1, phoneId: 1, imageUrl: 'https://example.com/oppo.jpg', isMain: true }],
  variants: [
    {
      id: 101,
      phoneId: 1,
      ramItemId: 1,
      storageItemId: 2,
      colorItemId: 3,
      ram: '12GB',
      storage: '256GB',
      color: 'Vàng',
      price: 19990000,
      discountPrice: null,
      stockQuantity: 5,
      sku: 'OPPO-N3-256-G',
      status: 'ACTIVE',
    },
  ],
  reviewCount: 3,
};

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname}</div>;
}

function renderCard({
  isAuthenticated = false,
  initialStep = 1,
}: {
  isAuthenticated?: boolean;
  initialStep?: 1 | 2 | 3;
} = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
      checkout: checkoutReducer,
      wishlist: wishlistReducer,
    },
    preloadedState: {
      auth: {
        user: isAuthenticated
          ? { id: 7, fullName: 'Nguyen Van A', email: 'test@greenphone.vn', role: 'CUSTOMER' as const }
          : null,
        token: isAuthenticated ? 'jwt-token' : null,
        isAuthenticated,
        loading: false,
        error: null,
        errorCode: null,
        rememberedEmail: null,
      },
    },
  });

  if (initialStep !== 1) {
    store.dispatch(setCurrentStep(initialStep));
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App>
          <MemoryRouter initialEntries={[ROUTES.PRODUCTS]}>
            <Routes>
              <Route path={ROUTES.PRODUCTS} element={<ProductCard product={mockProduct} />} />
              <Route path={ROUTES.CHECKOUT} element={<div>Checkout Page</div>} />
            </Routes>
            <LocationDisplay />
          </MemoryRouter>
        </App>
      </QueryClientProvider>
    </Provider>,
  );

  return { ...view, store };
}

describe('ProductCard Mua ngay & Thêm vào giỏ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('hiển thị nút "Mua ngay" lớn (không icon sấm sét) và nút icon giỏ hàng rút gọn', () => {
    renderCard();

    const buyNowBtn = screen.getByTestId('product-card-buy-now-1');
    const addToCartBtn = screen.getByTestId('product-card-add-to-cart-1');

    expect(buyNowBtn).toBeInTheDocument();
    expect(buyNowBtn).toHaveTextContent('Mua ngay');
    expect(buyNowBtn.className).toContain('flex-1');
    expect(buyNowBtn.querySelector('svg')).toBeNull();

    expect(addToCartBtn).toBeInTheDocument();
    expect(addToCartBtn).toHaveAttribute('aria-label', 'Thêm vào giỏ');
    expect(addToCartBtn.textContent?.trim()).toBe('');
    expect(addToCartBtn.querySelector('svg')).not.toBeNull();
  });

  it('Guest bấm "Mua ngay" trên ProductCard: cô lập 1 sản phẩm vào buyNowItem, không sửa giỏ hàng và chuyển tới /thanh-toan', async () => {
    vi.mocked(phoneService.detail).mockResolvedValue(mockDetail);

    const { store } = renderCard({ isAuthenticated: false, initialStep: 3 });

    fireEvent.click(screen.getByTestId('product-card-buy-now-1'));

    await waitFor(() => {
      expect(screen.getByTestId('current-location')).toHaveTextContent(ROUTES.CHECKOUT);
    });

    expect(cartService.addItem).not.toHaveBeenCalled();
    expect(store.getState().checkout.currentStep).toBe(1);
    expect(store.getState().cart.items).toHaveLength(0);
    expect(store.getState().checkout.buyNowItem).toMatchObject({
      variantId: 101,
      quantity: 1,
    });
  });

  it('Khách đã đăng nhập bấm "Mua ngay" trên ProductCard: không gọi API addItem giỏ hàng, đặt buyNowItem + Step 1 và chuyển tới /thanh-toan', async () => {
    vi.mocked(phoneService.detail).mockResolvedValue(mockDetail);

    const { store } = renderCard({ isAuthenticated: true, initialStep: 2 });

    fireEvent.click(screen.getByTestId('product-card-buy-now-1'));

    await waitFor(() => {
      expect(screen.getByTestId('current-location')).toHaveTextContent(ROUTES.CHECKOUT);
    });
    expect(cartService.addItem).not.toHaveBeenCalled();
    expect(store.getState().checkout.currentStep).toBe(1);
    expect(store.getState().checkout.buyNowItem).toMatchObject({
      variantId: 101,
      quantity: 1,
    });
  });

  it('không thêm giỏ hoặc chuyển trang khi sản phẩm hết hàng hoặc ngừng kinh doanh', async () => {
    vi.mocked(phoneService.detail).mockResolvedValue({
      ...mockDetail,
      variants: [{ ...mockDetail.variants[0], stockQuantity: 0 }],
    });

    const { store } = renderCard({ isAuthenticated: false });

    fireEvent.click(screen.getByTestId('product-card-buy-now-1'));

    await waitFor(() => {
      expect(phoneService.detail).toHaveBeenCalledTimes(1);
    });

    expect(store.getState().cart.items).toHaveLength(0);
    expect(screen.getByTestId('current-location')).toHaveTextContent(ROUTES.PRODUCTS);
  });

  it('vô hiệu hóa cả 2 nút và hiện loading khi đang xử lý để chống bấm liên tục', async () => {
    let resolveDetail!: (value: PhoneDetailDTO) => void;
    vi.mocked(phoneService.detail).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDetail = resolve;
        }),
    );

    renderCard({ isAuthenticated: false });

    const buyNowBtn = screen.getByTestId('product-card-buy-now-1');
    const addToCartBtn = screen.getByTestId('product-card-add-to-cart-1');

    fireEvent.click(buyNowBtn);

    await waitFor(() => {
      expect(buyNowBtn).toBeDisabled();
      expect(addToCartBtn).toBeDisabled();
      expect(buyNowBtn).toHaveTextContent('Đang xử lý...');
    });

    fireEvent.click(buyNowBtn);
    expect(phoneService.detail).toHaveBeenCalledTimes(1);

    resolveDetail(mockDetail);

    await waitFor(() => {
      expect(screen.getByTestId('current-location')).toHaveTextContent(ROUTES.CHECKOUT);
    });
  });
});

