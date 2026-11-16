import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicInvoicePage from '../PublicInvoicePage';
import { orderService } from '@/services/orderService';
import type { OrderDTO } from '@/types/api';

vi.mock('@/services/orderService', () => ({
  orderService: {
    getPublicInvoice: vi.fn(),
  },
}));

const mockOrder: OrderDTO = {
  id: 282,
  userId: 2,
  userName: 'Nguyễn Văn An',
  receiverName: 'Nguyễn Văn An VIP',
  receiverPhone: '0393065314',
  shippingAddress: '123 Đường Cầu Giấy, Hà Nội',
  totalAmount: 29990000,
  discountAmount: 0,
  shippingFee: 0,
  finalAmount: 29990000,
  orderStatus: 'CONFIRMED',
  paymentStatus: 'PAID',
  paymentMethod: 'COD',
  note: 'Giao giờ hành chính',
  hasInvoice: true,
  promotionCode: 'SALE1M',
  companyName: 'CÔNG TY TNHH CÔNG NGHỆ THỊNH AN',
  taxCode: '1231231231',
  companyAddress: 'Tầng 10, Tòa nhà Landmark, Hà Nội',
  invoiceEmail: 'pdat7737@gmail.com',
  createdAt: '2026-11-16T11:56:00Z',
  orderDetails: [
    {
      id: 501,
      phoneVariantId: 801,
      productName: 'iPhone 15 Pro Max',
      ram: '8GB',
      storage: '256GB',
      color: 'Titan Tự Nhiên',
      unitPrice: 29990000,
      quantity: 1,
      subtotal: 29990000,
    },
  ],
};

function renderPage(orderId = '282') {
  return render(
    <MemoryRouter initialEntries={[`/hoa-don/${orderId}`]}>
      <Routes>
        <Route path="/hoa-don/:id" element={<PublicInvoicePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PublicInvoicePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state and then full corporate VAT electronic invoice', async () => {
    vi.mocked(orderService.getPublicInvoice).mockResolvedValueOnce(mockOrder as any);

    renderPage('282');

    expect(screen.getByText('Đang truy xuất hóa đơn điện tử...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Cổng tra cứu Hóa đơn điện tử #282/)).toBeInTheDocument();
    });

    expect(screen.getByText('Bản điện tử hợp lệ')).toBeInTheDocument();
    expect(screen.getByText('GREENPHONE RETAIL')).toBeInTheDocument();
    expect(screen.getByText('HD-000282')).toBeInTheDocument();

    // Corporate VAT information
    expect(screen.getByText('CÔNG TY TNHH CÔNG NGHỆ THỊNH AN')).toBeInTheDocument();
    expect(screen.getByText('1231231231')).toBeInTheDocument();
    expect(screen.getByText('Tầng 10, Tòa nhà Landmark, Hà Nội')).toBeInTheDocument();
    expect(screen.getByText('pdat7737@gmail.com')).toBeInTheDocument();

    // Device details
    expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    expect(screen.getAllByText(/29\.990\.000/).length).toBeGreaterThanOrEqual(1);

    // Print button exists
    expect(screen.getByRole('button', { name: /In hóa đơn/i })).toBeInTheDocument();
  });

  it('triggers window.print when clicking "In hóa đơn / Lưu PDF"', async () => {
    vi.mocked(orderService.getPublicInvoice).mockResolvedValueOnce(mockOrder as any);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    renderPage('282');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /In hóa đơn/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /In hóa đơn/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('renders error state when invoice is not found', async () => {
    vi.mocked(orderService.getPublicInvoice).mockRejectedValueOnce({
      response: { data: { message: 'Không tìm thấy thông tin hóa đơn cho đơn hàng #99999' } },
    });

    renderPage('99999');

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy hóa đơn điện tử')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Không tìm thấy thông tin hóa đơn cho đơn hàng #99999')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Về trang chủ/i })).toBeInTheDocument();
  });
});
