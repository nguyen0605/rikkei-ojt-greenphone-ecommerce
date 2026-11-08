import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import AdminVoucherPage from '../AdminVoucherPage';
import adminMarketingService from '@/services/adminMarketingService';
import type { PromotionDTO } from '@/types/api';

vi.mock('@/services/adminMarketingService', () => ({
  default: {
    getVouchers: vi.fn(),
    createVoucher: vi.fn(),
    updateVoucher: vi.fn(),
    deleteVoucher: vi.fn(),
    toggleVoucherStatus: vi.fn(),
  },
  adminMarketingService: {
    getVouchers: vi.fn(),
    createVoucher: vi.fn(),
    updateVoucher: vi.fn(),
    deleteVoucher: vi.fn(),
    toggleVoucherStatus: vi.fn(),
  },
}));

const mockVouchers: PromotionDTO[] = [
  {
    id: 1,
    code: 'PROMO10',
    name: 'Khuyến mãi 10%',
    description: 'Giảm 10% cho mọi đơn hàng',
    discountType: 'PERCENT',
    discountValue: 10,
    maxDiscountAmount: 100000,
    minOrderValue: 500000,
    quantity: 100,
    usedQuantity: 95,
    startDate: '2026-11-01T00:00:00',
    endDate: '2026-11-30T23:59:59',
    status: 'ACTIVE',
  },
  {
    id: 2,
    code: 'FIXED50K',
    name: 'Giảm 50K cố định',
    description: 'Giảm trực tiếp 50K',
    discountType: 'FIXED',
    discountValue: 50000,
    maxDiscountAmount: 50000,
    minOrderValue: 200000,
    quantity: 50,
    usedQuantity: 10,
    startDate: '2026-10-01T00:00:00',
    endDate: '2026-10-15T23:59:59',
    status: 'INACTIVE',
  },
];

describe('AdminVoucherPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
      },
    });

    vi.mocked(adminMarketingService.getVouchers).mockResolvedValue({
      content: mockVouchers,
      totalElements: 2,
      totalPages: 1,
      page: 0,
      size: 15,
      last: true,
    });

    vi.stubGlobal('ResizeObserver', class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    });

    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AdminVoucherPage />
      </QueryClientProvider>
    );

  it('renders voucher list with code, discount details, and progress', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('PROMO10')).toBeInTheDocument();
      expect(screen.getByText('FIXED50K')).toBeInTheDocument();
      expect(screen.getByText('10%')).toBeInTheDocument();
      expect(screen.getByText('95 đã dùng')).toBeInTheDocument();
      expect(screen.getByText('100 mã')).toBeInTheDocument();
    });
  });

  it('copies voucher code when clicking copy button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('PROMO10')).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByTitle('Sao chép mã voucher');
    expect(copyButtons.length).toBeGreaterThan(0);

    await userEvent.click(copyButtons[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('PROMO10');
  });

  it('filters vouchers by keyword search', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tìm theo mã hoặc tên chiến dịch...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Tìm theo mã hoặc tên chiến dịch...');
    await userEvent.type(searchInput, 'PROMO10{enter}');

    await waitFor(() => {
      expect(adminMarketingService.getVouchers).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'PROMO10' })
      );
    });
  });

  it('opens modal when clicking Add Voucher button', async () => {
    renderComponent();

    const addBtn = screen.getByRole('button', { name: /Tạo mã Voucher/i });
    await userEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Thêm mã khuyến mãi (Voucher)')).toBeInTheDocument();
    });
  });
});
