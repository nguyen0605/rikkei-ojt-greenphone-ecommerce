import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import filterReducer from '@/store/slices/filterSlice';
import ProductFilters from '../ProductFilters';

vi.mock('@/services', () => ({
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

function setup(preloadedFilterState = {}) {
  const store = configureStore({
    reducer: {
      filter: filterReducer,
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
        <ProductFilters />
      </QueryClientProvider>
    </Provider>
  );

  return { store, ...utils };
}

describe('ProductFilters Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('khi Redux có rams: ["4GB"], ô 4GB checked=true và "Tất cả sản phẩm" checked=false', async () => {
    setup({ rams: ['4GB'] });

    const allProductsCheckbox = screen.getByLabelText('Tất cả sản phẩm');
    expect(allProductsCheckbox).not.toBeChecked();

    const ram4GbCheckbox = screen.getByLabelText('4GB');
    expect(ram4GbCheckbox).toBeChecked();

    const ram8GbCheckbox = screen.getByLabelText('8GB');
    expect(ram8GbCheckbox).not.toBeChecked();
  });

  it('khi Redux ở trạng thái mặc định rỗng, ô "Tất cả sản phẩm" checked=true', () => {
    setup();

    const allProductsCheckbox = screen.getByLabelText('Tất cả sản phẩm');
    expect(allProductsCheckbox).toBeChecked();

    const ram4GbCheckbox = screen.getByLabelText('4GB');
    expect(ram4GbCheckbox).not.toBeChecked();
  });

  it('bấm vào ô checkbox 4GB gọi dispatch toggleRam("4GB")', () => {
    const { store } = setup();

    const ram4GbCheckbox = screen.getByLabelText('4GB');
    expect(ram4GbCheckbox).not.toBeChecked();

    fireEvent.click(ram4GbCheckbox);

    expect(store.getState().filter.rams).toContain('4GB');
  });

  it('bấm nút "Xóa lọc" kích hoạt action clearAllFilters() xóa sạch mọi bộ lọc', () => {
    const { store } = setup({
      rams: ['8GB'],
      storages: ['256GB'],
      colors: ['black'],
      brandIds: [1],
      features: ['5g'],
      search: 'iphone',
      priceRange: [10_000_000, 30_000_000],
    });

    const clearButton = screen.getByRole('button', { name: /Xóa lọc/i });
    fireEvent.click(clearButton);

    const state = store.getState().filter;
    expect(state.rams).toHaveLength(0);
    expect(state.storages).toHaveLength(0);
    expect(state.colors).toHaveLength(0);
    expect(state.brandIds).toHaveLength(0);
    expect(state.features).toHaveLength(0);
    expect(state.search).toBe('');
    expect(state.priceRange).toEqual([0, 50_000_000]);
  });

  it('bấm ô "Tất cả sản phẩm" khi đang lọc sẽ kích hoạt clearAllFilters()', () => {
    const { store } = setup({
      rams: ['4GB'],
    });

    const allProductsCheckbox = screen.getByLabelText('Tất cả sản phẩm');
    expect(allProductsCheckbox).not.toBeChecked();

    fireEvent.click(allProductsCheckbox);

    const state = store.getState().filter;
    expect(state.rams).toHaveLength(0);
    expect(state.brandIds).toHaveLength(0);
  });
});
