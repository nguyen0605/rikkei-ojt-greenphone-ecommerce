import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import { BranchStockAvailability } from '../BranchStockAvailability';
import { warehouseService, type WarehouseBranchStock } from '@/services/warehouseService';

vi.mock('@/services/warehouseService', () => ({
  warehouseService: {
    getVariantBranchStocks: vi.fn(),
  },
}));

const mockBranches: WarehouseBranchStock[] = [
  {
    id: 1,
    code: 'WH-HN-MAIN',
    name: 'Kho Tổng Hà Nội',
    address: 'Tòa nhà FPT, Cầu Giấy, Hà Nội',
    province: 'Hà Nội',
    district: 'Cầu Giấy',
    phone: '024 7106 9999',
    latitude: 21.0285,
    longitude: 105.8542,
    distanceKm: 1143.5,
    quantity: 17,
    inStock: true,
    status: 'ACTIVE',
  },
  {
    id: 2,
    code: 'WH-HCM-Q1',
    name: 'Kho Chi Nhánh TP.HCM',
    address: 'Quận 1, TP. Hồ Chí Minh',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    phone: '028 7108 9999',
    latitude: 10.7769,
    longitude: 106.7009,
    distanceKm: 0.0,
    quantity: 17,
    inStock: true,
    status: 'ACTIVE',
  },
  {
    id: 3,
    code: 'WH-DN-HAI',
    name: 'Kho Chi Nhánh Đà Nẵng',
    address: 'Số 155 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng',
    province: 'Đà Nẵng',
    district: 'Hải Châu',
    phone: '0236 7109 999',
    latitude: 16.0544,
    longitude: 108.2022,
    distanceKm: 608.87,
    quantity: 0,
    inStock: false,
    status: 'ACTIVE',
  },
];

describe('BranchStockAvailability Component (CellphoneS style)', () => {
  let queryClient: QueryClient;
  const createTestStore = (userAddress?: string) =>
    configureStore({
      reducer: {
        auth: authReducer,
      },
      preloadedState: {
        auth: {
          user: userAddress
            ? { id: 1, fullName: 'Test User', email: 'test@example.com', phone: '0912345678', address: userAddress, role: 'ROLE_USER' }
            : null,
          token: null,
          isAuthenticated: !!userAddress,
          loading: false,
          error: null,
          errorCode: null,
          rememberedEmail: null,
        },
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.mocked(warehouseService.getVariantBranchStocks).mockResolvedValue(mockBranches);
  });

  it('hien thi dung tieu de va so luong chi nhanh con hang', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BranchStockAvailability variantId={602} variantName="16GB/512GB — Đen" />
        </QueryClientProvider>
      </Provider>
    );

    expect(screen.getByText('Xem chi nhánh có hàng')).toBeInTheDocument();
    expect(screen.getByText(/16GB\/512GB — Đen/)).toBeInTheDocument();

    await waitFor(() => {
      // 2 branches have stock > 0 (HN and HCM)
      expect(screen.getByText(/Có/)).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText(/cửa hàng có sản phẩm/)).toBeInTheDocument();
    });
  });

  it('hien thi thong tin dia chi, hotline, ban do va so luong tung chi nhanh', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BranchStockAvailability variantId={602} variantName="16GB/512GB — Đen" />
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Kho Tổng Hà Nội')).toBeInTheDocument();
      expect(screen.getByText('Kho Chi Nhánh TP.HCM')).toBeInTheDocument();
      expect(screen.getByText('Kho Chi Nhánh Đà Nẵng')).toBeInTheDocument();
    });

    expect(screen.getByText(/Tòa nhà FPT, Cầu Giấy, Hà Nội/)).toBeInTheDocument();
    expect(screen.getByText('024 7106 9999')).toBeInTheDocument();
    expect(screen.getByText('028 7108 9999')).toBeInTheDocument();
    expect(screen.getByText('0236 7109 999')).toBeInTheDocument();

    // Check stock badges
    const inStockBadges = screen.getAllByText('Còn hàng');
    expect(inStockBadges.length).toBe(2);

    expect(screen.getByText('Tạm hết hàng')).toBeInTheDocument();
  });

  it('tu dong pre-select tinh thanh theo dia chi nguoi dung da luu', async () => {
    const store = createTestStore('Quận 1, TP. Hồ Chí Minh');
    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BranchStockAvailability variantId={602} variantName="16GB/512GB — Đen" />
        </QueryClientProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Kho Chi Nhánh TP.HCM')).toBeInTheDocument();
    });
  });
});
