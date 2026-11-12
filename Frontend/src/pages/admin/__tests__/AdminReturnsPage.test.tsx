import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminReturnsPage from '../AdminReturnsPage';
import { adminReturnService } from '@/services';
import type { PageResponse, ReturnResponseDTO } from '@/types/api';

vi.mock('@/services', () => ({
  adminReturnService: {
    list: vi.fn(),
    detail: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    complete: vi.fn(),
  },
}));

const mockReturns: ReturnResponseDTO[] = [
  {
    id: 1,
    returnCode: 'RET-20261111-001',
    orderId: 101,
    orderTrackingNumber: null,
    phoneVariantId: 10,
    phoneName: 'iPhone 15 Pro Max',
    variantSku: 'IP15PM-256-TI',
    userId: 5,
    customerName: 'Nguyễn Văn An',
    customerPhone: '0901234567',
    reason: 'Lỗi màn hình sọc xanh',
    errorDescription: 'Xuất hiện sọc dọc màu xanh sau 2 ngày sử dụng',
    proofImages: ['https://r2.greenphone.vn/proof-1.jpg'],
    type: 'EXCHANGE',
    status: 'PENDING',
    refundAmount: 29890000,
    adminNote: null,
    reviewedBy: null,
    reviewerName: null,
    reviewedAt: null,
    createdAt: '2026-11-11T08:00:00',
    updatedAt: '2026-11-11T08:00:00',
  },
  {
    id: 2,
    returnCode: 'RET-20261111-002',
    orderId: 102,
    orderTrackingNumber: null,
    phoneVariantId: 12,
    phoneName: 'Samsung Galaxy S24 Ultra',
    variantSku: 'S24U-512-BLK',
    userId: 6,
    customerName: 'Trần Thị Bình',
    customerPhone: '0912345678',
    reason: 'Không sạc nhanh được',
    errorDescription: 'Sạc không nhận công suất 45W',
    proofImages: ['https://r2.greenphone.vn/proof-2.jpg'],
    type: 'REFUND',
    status: 'PENDING',
    refundAmount: 24500000,
    adminNote: null,
    reviewedBy: null,
    reviewerName: null,
    reviewedAt: null,
    createdAt: '2026-11-11T09:30:00',
    updatedAt: '2026-11-11T09:30:00',
  },
  {
    id: 3,
    returnCode: 'RET-20261110-003',
    orderId: 99,
    orderTrackingNumber: null,
    phoneVariantId: 15,
    phoneName: 'Xiaomi 14 Ultra',
    variantSku: 'XI14U-256-WHT',
    userId: 7,
    customerName: 'Lê Minh Tâm',
    customerPhone: '0987654321',
    reason: 'Rung camera',
    errorDescription: 'Camera kêu lạch cạch khi quay video',
    proofImages: [],
    type: 'EXCHANGE',
    status: 'APPROVED',
    refundAmount: 21000000,
    adminNote: 'Đã kiểm tra lỗi OIS phần cứng',
    reviewedBy: 1,
    reviewerName: 'Kỹ thuật viên Kho',
    reviewedAt: '2026-11-10T15:00:00',
    createdAt: '2026-11-10T10:00:00',
    updatedAt: '2026-11-10T15:00:00',
  },
];

