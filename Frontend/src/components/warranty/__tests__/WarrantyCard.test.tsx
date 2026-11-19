import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import WarrantyCard from '../WarrantyCard';
import type { WarrantyLookupItem } from '@/services/warrantyService';

describe('WarrantyCard', () => {
  afterEach(() => {
    cleanup();
  });

  const mockActiveWarranty: WarrantyLookupItem = {
    id: 1,
    orderId: 22,
    imei: '860454650223009',
    imeiNumber: '860454650223009',
    productName: 'Samsung Galaxy S24 Ultra',
    variantDetails: 'RAM 12GB - Bộ nhớ 256GB - Màu Vàng Titan',
    thumbnailUrl: 'https://example.com/s24.png',
    customerName: 'Đặng Nguyên Vũ',
    customerPhone: '0393065314',
    startDate: '2026-11-15T00:00:00',
    endDate: '2027-11-15T00:00:00',
    status: 'ACTIVE',
    remainingDays: 361,
    warrantyDurationMonths: 12,
    note: 'Bảo hành điện tử 12 tháng tự động kích hoạt từ đơn hàng #22 - Thiết bị 1/1',
  };

  const mockExpiredWarranty: WarrantyLookupItem = {
    ...mockActiveWarranty,
    id: 2,
    status: 'EXPIRED',
    remainingDays: 0,
    startDate: '2025-01-01T00:00:00',
    endDate: '2026-01-01T00:00:00',
  };

  it('loại bỏ chuỗi "% đã sử dụng" và thông tin ghi chú thừa trên thẻ bảo hành', () => {
    render(<WarrantyCard warranty={mockActiveWarranty} />);

    // Kiểm tra tiêu đề tiến trình không còn chứa "% đã sử dụng"
    expect(screen.getByText('Tiến trình thời hạn bảo hành')).toBeInTheDocument();
    expect(screen.queryByText(/đã sử dụng/i)).not.toBeInTheDocument();

    // Kiểm tra thông tin ghi chú thừa đã được lược bỏ hoàn toàn
    expect(screen.queryByText(/Ghi chú:/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/tự động kích hoạt từ đơn hàng #22/i),
    ).not.toBeInTheDocument();

    // Vẫn hiển thị đầy đủ thông tin cốt lõi
    expect(screen.getByText('Samsung Galaxy S24 Ultra')).toBeInTheDocument();
    expect(screen.getByText(/RAM 12GB - Bộ nhớ 256GB - Màu Vàng Titan/)).toBeInTheDocument();
    expect(screen.getByText('860454650223009')).toBeInTheDocument();
    expect(screen.getByText('15/11/2026')).toBeInTheDocument();
    expect(screen.getByText('15/11/2027')).toBeInTheDocument();
    expect(screen.getByText('Còn lại 361 ngày')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('hiển thị đúng trạng thái hết hạn và không hiển thị % đã sử dụng hay ghi chú', () => {
    render(<WarrantyCard warranty={mockExpiredWarranty} />);

    expect(screen.getByText('Hết hạn bảo hành')).toBeInTheDocument();
    expect(screen.getByText('0 ngày còn lại')).toBeInTheDocument();
    expect(screen.getByText('Tiến trình thời hạn bảo hành')).toBeInTheDocument();
    expect(screen.queryByText(/đã sử dụng/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ghi chú:/i)).not.toBeInTheDocument();
  });

  it('hiển thị đúng trạng thái vô hiệu hóa khi bảo hành bị thu hồi do hoàn tiền / đổi trả', () => {
    const mockVoidedWarranty: WarrantyLookupItem = {
      ...mockActiveWarranty,
      id: 3,
      status: 'VOIDED',
      remainingDays: 0,
    };

    render(<WarrantyCard warranty={mockVoidedWarranty} />);

    expect(
      screen.getByText('Đã vô hiệu hóa (Đã hoàn tiền / Đổi trả)'),
    ).toBeInTheDocument();
    expect(screen.getByText('0 ngày còn lại')).toBeInTheDocument();
    expect(screen.queryByText(/đã sử dụng/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ghi chú:/i)).not.toBeInTheDocument();
  });
});
