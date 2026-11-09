import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import OrderDetailPage from '../OrderDetailPage';
import { orderService } from '@/services/orderService';
import type { OrderDTO } from '@/types/api';
import cartReducer from '@/store/slices/cartSlice';

vi.mock('@/services/orderService', () => ({
  orderService: {
    detail: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock('@/services', () => ({
  paymentService: {
    qrCode: vi.fn(),
  },
}));

const mockOrderDetail: OrderDTO = {
  id: 888,
  userId: 2,
  userName: 'Nguyễn Văn An',
  receiverName: 'Nguyễn Văn An',
  receiverPhone: '0912345678',
  shippingAddress: '123 Đường Láng, Đống Đa, Hà Nội',
  totalAmount: 33990000,
  discountAmount: 0,
  finalAmount: 33990000,
  orderStatus: 'CONFIRMED',
  paymentStatus: 'PAID',
  paymentMethod: 'VIETQR',
  note: 'Giao giờ hành chính',
  promotionCode: '',
  createdAt: '2026-08-05T02:20:16',
  orderDetails: [
    {
      id: 1,
      phoneVariantId: 10,
      productName: 'iPhone 15 Pro Max 256GB',
      ram: '8GB',
      storage: '256GB',
      color: 'Titan Tự Nhiên',
      unitPrice: 33990000,
      quantity: 1,
      subtotal: 33990000,
      reviewed: false,
    },
  ],
};

function renderDetailPage(orderId = '888') {
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
        <MemoryRouter initialEntries={[`/tai-khoan/don-hang/${orderId}`]}>
          <Routes>
            <Route path="/tai-khoan/don-hang/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton while fetching order detail', () => {
    vi.mocked(orderService.detail).mockReturnValue(new Promise(() => {}));
    renderDetailPage();

    expect(screen.getByTestId('order-detail-loading')).toBeInTheDocument();
  });

  it('renders full order detail info including timeline, shipping, and items', async () => {
    vi.mocked(orderService.detail).mockResolvedValue(mockOrderDetail);
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Chi tiết đơn hàng #888')).toBeInTheDocument();
    });

    // Check OrderTrackingTimeline
    expect(screen.getByText('Tiến trình đơn hàng')).toBeInTheDocument();
    expect(screen.getAllByText('Đã đặt hàng').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đã xác nhận').length).toBeGreaterThan(0);

    // Check Shipping information
    expect(screen.getByText('Địa chỉ nhận hàng')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('123 Đường Láng, Đống Đa, Hà Nội')).toBeInTheDocument();

    // Check Product items
    expect(screen.getByText('iPhone 15 Pro Max 256GB')).toBeInTheDocument();
    expect(screen.getByText(/Đơn giá:.*33\.990\.000/)).toBeInTheDocument();

    // Check Total payment
    expect(screen.getByText('Tổng thanh toán:')).toBeInTheDocument();
  });

  it('renders error state when order detail fails or is not found', async () => {
    vi.mocked(orderService.detail).mockRejectedValue(new Error('Đơn hàng không tồn tại'));
    renderDetailPage('999');

    await waitFor(() => {
      expect(screen.getByTestId('order-detail-error')).toBeInTheDocument();
      expect(
        screen.getByText('Không tìm thấy thông tin đơn hàng')
      ).toBeInTheDocument();
    });
  });
});
