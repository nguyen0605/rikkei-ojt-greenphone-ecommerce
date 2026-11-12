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
import ProductDetailPage from '../ProductDetailPage';
import { phoneService, cartService } from '@/services';
import { ROUTES } from '@/routes/routePaths';
import type { CartDTO, PhoneDetailDTO } from '@/types/api';
import type { CartItem } from '@/types';

vi.mock('@/services', () => ({
  phoneService: {
    detail: vi.fn(),
    list: vi.fn().mockResolvedValue({ content: [] }),
    search: vi.fn(),
  },
  cartService: {
    get: vi.fn(),
    addItem: vi.fn(),
    sync: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  reviewService: {
    getByPhoneId: vi.fn().mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 10,
      number: 0,
      first: true,
      last: true,
      empty: true,
    }),
    getSummary: vi.fn().mockResolvedValue({
      phoneId: 1,
      averageRating: 5.0,
      totalReviews: 0,
      ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      hasPurchased: false,
    }),
  },
  promotionService: {
    myPromotions: vi.fn().mockResolvedValue([]),
  },
}));

const mockPhoneDetail: PhoneDetailDTO = {
  id: 1,
  name: 'iPhone 15 Pro Max',
  brandId: 1,
  brandName: 'Apple',
  screen: '6.7 inch Super Retina XDR',
  chip: 'Apple A17 Pro',
  rearCamera: '48MP + 12MP + 12MP',
  frontCamera: '12MP',
  battery: '4422 mAh',
  os: 'iOS 17',
  warranty: '12 tháng',
  description: 'Khung titan đẳng cấp.',
  mainImageUrl: 'https://example.com/main.jpg',
  status: 'ACTIVE',
  images: [
    { id: 1, phoneId: 1, imageUrl: 'https://example.com/img1.jpg', isMain: true },
    { id: 2, phoneId: 1, imageUrl: 'https://example.com/img2.jpg', isMain: false },
  ],
  variants: [
    {
      id: 10,
      phoneId: 1,
      ramItemId: 1,
      storageItemId: 2,
      colorItemId: 3,
      ram: '8GB',
      storage: '256GB',
      color: 'Titan Tự Nhiên',
      price: 29990000,
      discountPrice: 28990000,
      stockQuantity: 10,
      sku: 'IP15PM-256-TN',
      status: 'ACTIVE',
    },
    {
      id: 11,
      phoneId: 1,
      ramItemId: 1,
      storageItemId: 4,
      colorItemId: 5,
      ram: '8GB',
      storage: '512GB',
      color: 'Titan Đen',
      price: 34990000,
      discountPrice: null,
      stockQuantity: 5,
      sku: 'IP15PM-512-TD',
      status: 'ACTIVE',
    },
  ],
  avgRating: 5.0,
  reviewCount: 1,
  variantCount: 2,
  lowestPrice: 28990000,
};

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname}</div>;
}

interface RenderOptions {
  isAuthenticated?: boolean;
  initialStep?: 1 | 2 | 3;
  phoneData?: PhoneDetailDTO;
  initialEntry?: string;
  initialCartItems?: CartItem[];
}

function renderPDP({
  isAuthenticated = false,
  initialStep = 1,
  phoneData = mockPhoneDetail,
  initialEntry = '/san-pham/1',
  initialCartItems = [],
}: RenderOptions = {}) {
  vi.mocked(phoneService.detail).mockResolvedValue(phoneData);

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
      cart: {
        items: initialCartItems,
        appliedVoucher: null,
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
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/san-pham/:id" element={<ProductDetailPage />} />
              <Route
                path={ROUTES.CHECKOUT}
                element={<div data-testid="checkout-step-1-page">Checkout Page</div>}
              />
            </Routes>
            <LocationDisplay />
          </MemoryRouter>
        </App>
      </QueryClientProvider>
    </Provider>
  );

  return { ...view, store };
}

