import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import authReducer from '@/store/slices/authSlice';
import cartReducer from '@/store/slices/cartSlice';
import FeaturedProducts from '../FeaturedProducts';
import { phoneService } from '@/services';

vi.mock('@/services', () => ({
  phoneService: {
    list: vi.fn(),
  },
}));

function renderFeaturedProducts() {
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
        <MemoryRouter>
          <FeaturedProducts />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('FeaturedProducts Skeleton Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị 5 thẻ ProductCardSkeleton khi đang tải sản phẩm nổi bật', () => {
    vi.mocked(phoneService.list).mockReturnValue(new Promise(() => {}));

    renderFeaturedProducts();

    const loadingSection = screen.getByRole('status', { name: 'Đang tải sản phẩm nổi bật' });
    expect(loadingSection).toBeInTheDocument();

    const skeletons = screen.getAllByLabelText('Đang tải thông tin sản phẩm');
    expect(skeletons).toHaveLength(5);
  });

  it('hiển thị sản phẩm thật sau khi API hoàn tất', async () => {
    vi.mocked(phoneService.list).mockResolvedValue({
      content: [
        {
          id: 101,
          name: 'Samsung Galaxy S24 Ultra',
          brandName: 'Samsung',
          lowestPrice: 28990000,
          mainImageUrl: 'https://example.com/s24.jpg',
        } as any,
      ],
      totalElements: 1,
      totalPages: 1,
      size: 8,
      page: 0,
      last: true,
    });

    renderFeaturedProducts();

    await waitFor(() => {
      expect(screen.queryByLabelText('Đang tải sản phẩm nổi bật')).not.toBeInTheDocument();
      expect(screen.getByText('Samsung Galaxy S24 Ultra')).toBeInTheDocument();
    });
  });
});

