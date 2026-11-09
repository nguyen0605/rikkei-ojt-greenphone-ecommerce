import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import authReducer from '@/store/slices/authSlice';
import cartReducer from '@/store/slices/cartSlice';
import ProductDetailPage from '../ProductDetailPage';
import { phoneService, reviewService } from '@/services';

vi.mock('@/services', () => ({
  phoneService: {
    detail: vi.fn(),
    list: vi.fn().mockResolvedValue({ content: [] }),
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
}));

function renderPDP(phoneId = '1') {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App>
          <MemoryRouter initialEntries={[`/san-pham/${phoneId}`]}>
            <Routes>
              <Route path="/san-pham/:id" element={<ProductDetailPage />} />
            </Routes>
          </MemoryRouter>
        </App>
      </QueryClientProvider>
    </Provider>
  );
}

describe('ProductDetailPage Skeleton & Gallery Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị ProductDetailSkeleton khi API phone detail đang tải', () => {
    vi.mocked(phoneService.detail).mockReturnValue(new Promise(() => {}));

    renderPDP('1');

    const detailSkeleton = screen.getByRole('status', { name: 'Đang tải chi tiết sản phẩm' });
    expect(detailSkeleton).toBeInTheDocument();
    expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
  });

  it('hiển thị ProductGallery và thông tin sản phẩm khi API tải hoàn tất', async () => {
    vi.mocked(phoneService.detail).mockResolvedValue({
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
      images: [
        { id: 1, phoneId: 1, imageUrl: 'https://example.com/img1.jpg', isMain: true },
        { id: 2, phoneId: 1, imageUrl: 'https://example.com/img2.jpg', isMain: false },
      ],
      variants: [
        {
          id: 10,
          phoneId: 1,
          ram: '8GB',
          storage: '256GB',
          color: 'Titan Tự Nhiên',
          price: 29990000,
          stockQuantity: 10,
        },
      ],
      avgRating: 5.0,
      reviewCount: 1,
    } as any);

    renderPDP('1');

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Đang tải chi tiết sản phẩm' })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'iPhone 15 Pro Max' })).toBeInTheDocument();
      expect(screen.getByTestId('main-product-image')).toBeInTheDocument();
      expect(screen.getByTestId('thumbnail-strip')).toBeInTheDocument();
      expect(screen.getByText('Thêm vào giỏ hàng')).toBeInTheDocument();
    });
  });
});

