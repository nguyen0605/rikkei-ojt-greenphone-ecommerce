import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvoicePrintModal from '../InvoicePrintModal';
import type { OrderDTO } from '@/types/api';
import { extractVatInvoice, extractCustomerNote, extractPaperInvoicePreference } from '@/utils/orderStateMachine';

const mockOrder: OrderDTO = {
  id: 12345,
  userId: 1,
  userName: 'Nguyễn Văn A',
  receiverName: 'Trần Thị B',
  receiverPhone: '0987654321',
  shippingAddress: '456 Đường Giải Phóng, Hai Bà Trưng, Hà Nội',
  totalAmount: 33990000,
  discountAmount: 1000000,
  shippingFee: 30000,
  finalAmount: 33020000,
  orderStatus: 'DELIVERED',
  paymentStatus: 'PAID',
  paymentMethod: 'VIETQR',
  note: 'Giao hàng giờ hành chính',
  hasInvoice: true,
  companyName: 'CÔNG TY TNHH GIẢI PHÁP SỐ TECHVIET',
  taxCode: '0109998888',
  companyAddress: 'Tầng 5, Tòa nhà Landmark, Nam Từ Liêm, Hà Nội',
  invoiceEmail: 'invoice@techviet.vn',
  promotionCode: 'SALE1M',
  createdAt: '2026-11-15T10:30:00Z',
  orderDetails: [
    {
      id: 101,
      phoneVariantId: 501,
      productName: 'iPhone 15 Pro Max',
      ram: '8GB',
      storage: '256GB',
      color: 'Titan Tự Nhiên',
      unitPrice: 33990000,
      quantity: 1,
      subtotal: 33990000,
    },
  ],
};

describe('InvoicePrintModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders invoice modal with store header, order details, and device table', () => {
    const handleClose = vi.fn();
    render(<InvoicePrintModal open={true} onClose={handleClose} order={mockOrder} />);

    // Header Branding
    expect(screen.getByText('GREENPHONE RETAIL')).toBeInTheDocument();
    expect(screen.getByText('Hệ thống bán lẻ thiết bị di động & công nghệ chính hãng')).toBeInTheDocument();
    expect(screen.getByText('HD-012345')).toBeInTheDocument();
    expect(screen.getByText('#12345')).toBeInTheDocument();

    // Receiver info
    expect(screen.getAllByText('Trần Thị B').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0987654321')).toBeInTheDocument();

    // Device items
    expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    expect(screen.getByText(/8GB • 256GB • Titan Tự Nhiên/)).toBeInTheDocument();

    // Status badge
    expect(screen.getByText('ĐÃ THANH TOÁN')).toBeInTheDocument();

    // Tax note
    expect(screen.getByText(/(Giá thanh toán trên đã bao gồm thuế Giá trị gia tăng VAT)/)).toBeInTheDocument();

    // Signatures
    expect(screen.getByText('Người mua hàng')).toBeInTheDocument();
    expect(screen.getByText('Người lập phiếu')).toBeInTheDocument();
    expect(screen.getByText('Thủ kho xuất hàng')).toBeInTheDocument();
  });

  it('renders corporate VAT invoice details when hasInvoice is true', () => {
    render(<InvoicePrintModal open={true} onClose={vi.fn()} order={mockOrder} />);

    expect(screen.getByText(/Thông tin xuất hóa đơn giá trị gia tăng/)).toBeInTheDocument();
    expect(screen.getByText('CÔNG TY TNHH GIẢI PHÁP SỐ TECHVIET')).toBeInTheDocument();
    expect(screen.getByText('0109998888')).toBeInTheDocument();
    expect(screen.getByText('Tầng 5, Tòa nhà Landmark, Nam Từ Liêm, Hà Nội')).toBeInTheDocument();
    expect(screen.getByText('invoice@techviet.vn')).toBeInTheDocument();
  });

  it('hides print button and renders electronic invoice view for customers (isAdminView=false)', () => {
    render(<InvoicePrintModal open={true} onClose={vi.fn()} order={mockOrder} isAdminView={false} />);

    // Title shows electronic invoice
    expect(screen.getByText(/Hóa đơn điện tử #12345/)).toBeInTheDocument();
    expect(screen.getByText('Bản điện tử hợp lệ')).toBeInTheDocument();

    // Direct print button should not be present for customer
    expect(screen.queryByRole('button', { name: /In ngay/i })).not.toBeInTheDocument();

    // Close button exists
    expect(screen.getByRole('button', { name: /Đóng/i })).toBeInTheDocument();
  });

  it('calls window.print when clicking "In ngay (Ctrl+P)" in admin view (isAdminView=true)', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<InvoicePrintModal open={true} onClose={vi.fn()} order={mockOrder} isAdminView={true} />);

    const printBtn = screen.getByRole('button', { name: /In ngay/i });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('correctly extracts VAT invoice and paper invoice preferences from order and note fallbacks', () => {
    // 1. Direct fields
    const res1 = extractVatInvoice(mockOrder);
    expect(res1.hasInvoice).toBe(true);
    expect(res1.companyName).toBe('CÔNG TY TNHH GIẢI PHÁP SỐ TECHVIET');
    expect(res1.taxCode).toBe('0109998888');

    // 2. Fallback note tag
    const orderWithNoteTag: Partial<OrderDTO> = {
      note: 'Giao nhanh [Hóa đơn VAT: Công ty=Công ty Á Châu; MST=0102030405; Địa chỉ=Hà Nội; Email=ac@asia.com] [KÈM_HÓA_ĐƠN_GIẤY]',
    };
    const res2 = extractVatInvoice(orderWithNoteTag as OrderDTO);
    expect(res2.hasInvoice).toBe(true);
    expect(res2.companyName).toBe('Công ty Á Châu');
    expect(res2.taxCode).toBe('0102030405');

    // 3. Extract paper invoice preference
    expect(extractPaperInvoicePreference(orderWithNoteTag as OrderDTO)).toBe(true);
    expect(extractPaperInvoicePreference({ note: 'Chỉ nhận hàng' } as OrderDTO)).toBe(false);

    // 4. Cleaned customer note removes VAT and paper invoice tags
    expect(extractCustomerNote(orderWithNoteTag.note)).toBe('Giao nhanh');
  });
});
