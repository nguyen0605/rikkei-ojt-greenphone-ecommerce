import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from 'antd';
import AdminOrdersPage from '../AdminOrdersPage';
import { adminOrderService } from '@/services';
import type { OrderDTO, PageResponse } from '@/types/api';

vi.mock('@/services', () => ({
  adminOrderService: {
    list: vi.fn(),
    updateStatus: vi.fn(),
    updatePaymentStatus: vi.fn(),
    getDetail: vi.fn(),
  },
}));

const mockOrder: OrderDTO = {
  id: 101,
  userId: 1,
  userName: 'nguyenvana',
  receiverName: 'Nguyen Van A',
  receiverPhone: '0987654321',
  shippingAddress: '123 Nguyen Trai, Ha Noi',
  totalAmount: 25000000,
  discountAmount: 0,
  finalAmount: 25000000,
  orderStatus: 'PENDING',
  paymentStatus: 'UNPAID',
  paymentMethod: 'COD',
  note: '',
  promotionCode: '',
  createdAt: '2026-11-19T10:00:00',
  orderDetails: [],
};

const mockPageResponse: PageResponse<OrderDTO> = {
  content: [mockOrder],
  page: 0,
  size: 15,
  totalElements: 1,
  totalPages: 1,
  last: true,
};

describe('AdminOrdersPage - Confirmation Dialog on Status Change', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.mocked(adminOrderService.list).mockResolvedValue(mockPageResponse);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AdminOrdersPage />
      </QueryClientProvider>
    );

  it('renders order list with orderStatus and paymentStatus dropdowns', async () => {
    renderComponent();

    expect(await screen.findByText('#101')).toBeInTheDocument();
    expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
  });

  it('triggers Modal.confirm when selecting a new orderStatus', async () => {
    const confirmSpy = vi.spyOn(Modal, 'confirm');
    renderComponent();

    await screen.findByText('#101');

    // Select the orderStatus select dropdown
    const comboboxes = screen.getAllByRole('combobox');
    // There are statusFilter, paymentStatus, orderStatus
    const orderStatusSelect = comboboxes[comboboxes.length - 1];

    await userEvent.click(orderStatusSelect);

    // Click CONFIRMED option item
    const confirmedItem = await screen.findByText('CONFIRMED (Đã xác nhận)');
    await userEvent.click(confirmedItem);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const callArgs = confirmSpy.mock.calls[0][0];
    expect(callArgs.title).toBe('Xác nhận chuyển trạng thái đơn hàng');
    expect(callArgs.content).toContain('đơn hàng #101');
    expect(callArgs.okText).toBe('Xác nhận');
    expect(callArgs.cancelText).toBe('Hủy bỏ');
  });

  it('triggers Modal.confirm when selecting a new paymentStatus', async () => {
    const confirmSpy = vi.spyOn(Modal, 'confirm');
    renderComponent();

    await screen.findByText('#101');

    const comboboxes = screen.getAllByRole('combobox');
    // Payment status is second to last combobox
    const paymentStatusSelect = comboboxes[comboboxes.length - 2];

    await userEvent.click(paymentStatusSelect);

    const option = await screen.findByText(/Đã thanh toán \(PAID\)/);
    await userEvent.click(option);

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Xác nhận chuyển trạng thái thanh toán',
        content: expect.stringContaining('đơn #101'),
        okText: 'Xác nhận',
        cancelText: 'Hủy',
      })
    );
  });

  it('opens cancel reason modal when selecting CANCELLED', async () => {
    renderComponent();

    await screen.findByText('#101');

    const comboboxes = screen.getAllByRole('combobox');
    const orderStatusSelect = comboboxes[comboboxes.length - 1];

    await userEvent.click(orderStatusSelect);

    const options = await screen.findAllByText(/CANCELLED/);
    await userEvent.click(options[0]);

    expect(await screen.findByText('Xác nhận hủy đơn hàng #101')).toBeInTheDocument();
  });
});
