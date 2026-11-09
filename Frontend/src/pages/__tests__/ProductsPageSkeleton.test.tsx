import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import filterReducer from '@/store/slices/filterSlice';
import authReducer from '@/store/slices/authSlice';
import cartReducer from '@/store/slices/cartSlice';
import ProductsPage from '../ProductsPage';
import { phoneService, brandService } from '@/services';

vi.mock('@/services', () => ({
  phoneService: {
    list: vi.fn(),
    search: vi.fn(),
    filters: vi.fn().mockResolvedValue({}),
  },
  brandService: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

function renderProductsPage() {
  const store = configureStore({
    reducer: {
      filter: filterReducer,
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
        <MemoryRouter initialEntries={['/san-pham']}>
          <ProductsPage />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('ProductsPage Skeleton Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị 8 thẻ ProductCardSkeleton khi API đang tải dữ liệu', () => {
    // Để Promise pending
    vi.mocked(phoneService.list).mockReturnValue(new Promise(() => {}));

    renderProductsPage();

    const loadingGrid = screen.getByRole('status', { name: 'Đang tải danh sách sản phẩm' });
    expect(loadingGrid).toBeInTheDocument();

    const skeletons = screen.getAllByLabelText('Đang tải thông tin sản phẩm');
    expect(skeletons).toHaveLength(8);
  });

  it('thay thế Skeleton bằng ProductCard thật khi API tải thành công', async () => {
    vi.mocked(phoneService.list).mockResolvedValue({
      content: [
        {
          id: 1,
          name: 'iPhone 15 Pro Max 256GB',
          brandName: 'Apple',
          lowestPrice: 29990000,
          mainImageUrl: 'https://example.com/iphone15.jpg',
        } as any,
      ],
      totalElements: 1,
      totalPages: 1,
      size: 12,
      page: 0,
      last: true,
    });

    renderProductsPage();

    await waitFor(() => {
      expect(screen.queryByLabelText('Đang tải danh sách sản phẩm')).not.toBeInTheDocument();
      expect(screen.getByText('iPhone 15 Pro Max 256GB')).toBeInTheDocument();
    });
  });

  it('hiển thị Empty State khi API trả về danh sách rỗng', async () => {
    vi.mocked(phoneService.list).mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 12,
      page: 0,
      last: true,
    });

    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy sản phẩm')).toBeInTheDocument();
      expect(screen.getByText('Thử điều chỉnh bộ lọc để xem thêm kết quả')).toBeInTheDocument();
    });
  });
});

