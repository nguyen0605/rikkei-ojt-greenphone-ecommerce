import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import filterReducer from '@/store/slices/filterSlice';
import authReducer from '@/store/slices/authSlice';
import cartReducer from '@/store/slices/cartSlice';
import ProductsPage from '../ProductsPage';
import { phoneService, brandService, optionService } from '@/services';

vi.mock('@/services', () => ({
  phoneService: {
    list: vi.fn(),
    search: vi.fn(),
    filters: vi.fn().mockResolvedValue({}),
  },
  brandService: {
    list: vi.fn().mockResolvedValue([
      { id: 1, name: 'Apple' },
      { id: 2, name: 'Samsung' },
    ]),
  },
  optionService: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

function renderProductsPage(initialEntries = ['/san-pham']) {
  const store = configureStore({
    reducer: {
      filter: filterReducer,
      auth: authReducer,
      cart: cartReducer,
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
          <MemoryRouter initialEntries={initialEntries}>
            <ProductsPage />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    ),
  };
}

describe('ProductsPage Mobile Responsive & Drawer Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(phoneService.list).mockResolvedValue({
      content: [
        {
          id: 1,
          name: 'iPhone 15 Pro Max',
          brandName: 'Apple',
          lowestPrice: 29990000,
          mainImageUrl: 'https://example.com/iphone.jpg',
        } as any,
      ],
      totalElements: 1,
      totalPages: 1,
      size: 12,
      page: 0,
      last: true,
    });
  });

  it('hiển thị nút bấm [Bộ lọc] trên mobile và mở Drawer bộ lọc khi click', async () => {
    renderProductsPage();

    const mobileFilterBtn = screen.getByTestId('mobile-filter-button');
    expect(mobileFilterBtn).toBeInTheDocument();
    expect(mobileFilterBtn).toHaveTextContent('Bộ lọc');

    fireEvent.click(mobileFilterBtn);

    // Drawer bộ lọc mở ra
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Áp dụng/i })).toBeInTheDocument();
    });
  });

  it('hiển thị số lượng tiêu chí lọc đang chọn trên nút [Bộ lọc]', () => {
    renderProductsPage(['/san-pham?brandId=1']);

    const mobileFilterBtn = screen.getByTestId('mobile-filter-button');
    expect(mobileFilterBtn).toHaveTextContent('1');
  });

  it('đóng Drawer khi người dùng bấm nút [Áp dụng]', async () => {
    renderProductsPage();

    const mobileFilterBtn = screen.getByTestId('mobile-filter-button');
    fireEvent.click(mobileFilterBtn);

    const applyBtn = await screen.findByRole('button', { name: /Áp dụng/i });
    expect(applyBtn).toBeInTheDocument();

    fireEvent.click(applyBtn);

    await waitFor(() => {
      // Sau khi bấm Áp dụng, drawer đóng lại (không hiển thị nút Áp dụng trong viewport)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
