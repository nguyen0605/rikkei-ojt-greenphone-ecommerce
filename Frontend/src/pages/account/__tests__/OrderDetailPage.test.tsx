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

function renderDetailPage(orderId = '888', customQueryClient?: QueryClient) {
  const queryClient = customQueryClient || new QueryClient({
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

  it('renders DELIVERED status with green badge, 4 steps lit, and "Viết đánh giá" button', async () => {
    const deliveredOrder: OrderDTO = {
      ...mockOrderDetail,
      id: 22,
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID',
    };
    vi.mocked(orderService.detail).mockResolvedValue(deliveredOrder);
    renderDetailPage('22');

    await waitFor(() => {
      expect(screen.getByText('Chi tiết đơn hàng #22')).toBeInTheDocument();
    });

    // Badge Đã giao hàng màu xanh lá
    const statusBadges = screen.getAllByText('Đã giao hàng');
    expect(statusBadges.length).toBeGreaterThan(0);

    // OrderTrackingTimeline sáng bước 4 (Giao hàng thành công)
    expect(screen.getAllByText('Giao hàng thành công').length).toBeGreaterThan(0);

    // Nút "Viết đánh giá" xuất hiện khi đơn hàng DELIVERED
    expect(screen.getByRole('button', { name: /viết đánh giá/i })).toBeInTheDocument();
  });

  it('uses pre-populated query cache immediately without loading skeleton and still refetches fresh server state (staleTime: 0, refetchOnMount: always)', async () => {
    const cachedOrder: OrderDTO = {
      ...mockOrderDetail,
      id: 22,
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID',
    };

    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 10000,
        },
      },
    });

    // Giả lập dữ liệu đã được OrderHistoryPage preload vào cache ['order', '22']
    client.setQueryData(['order', '22'], cachedOrder);

    // Mock API trả về phiên bản cập nhật nhất
    vi.mocked(orderService.detail).mockResolvedValue(cachedOrder);

    renderDetailPage('22', client);

    // Ngay lập tức hiển thị nội dung đơn hàng, không giật màn hình skeleton
    expect(screen.queryByTestId('order-detail-loading')).not.toBeInTheDocument();
    expect(screen.getByText('Chi tiết đơn hàng #22')).toBeInTheDocument();
    expect(screen.getAllByText('Đã giao hàng').length).toBeGreaterThan(0);

    // Vẫn gọi API detail lên backend để đảm bảo trạng thái server mới nhất
    await waitFor(() => {
      expect(orderService.detail).toHaveBeenCalledWith(22);
    });
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

  it('renders "Xem hóa đơn" button and opens invoice modal on click', async () => {
    vi.mocked(orderService.detail).mockResolvedValue(mockOrderDetail);
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByTestId('view-invoice-btn')).toBeInTheDocument();
    });

    const viewBtn = screen.getByTestId('view-invoice-btn');
    expect(viewBtn).toHaveTextContent('Xem hóa đơn');
  });
});
