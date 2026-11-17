import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import authReducer from '@/store/slices/authSlice';
import cartReducer from '@/store/slices/cartSlice';
import checkoutReducer from '@/store/slices/checkoutSlice';
import wishlistReducer from '@/store/slices/wishlistSlice';
import ProductDetailPage from '../ProductDetailPage';
import { phoneService } from '@/services';
import { formatVND } from '@/utils';
import type { PhoneDetailDTO } from '@/types/api';

vi.mock('@/services', () => ({
  phoneService: {
    detail: vi.fn(),
    list: vi.fn().mockResolvedValue({ content: [] }),
    search: vi.fn(),
  },
  cartService: {
    addItem: vi.fn(),
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
  rearCamera: '48MP',
  frontCamera: '12MP',
  battery: '4422 mAh',
  os: 'iOS 17',
  warranty: '12 tháng',
  description: 'Khung titan đẳng cấp.',
  mainImageUrl: 'https://example.com/main.jpg',
  status: 'ACTIVE',
  reviewCount: 10,
  variantCount: 1,
  avgRating: 5.0,
  lowestPrice: 28990000,
  images: [{ id: 1, phoneId: 1, imageUrl: 'https://example.com/img1.jpg', isMain: true }],
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
      sku: 'IP15PM-256',
      status: 'ACTIVE',
    },
  ],
};

function renderProductDetailPage() {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
      checkout: checkoutReducer,
      wishlist: wishlistReducer,
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/san-pham/1']}>
          <App>
            <Routes>
              <Route path="/san-pham/:id" element={<ProductDetailPage />} />
            </Routes>
          </App>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('ProductDetailPage Mobile Sticky Action Bar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(phoneService.detail).mockResolvedValue(mockPhoneDetail);
  });

  it('hiển thị thanh công cụ dính đáy với giá bán và 2 nút Mua ngay, Thêm vào giỏ hàng', async () => {
    renderProductDetailPage();

    const actionBar = await screen.findByTestId('pdp-action-bar');
    expect(actionBar).toBeInTheDocument();

    // Kiểm tra class fixed bottom bar và z-index
    expect(actionBar.className).toContain('fixed');
    expect(actionBar.className).toContain('bottom-0');
    expect(actionBar.className).toContain('z-50');

    // Kiểm tra 2 nút bấm
    const buyNowBtn = screen.getByTestId('buy-now-button');
    const addToCartBtn = screen.getByTestId('add-to-cart-button');
    expect(buyNowBtn).toBeInTheDocument();
    expect(addToCartBtn).toBeInTheDocument();
    expect(buyNowBtn).toHaveTextContent('Mua ngay');
    expect(addToCartBtn).toHaveTextContent('Thêm vào giỏ hàng');

    // Kiểm tra hiển thị giá bán
    expect(screen.getAllByText(formatVND(28990000)).length).toBeGreaterThanOrEqual(1);
  });

  it('thêm sản phẩm vào giỏ khi click [Thêm vào giỏ hàng]', async () => {
    renderProductDetailPage();

    const addToCartBtn = await screen.findByTestId('add-to-cart-button');
    fireEvent.click(addToCartBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã thêm iPhone 15 Pro Max vào giỏ hàng/i)).toBeInTheDocument();
    });
  });
});
