import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import DashboardPdfPreviewModal from '../DashboardPdfPreviewModal';

describe('DashboardPdfPreviewModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onDownload: vi.fn(),
    month: dayjs('2026-11-01'),
    rows: [
      { label: 'Doanh thu thuần', value: 95000000, monetary: true },
      { label: 'Đơn hàng', value: 12 },
    ],
    topProducts: [
      { phoneId: 1, phoneName: 'iPhone 15 Pro Max', brandName: 'Apple', soldQuantity: 8, mainImageUrl: '' },
    ],
    financial: {
      grossRevenue: 100000000,
      discountAmount: 5000000,
      shippingFee: 0,
      netRevenue: 95000000,
      cogs: 60000000,
      grossProfit: 35000000,
      profitMarginPercentage: 36.84,
      refundAmount: 0,
      uncostedQuantity: 0,
      startDate: '2026-11-01T00:00:00',
      endDate: '2026-11-30T23:59:59',
      timeSeriesData: [],
      paymentMethodStats: [
        { paymentMethod: 'VIETQR', revenue: 60000000, transactionCount: 6, percentage: 63.2 },
        { paymentMethod: 'COD', revenue: 35000000, transactionCount: 6, percentage: 36.8 },
      ],
    },
    isAdmin: true,
    canViewRevenue: true,
    role: 'ADMIN',
    filename: 'dashboard-2026-11',
  };

  it('renders preview title, header and business report content', () => {
    render(<DashboardPdfPreviewModal {...defaultProps} />);
    expect(screen.getByText('Xem trước báo cáo PDF')).toBeInTheDocument();
    expect(screen.getByText('BÁO CÁO HOẠT ĐỘNG KINH DOANH')).toBeInTheDocument();
    expect(screen.getByText(/Tháng 11\/2026/)).toBeInTheDocument();
    expect(screen.getByText('Doanh thu thuần')).toBeInTheDocument();
    expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    expect(screen.getByText(/Cơ cấu thanh toán/)).toBeInTheDocument();
  });

  it('calls onDownload when clicking "Tải xuống PDF"', () => {
    render(<DashboardPdfPreviewModal {...defaultProps} />);
    const downloadBtn = screen.getByRole('button', { name: 'Tải xuống PDF' });
    fireEvent.click(downloadBtn);
    expect(defaultProps.onDownload).toHaveBeenCalledOnce();
  });

  it('calls onClose when clicking "Đóng"', () => {
    render(<DashboardPdfPreviewModal {...defaultProps} />);
    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });
});
