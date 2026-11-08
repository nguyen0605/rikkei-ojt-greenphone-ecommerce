import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import OrderHistoryPage from '../OrderHistoryPage';
import { orderService } from '@/services/orderService';
import type { OrderDTO } from '@/types/api';
import cartReducer from '@/store/slices/cartSlice';

vi.mock('@/services/orderService', () => ({
  orderService: {
    list: vi.fn(),
    cancel: vi.fn(),
  },
}));

const mockOrders: OrderDTO[] = [
  {
    id: 101,
    userId: 2,
    userName: 'Nguyễn Văn An',
    receiverName: 'Nguyễn Văn An',
    receiverPhone: '0912345678',
    shippingAddress: '123 Đường Láng',
    totalAmount: 34990000,
    discountAmount: 0,
    finalAmount: 34990000,
    orderStatus: 'PENDING',
    paymentStatus: 'UNPAID',
    paymentMethod: 'VIETQR',
    note: '',
    promotionCode: '',
    createdAt: '2026-08-05T02:20:16',
    orderDetails: [
      {
        id: 1,
        phoneVariantId: 1,
        productName: 'iPhone 15 Pro Max',
        ram: '8GB',
        storage: '256GB',
        color: 'Titan Tự Nhiên',
        unitPrice: 34990000,
        quantity: 1,
        subtotal: 34990000,
      },
    ],
  },
  {
    id: 102,
    userId: 2,
    userName: 'Nguyễn Văn An',
    receiverName: 'Nguyễn Văn An',
    receiverPhone: '0912345678',
    shippingAddress: '123 Đường Láng',
    totalAmount: 24990000,
    discountAmount: 0,
    finalAmount: 24990000,
    orderStatus: 'SHIPPING',
    paymentStatus: 'PAID',
    paymentMethod: 'COD',
    note: '',
    promotionCode: '',
    createdAt: '2026-08-04T10:00:00',
    orderDetails: [
      {
        id: 2,
        phoneVariantId: 2,
        productName: 'Samsung Galaxy S24',
        ram: '8GB',
        storage: '128GB',
        color: 'Xám Titan',
        unitPrice: 24990000,
        quantity: 1,
        subtotal: 24990000,
      },
    ],
  },
  {
    id: 103,
    userId: 2,
    userName: 'Nguyễn Văn An',
    receiverName: 'Nguyễn Văn An',
    receiverPhone: '0912345678',
    shippingAddress: '123 Đường Láng',
    totalAmount: 15000000,
    discountAmount: 0,
    finalAmount: 15000000,
    orderStatus: 'CANCELLED',
    paymentStatus: 'UNPAID',
    paymentMethod: 'COD',
    note: '[Lý do hủy: Đổi ý]',
    promotionCode: '',
    createdAt: '2026-08-03T09:00:00',
    orderDetails: [],
  },
];

function renderWithClient(initialRoute = '/tai-khoan/don-hang') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const store = configureStore({
    reducer: {
      cart: cartReducer,
    },
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/tai-khoan/don-hang" element={<OrderHistoryPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('OrderHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton while fetching data', () => {
    vi.mocked(orderService.list).mockReturnValue(new Promise(() => {})); // Never resolves
    renderWithClient();

    expect(screen.getByTestId('orders-loading')).toBeInTheDocument();
  });

  it('renders all orders in "Tất cả" tab by default', async () => {
    vi.mocked(orderService.list).mockResolvedValue({
      content: mockOrders,
      totalElements: 3,
      totalPages: 1,
      page: 0,
      size: 10,
      last: true,
    });

    renderWithClient();

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
      expect(screen.getByText('#102')).toBeInTheDocument();
      expect(screen.getByText('#103')).toBeInTheDocument();
    });
  });

  it('filters orders when tab is clicked', async () => {
    vi.mocked(orderService.list).mockResolvedValue({
      content: mockOrders,
      totalElements: 3,
      totalPages: 1,
      page: 0,
      size: 10,
      last: true,
    });

    renderWithClient();

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
    });

    // Click "Đang giao hàng" tab
    const shippingTab = screen.getByRole('tab', { name: /đang giao hàng/i });
    await userEvent.click(shippingTab);

    // Only order #102 should be visible
    expect(screen.queryByText('#101')).not.toBeInTheDocument();
    expect(screen.getByText('#102')).toBeInTheDocument();
    expect(screen.queryByText('#103')).not.toBeInTheDocument();
  });

  it('reads status tab directly from initial URL query params', async () => {
    vi.mocked(orderService.list).mockResolvedValue({
      content: mockOrders,
      totalElements: 3,
      totalPages: 1,
      page: 0,
      size: 10,
      last: true,
    });

    renderWithClient('/tai-khoan/don-hang?status=cancelled');

    await waitFor(() => {
      expect(screen.getByText('#103')).toBeInTheDocument();
    });

    expect(screen.queryByText('#101')).not.toBeInTheDocument();
    expect(screen.queryByText('#102')).not.toBeInTheDocument();
  });

  it('shows empty tab state when tab has 0 matching orders', async () => {
    vi.mocked(orderService.list).mockResolvedValue({
      content: mockOrders,
      totalElements: 3,
      totalPages: 1,
      page: 0,
      size: 10,
      last: true,
    });

    renderWithClient('/tai-khoan/don-hang?status=delivered');

    await waitFor(() => {
      expect(screen.getByTestId('orders-empty-tab')).toBeInTheDocument();
      expect(
        screen.getByText(/Không có đơn hàng nào trong mục "Đã giao"/i)
      ).toBeInTheDocument();
    });
  });

  it('shows empty all state when user has no orders at all', async () => {
    vi.mocked(orderService.list).mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      size: 10,
      last: true,
    });

    renderWithClient();

    await waitFor(() => {
      expect(screen.getByTestId('orders-empty-all')).toBeInTheDocument();
      expect(screen.getByText('Chưa có đơn hàng nào')).toBeInTheDocument();
    });
  });

  it('shows error state with retry button on API failure', async () => {
    vi.mocked(orderService.list).mockRejectedValue(new Error('Mất kết nối'));

    renderWithClient();

    await waitFor(() => {
      expect(screen.getByTestId('orders-error')).toBeInTheDocument();
      expect(screen.getByText(/Không thể tải danh sách đơn hàng/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    });
  });
});

