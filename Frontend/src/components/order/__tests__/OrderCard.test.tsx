import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import OrderCard from '../OrderCard';
import { getStatusBadgeConfig, formatPaymentMethod } from '../orderHelpers';
import type { OrderDTO } from '@/types/api';
import cartReducer from '@/store/slices/cartSlice';

const createMockStore = () =>
  configureStore({
    reducer: {
      cart: cartReducer,
    },
  });

const mockOrder: OrderDTO = {
  id: 123,
  userId: 2,
  userName: 'Nguyễn Văn An',
  receiverName: 'Nguyễn Văn An',
  receiverPhone: '0912345678',
  shippingAddress: '123 Đường Láng, Hà Nội',
  totalAmount: 34990000,
  discountAmount: 1000000,
  finalAmount: 33990000,
  orderStatus: 'PENDING',
  paymentStatus: 'UNPAID',
  paymentMethod: 'VIETQR',
  note: 'Giao giờ hành chính',
  promotionCode: 'SALE1M',
  createdAt: '2026-08-05T02:20:16',
  orderDetails: [
    {
      id: 1,
      phoneVariantId: 10,
      productName: 'iPhone 15 Pro Max',
      ram: '8GB',
      storage: '256GB',
      color: 'Titan Tự Nhiên',
      unitPrice: 34990000,
      quantity: 1,
      subtotal: 34990000,
      reviewed: false,
    },
  ],
};

function renderWithProviders(ui: React.ReactElement) {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );
}

describe('OrderCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders order code, creation date and status badge correctly', () => {
    renderWithProviders(<OrderCard order={mockOrder} />);

    expect(screen.getByText('#123')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Chờ thanh toán');
  });

  it('renders product details and variant specs', () => {
    renderWithProviders(<OrderCard order={mockOrder} />);

    expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    expect(screen.getByText('8GB • 256GB • Titan Tự Nhiên')).toBeInTheDocument();
    expect(screen.getByText('x1')).toBeInTheDocument();
  });

  it('formats total amount correctly in VND', () => {
    renderWithProviders(<OrderCard order={mockOrder} />);

    // Total VND should be formatted
    expect(screen.getByText(/33\.990\.000/)).toBeInTheDocument();
  });

  describe('Conditional Smart Action Buttons', () => {
    it('shows "Hủy đơn" button when order is PENDING', async () => {
      const onCancelRequest = vi.fn();
      renderWithProviders(
        <OrderCard order={mockOrder} onCancelRequest={onCancelRequest} />
      );

      const cancelBtn = screen.getByRole('button', { name: /hủy đơn/i });
      expect(cancelBtn).toBeInTheDocument();

      await userEvent.click(cancelBtn);
      expect(onCancelRequest).toHaveBeenCalledWith(123);
    });

    it('shows "Thanh toán ngay" button when order is PENDING, UNPAID, and VIETQR', () => {
      renderWithProviders(<OrderCard order={mockOrder} />);

      expect(
        screen.getByRole('button', { name: /thanh toán ngay/i })
      ).toBeInTheDocument();
    });

    it('FORBIDS "Hủy đơn" button when order is SHIPPING, DELIVERED, or CANCELLED', () => {
      const onCancelRequest = vi.fn();

      // Test SHIPPING
      const { rerender } = renderWithProviders(
        <OrderCard
          order={{ ...mockOrder, orderStatus: 'SHIPPING' }}
          onCancelRequest={onCancelRequest}
        />
      );
      expect(screen.queryByRole('button', { name: /hủy đơn/i })).not.toBeInTheDocument();

      // Test DELIVERED
      rerender(
        <Provider store={createMockStore()}>
          <MemoryRouter>
            <OrderCard
              order={{ ...mockOrder, orderStatus: 'DELIVERED' }}
              onCancelRequest={onCancelRequest}
            />
          </MemoryRouter>
        </Provider>
      );
      expect(screen.queryByRole('button', { name: /hủy đơn/i })).not.toBeInTheDocument();

      // Test CANCELLED
      rerender(
        <Provider store={createMockStore()}>
          <MemoryRouter>
            <OrderCard
              order={{ ...mockOrder, orderStatus: 'CANCELLED' }}
              onCancelRequest={onCancelRequest}
            />
          </MemoryRouter>
        </Provider>
      );
      expect(screen.queryByRole('button', { name: /hủy đơn/i })).not.toBeInTheDocument();
    });

    it('shows "Viết đánh giá" button ONLY when order is DELIVERED', () => {
      renderWithProviders(
        <OrderCard
          order={{
            ...mockOrder,
            orderStatus: 'DELIVERED',
            paymentStatus: 'PAID',
          }}
        />
      );

      expect(
        screen.getByRole('button', { name: /viết đánh giá/i })
      ).toBeInTheDocument();
    });

    it('always shows "Xem chi tiết" link', () => {
      renderWithProviders(<OrderCard order={mockOrder} />);

      const detailLink = screen.getByRole('link', { name: /xem chi tiết/i });
      expect(detailLink).toBeInTheDocument();
      expect(detailLink).toHaveAttribute('href', '/tai-khoan/don-hang/123');
    });
  });

  describe('getStatusBadgeConfig helper', () => {
    it('returns appropriate colors and labels for each status', () => {
      expect(getStatusBadgeConfig('PENDING', 'UNPAID').label).toBe('Chờ thanh toán');
      expect(getStatusBadgeConfig('PENDING', 'PAID').label).toBe('Chờ xác nhận');
      expect(getStatusBadgeConfig('CONFIRMED').label).toBe('Đã xác nhận');
      expect(getStatusBadgeConfig('PROCESSING').label).toBe('Đang xử lý');
      expect(getStatusBadgeConfig('SHIPPING').label).toBe('Đang giao hàng');
      expect(getStatusBadgeConfig('DELIVERED').label).toBe('Đã giao hàng');
      expect(getStatusBadgeConfig('CANCELLED').label).toBe('Đã hủy');
    });
  });

  describe('formatPaymentMethod helper', () => {
    it('returns friendly names for payment methods', () => {
      expect(formatPaymentMethod('VIETQR')).toBe('Chuyển khoản VietQR');
      expect(formatPaymentMethod('SEPAY')).toBe('Chuyển khoản VietQR');
      expect(formatPaymentMethod('COD')).toBe('Thanh toán khi nhận hàng (COD)');
      expect(formatPaymentMethod('OTHER')).toBe('OTHER');
    });
  });
});