describe('AdminReturnsPage & Modals', () => {
  let client: QueryClient;
  let currentRows: ReturnResponseDTO[];

  const renderPage = () =>
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminReturnsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  beforeEach(() => {
    vi.resetAllMocks();
    client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    });

    currentRows = mockReturns.map((item) => ({ ...item }));

    vi.mocked(adminReturnService.list).mockImplementation(async () => ({
      content: [...currentRows],
      page: 0,
      size: 15,
      totalElements: currentRows.length,
      totalPages: 1,
      last: true,
    }));
  });

  afterEach(() => {
    cleanup();
    client.clear();
  });

  it('hiển thị danh sách phiếu đổi trả với đầy đủ mã phiếu, SĐT, sản phẩm và trạng thái', async () => {
    renderPage();

    expect(await screen.findByText('RET-20261111-001')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('0901234567')).toBeInTheDocument();
    expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    expect(screen.getAllByText('Chờ duyệt').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Đã duyệt')).toBeInTheDocument();
  });

  it('tìm kiếm theo mã đơn hoặc số điện thoại mượt mà', async () => {
    const user = userEvent.setup();
    renderPage();

    const searchInput = await screen.findByTestId('returns-search-input');
    await user.type(searchInput, '0901234567');

    await waitFor(
      () => {
        expect(adminReturnService.list).toHaveBeenLastCalledWith(
          expect.objectContaining({ keyword: '0901234567', page: 0 }),
        );
      },
      { timeout: 1500 },
    );
  });

  it('bắt buộc xác nhận Popconfirm trước khi Duyệt Đổi Máy Mới và cập nhật bảng không cần F5', async () => {
    const user = userEvent.setup();
    const updatedItem: ReturnResponseDTO = {
      ...mockReturns[0],
      status: 'APPROVED',
      adminNote: 'Loi man hinh',
    };
    vi.mocked(adminReturnService.approve).mockImplementation(async () => {
      currentRows = currentRows.map((row) => (row.id === 1 ? updatedItem : row));
      return updatedItem;
    });

    renderPage();

    const reviewBtn = await screen.findByTestId('review-return-1');
    await user.click(reviewBtn);

    expect(await screen.findByAltText('Ảnh lỗi #1 - RET-20261111-001')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Kết luận thẩm định kỹ thuật/i), 'Loi man hinh');
    await user.type(screen.getByLabelText(/Số IMEI máy mới/i), '356938035643809');

    await user.click(screen.getByTestId('approve-exchange-btn'));

    expect(adminReturnService.approve).not.toHaveBeenCalled();
    expect(await screen.findByText('Xác nhận duyệt đổi máy mới?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xác nhận đổi máy' }));

    await waitFor(() => {
      expect(adminReturnService.approve).toHaveBeenCalledWith(1, {
        adminNote: 'Loi man hinh',
        newImeiNumber: '356938035643809',
      });
    });

    await waitFor(() => {
      expect(screen.getAllByText('Đã duyệt').length).toBeGreaterThanOrEqual(2);
    });
  }, 15000);

  it('bắt buộc xác nhận Popconfirm trước khi Duyệt Hoàn Tiền', async () => {
    const user = userEvent.setup();
    const updatedItem: ReturnResponseDTO = {
      ...mockReturns[1],
      status: 'APPROVED',
      adminNote: 'Hoan tien',
    };
    vi.mocked(adminReturnService.approve).mockImplementation(async () => {
      currentRows = currentRows.map((row) => (row.id === 2 ? updatedItem : row));
      return updatedItem;
    });

    renderPage();

    const reviewBtn = await screen.findByTestId('review-return-2');
    await user.click(reviewBtn);

    await user.click(await screen.findByTestId('approve-refund-btn'));
    expect(adminReturnService.approve).not.toHaveBeenCalled();
    expect(await screen.findByText('Xác nhận duyệt hoàn tiền?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xác nhận hoàn tiền' }));

    await waitFor(() => {
      expect(adminReturnService.approve).toHaveBeenCalledWith(2, {});
    });
  }, 15000);

  it('không cho phép từ chối nếu ô lý do bị bỏ trống và cập nhật REJECTED sau khi nhập lý do hợp lệ', async () => {
    const user = userEvent.setup();
    const rejectedItem: ReturnResponseDTO = {
      ...mockReturns[0],
      status: 'REJECTED',
      adminNote: 'May can goc',
    };
    vi.mocked(adminReturnService.reject).mockImplementation(async () => {
      currentRows = currentRows.map((row) => (row.id === 1 ? rejectedItem : row));
      return rejectedItem;
    });

    renderPage();

    await user.click(await screen.findByTestId('review-return-1'));
    await user.click(await screen.findByTestId('open-reject-modal-btn'));

    const confirmRejectBtn = await screen.findByTestId('confirm-reject-btn');
    await user.click(confirmRejectBtn);

    expect(
      await screen.findByText('Vui lòng nhập lý do từ chối để thông báo tới khách hàng.'),
    ).toBeInTheDocument();
    expect(adminReturnService.reject).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Lý do từ chối/i), 'May can goc');
    await user.click(confirmRejectBtn);

    await waitFor(() => {
      expect(adminReturnService.reject).toHaveBeenCalledWith(1, {
        adminNote: 'May can goc',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Đã từ chối')).toBeInTheDocument();
    });
  }, 15000);

  it('hiển thị nút Xác Nhận Hoàn Tất khi phiếu ở trạng thái APPROVED và cập nhật thành Hoàn tất sau khi xác nhận Popconfirm', async () => {
    const user = userEvent.setup();
    const completedItem: ReturnResponseDTO = {
      ...mockReturns[2],
      status: 'COMPLETED',
    };
    vi.mocked(adminReturnService.complete).mockImplementation(async () => {
      currentRows = currentRows.map((row) => (row.id === 3 ? completedItem : row));
      return completedItem;
    });

    renderPage();

    await user.click(await screen.findByTestId('review-return-3'));

    const completeBtn = await screen.findByTestId('complete-return-btn');
    await user.click(completeBtn);

    expect(adminReturnService.complete).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Xác nhận hoàn tất quy trình đổi trả?'),
    ).toBeInTheDocument();

    const okBtns = screen.getAllByRole('button', { name: /Hoàn tất/i });
    await user.click(okBtns[okBtns.length - 1]);

    await waitFor(() => {
      expect(adminReturnService.complete).toHaveBeenCalledWith(3, {
        adminNote: 'Đã kiểm tra lỗi OIS phần cứng',
      });
    });

    await waitFor(() => {
      expect(screen.getAllByText('Hoàn tất').length).toBeGreaterThanOrEqual(1);
    });
  }, 15000);
});

