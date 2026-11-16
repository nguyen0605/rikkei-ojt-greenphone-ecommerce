import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import filterReducer, { toggleRam } from '@/store/slices/filterSlice';
import authReducer from '@/store/slices/authSlice';
import cartReducer from '@/store/slices/cartSlice';
import ProductsPage from '../ProductsPage';
import { phoneService, brandService, optionService } from '@/services';

vi.mock('@/services', () => ({
  phoneService: {
    list: vi.fn().mockResolvedValue({
      content: [],
      totalElements: 57,
      totalPages: 5,
      size: 12,
      page: 0,
      last: false,
    }),
    search: vi.fn().mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 12,
      page: 0,
      last: true,
    }),
    filters: vi.fn().mockResolvedValue({}),
  },
  brandService: {
    list: vi.fn().mockResolvedValue([]),
  },
  optionService: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

function renderAppWithNavigation(initialRoute = '/san-pham', preloadedFilterState = {}) {
  const store = configureStore({
    reducer: {
      filter: filterReducer,
      auth: authReducer,
      cart: cartReducer,
    },
    preloadedState: {
      filter: {
        brandIds: [],
        priceRange: [0, 50_000_000] as [number, number],
        rams: [],
        storages: [],
        colors: [],
        features: [],
        search: '',
        sortBy: 'newest' as const,
        ...preloadedFilterState,
      },
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const utils = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <header>
            <Link data-testid="nav-home" to="/">Trang chủ</Link>
            <Link data-testid="nav-products" to="/san-pham">Sản phẩm</Link>
          </header>
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Trang chủ</div>} />
            <Route path="/san-pham" element={<ProductsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );

  return { store, ...utils };
}

describe('ProductsPage Navigation & Filter Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('khi người dùng lọc RAM 4GB, rời sang Trang chủ rồi quay lại Sản phẩm: bộ lọc được reset sạch về mặc định', async () => {
    const { store } = renderAppWithNavigation('/san-pham');

    // Chờ ProductsPage render xong
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Xóa lọc/i })).toBeInTheDocument();
    });

    // Giả lập người dùng tick chọn RAM 4GB
    store.dispatch(toggleRam('4GB'));
    expect(store.getState().filter.rams).toEqual(['4GB']);

    // Người dùng bấm về Trang chủ
    fireEvent.click(screen.getByTestId('nav-home'));
    expect(screen.getByTestId('home-page')).toBeInTheDocument();

    // Reset mock calls để kiểm tra lần gọi tiếp theo
    vi.mocked(phoneService.list).mockClear();

    // Người dùng bấm menu "Sản phẩm" để quay lại /san-pham không có param
    fireEvent.click(screen.getByTestId('nav-products'));

    // Kỳ vọng: Redux filter đã được clearAllFilters() dọn sạch
    await waitFor(() => {
      expect(store.getState().filter.rams).toEqual([]);
      expect(store.getState().filter.brandIds).toEqual([]);
      expect(store.getState().filter.storages).toEqual([]);
    });

    // Kỳ vọng: API list được gọi mà KHÔNG chứa param rams=4GB
    await waitFor(() => {
      expect(phoneService.list).toHaveBeenCalled();
      const lastCallArgs = vi.mocked(phoneService.list).mock.calls.at(-1)?.[0];
      expect(lastCallArgs?.rams).toBeUndefined();
    });
  });

  it('khi đang ở trang /san-pham có bộ lọc RAM, bấm lại link "Sản phẩm" trên Header: tự động reset bộ lọc', async () => {
    const { store } = renderAppWithNavigation('/san-pham');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Xóa lọc/i })).toBeInTheDocument();
    });

    // Tick chọn RAM 4GB
    store.dispatch(toggleRam('4GB'));
    expect(store.getState().filter.rams).toEqual(['4GB']);

    // Bấm link "Sản phẩm" trên Header
    fireEvent.click(screen.getByTestId('nav-products'));

    await waitFor(() => {
      expect(store.getState().filter.rams).toEqual([]);
    });
  });
});