describe('PDP Mua ngay (Buy Now) & Quick Checkout Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('hiển thị nút "Mua ngay" nổi bật cạnh nút "Thêm vào giỏ hàng" với responsive sticky/full-width bar', async () => {
    renderPDP();

    const buyNowBtn = await screen.findByTestId('buy-now-button');
    const addToCartBtn = screen.getByTestId('add-to-cart-button');
    const actionBar = screen.getByTestId('pdp-action-bar');

    expect(buyNowBtn).toBeInTheDocument();
    expect(buyNowBtn).toHaveTextContent('Mua ngay');
    expect(buyNowBtn.querySelector('svg')).toBeNull();
    expect(buyNowBtn).toBeEnabled();
    expect(addToCartBtn).toBeInTheDocument();
    expect(actionBar.className).toContain('fixed');
    expect(actionBar.className).toContain('sm:static');
    expect(buyNowBtn.className).toContain('!w-full');
    expect(buyNowBtn.className).toContain('sm:!flex-1');
  });

  it('CẤM bấm "Mua ngay" khi biến thể hết hàng (stockQuantity <= 0)', async () => {
    const outOfStockPhone: PhoneDetailDTO = {
      ...mockPhoneDetail,
      variants: [
        {
          ...mockPhoneDetail.variants[0],
          stockQuantity: 0,
        },
      ],
    };

    const { store } = renderPDP({ phoneData: outOfStockPhone });

    const buyNowBtn = await screen.findByTestId('buy-now-button');
    expect(buyNowBtn).toBeDisabled();

    fireEvent.click(buyNowBtn);
    expect(store.getState().cart.items).toHaveLength(0);
    expect(screen.getByTestId('current-location')).toHaveTextContent('/san-pham/1');
  });

  it('CẤM bấm "Mua ngay" khi biến thể hoặc sản phẩm ngừng kinh doanh (INACTIVE)', async () => {
    const inactiveVariantPhone: PhoneDetailDTO = {
      ...mockPhoneDetail,
      variants: [
        {
          ...mockPhoneDetail.variants[0],
          status: 'INACTIVE',
        },
      ],
    };

    renderPDP({ phoneData: inactiveVariantPhone });

    const buyNowBtn = await screen.findByTestId('buy-now-button');
    expect(buyNowBtn).toBeDisabled();
  });

  it('Guest Checkout: cô lập riêng 1 sản phẩm Mua ngay, giữ nguyên giỏ cũ, ép Step 1 và chuyển tới /thanh-toan', async () => {
    const existingCartItem: CartItem = {
      id: 'existing-999',
      productId: '99',
      variantId: 999,
      quantity: 2,
      addedAt: '2026-11-11T00:00:00.000Z',
      product: {
        id: '99',
        slug: 'samsung-s24',
        name: 'Samsung Galaxy S24',
        brand: 'samsung',
        category: 'smartphone',
        price: 20000000,
        rating: 5,
        reviewCount: 0,
        sold: 0,
        images: [],
        thumbnail: '',
        colors: [],
        storage: [],
        description: '',
        specifications: [],
        features: [],
        inStock: true,
      },
    };
    const { store } = renderPDP({
      isAuthenticated: false,
      initialStep: 2,
      initialCartItems: [existingCartItem],
    });

    const buyNowBtn = await screen.findByTestId('buy-now-button');
    expect(store.getState().checkout.currentStep).toBe(2);

    fireEvent.click(buyNowBtn);

    await waitFor(() => {
      expect(screen.getByTestId('checkout-step-1-page')).toBeInTheDocument();
    });

    expect(cartService.addItem).not.toHaveBeenCalled();
    expect(store.getState().cart.items).toHaveLength(1);
    expect(store.getState().cart.items[0].variantId).toBe(999);
    expect(store.getState().checkout.buyNowItem).toMatchObject({
      variantId: 10,
      quantity: 1,
    });
    expect(store.getState().checkout.currentStep).toBe(1);
    expect(screen.getByTestId('current-location')).toHaveTextContent(ROUTES.CHECKOUT);
  });

  it('Authenticated user: đổi biến thể rồi bấm Mua ngay -> chỉ chọn đúng biến thể đó, không thêm vào giỏ DB', async () => {
    const { store } = renderPDP({ isAuthenticated: true, initialStep: 3 });

    // Chọn biến thể thứ 2 (id = 11)
    const variant11Radio = await screen.findByTestId('variant-radio-11');
    fireEvent.click(variant11Radio);

    const buyNowBtn = screen.getByTestId('buy-now-button');
    fireEvent.click(buyNowBtn);

    await waitFor(() => {
      expect(screen.getByTestId('checkout-step-1-page')).toBeInTheDocument();
    });

    expect(cartService.addItem).not.toHaveBeenCalled();
    expect(store.getState().checkout.currentStep).toBe(1);
    expect(store.getState().checkout.buyNowItem).toMatchObject({
      variantId: 11,
      quantity: 1,
      selectedStorage: '512GB',
      selectedColor: 'Titan Đen',
    });
    expect(screen.getByTestId('current-location')).toHaveTextContent(ROUTES.CHECKOUT);
  });

  it('Khóa cả 2 nút và chống spam request khi thao tác giỏ hàng đang gửi API', async () => {
    let resolveAddItem!: (val: CartDTO) => void;
    vi.mocked(cartService.addItem).mockReturnValue(
      new Promise<CartDTO>((resolve) => {
        resolveAddItem = resolve;
      })
    );

    renderPDP({ isAuthenticated: true });

    const buyNowBtn = await screen.findByTestId('buy-now-button');
    const addToCartBtn = screen.getByTestId('add-to-cart-button');

    fireEvent.click(addToCartBtn);

    await waitFor(() => {
      expect(addToCartBtn).toHaveClass('ant-btn-loading');
      expect(addToCartBtn).toBeDisabled();
      expect(buyNowBtn).toBeDisabled();
    });

    fireEvent.click(addToCartBtn);
    fireEvent.click(buyNowBtn);
    expect(cartService.addItem).toHaveBeenCalledTimes(1);

    resolveAddItem({
      id: 1,
      userId: 7,
      items: [],
      totalAmount: 0,
      totalItems: 0,
    });

    await waitFor(() => {
      expect(addToCartBtn).toBeEnabled();
      expect(buyNowBtn).toBeEnabled();
    });
  });

  it('Nút Thêm vào giỏ hàng mở lại nếu API addCartItem thất bại', async () => {
    vi.mocked(cartService.addItem).mockRejectedValue(new Error('Insufficient stock'));

    renderPDP({ isAuthenticated: true });

    const addToCartBtn = await screen.findByTestId('add-to-cart-button');
    fireEvent.click(addToCartBtn);

    await waitFor(() => {
      expect(cartService.addItem).toHaveBeenCalledTimes(1);
      expect(addToCartBtn).toBeEnabled();
      expect(addToCartBtn).not.toHaveClass('ant-btn-loading');
    });

    expect(screen.queryByTestId('checkout-step-1-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-location')).toHaveTextContent('/san-pham/1');
  });
});

