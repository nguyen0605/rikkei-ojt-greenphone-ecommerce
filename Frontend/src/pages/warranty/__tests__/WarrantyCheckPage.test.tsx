import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WarrantyCheckPage from '../WarrantyCheckPage';
import { warrantyService, type WarrantyLookupItem } from '@/services/warrantyService';

vi.mock('@/services/warrantyService', () => ({
  warrantyService: {
    check: vi.fn(),
    getByImei: vi.fn(),
  },
}));

const activeWarranty: WarrantyLookupItem = {
  id: 1,
  orderId: 101,
  imei: '861234567890123',
  imeiNumber: '861234567890123',
  productName: 'iPhone 15 Pro Max',
  variantDetails: 'Titan Tự Nhiên - 256GB',
  thumbnailUrl: 'https://example.com/iphone15.jpg',
  customerName: 'Nguyễn Văn A',
  customerPhone: '0901234567',
  startDate: '2026-06-01T10:00:00',
  endDate: '2027-06-01T10:00:00',
  status: 'ACTIVE',
  remainingDays: 201,
  warrantyDurationMonths: 12,
  note: 'Bảo hành điện tử 12 tháng tự động kích hoạt từ đơn hàng #101',
};

const expiredWarranty: WarrantyLookupItem = {
  ...activeWarranty,
  id: 2,
  imei: '869999999999999',
  imeiNumber: '869999999999999',
  productName: 'Samsung Galaxy S23 Ultra',
  variantDetails: 'Đen Phantom - 512GB',
  startDate: '2024-01-01T10:00:00',
  endDate: '2025-01-01T10:00:00',
  status: 'EXPIRED',
  remainingDays: 0,
};

function renderPage(initialEntry = '/tra-cuu-bao-hanh') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/tra-cuu-bao-hanh" element={<WarrantyCheckPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WarrantyCheckPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('hiển thị trang tra cứu công khai không yêu cầu đăng nhập', () => {
    renderPage();

    expect(
      screen.getByText('Tra Cứu Bảo Hành Điện Tử Chính Hãng'),
    ).toBeInTheDocument();
    expect(screen.getByText('GreenPhone Care')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Tra Cứu Bảo Hành/i }),
    ).toBeEnabled();
  });

  it('tự động trim khoảng trắng và validate số điện thoại/IMEI < 10 chữ số', async () => {
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByLabelText('Mã IMEI, số điện thoại hoặc tên sản phẩm');
    const submitBtn = screen.getByRole('button', { name: /Tra Cứu Bảo Hành/i });

    await user.type(input, '   090123   ');
    await user.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /tối thiểu 10 chữ số/i,
    );
    expect(warrantyService.check).not.toHaveBeenCalled();
  });

  it('cho phép tra cứu trực tiếp theo tên sản phẩm (>= 2 ký tự)', async () => {
    const user = userEvent.setup();
    vi.mocked(warrantyService.check).mockResolvedValueOnce([activeWarranty]);

    renderPage();

    const input = screen.getByLabelText('Mã IMEI, số điện thoại hoặc tên sản phẩm');
    const submitBtn = screen.getByRole('button', { name: /Tra Cứu Bảo Hành/i });

    await user.type(input, 'iPhone 15');
    await user.click(submitBtn);

    expect(warrantyService.check).toHaveBeenCalledWith('iPhone 15');
    expect(await screen.findByText('iPhone 15 Pro Max')).toBeInTheDocument();
  });

  it('hiển thị trạng thái loading và disabled trên nút Tra Cứu khi đang gửi request', async () => {
    const user = userEvent.setup();
    let resolvePromise!: (value: WarrantyLookupItem[]) => void;
    const pendingPromise = new Promise<WarrantyLookupItem[]>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(warrantyService.check).mockReturnValueOnce(pendingPromise);

    renderPage();

    const input = screen.getByLabelText('Mã IMEI, số điện thoại hoặc tên sản phẩm');
    const submitBtn = screen.getByRole('button', { name: /Tra Cứu Bảo Hành/i });

    await user.type(input, '  0901234567  ');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });
    expect(warrantyService.check).toHaveBeenCalledWith('0901234567');

    resolvePromise([activeWarranty]);

    await waitFor(() => {
      expect(submitBtn).toBeEnabled();
    });
    expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
  });

  it('hiển thị đầy đủ thẻ bảo hành điện tử còn hạn và thanh tiến trình', async () => {
    const user = userEvent.setup();
    vi.mocked(warrantyService.check).mockResolvedValueOnce([activeWarranty]);

    renderPage();

    const input = screen.getByLabelText('Mã IMEI, số điện thoại hoặc tên sản phẩm');
    await user.type(input, '0901234567');
    await user.click(screen.getByRole('button', { name: /Tra Cứu Bảo Hành/i }));

    expect(await screen.findByText('iPhone 15 Pro Max')).toBeInTheDocument();
    expect(screen.getByText(/Titan Tự Nhiên - 256GB/)).toBeInTheDocument();
    expect(screen.getByText('861234567890123')).toBeInTheDocument();
    expect(screen.getByText('01/06/2026')).toBeInTheDocument();
    expect(screen.getByText('01/06/2027')).toBeInTheDocument();
    expect(
      screen.getByText('Đang bảo hành - Còn lại 201 ngày'),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('hiển thị nhãn xám Hết hạn bảo hành khi thiết bị đã hết hạn', async () => {
    const user = userEvent.setup();
    vi.mocked(warrantyService.check).mockResolvedValueOnce([expiredWarranty]);

    renderPage();

    await user.type(
      screen.getByLabelText('Mã IMEI, số điện thoại hoặc tên sản phẩm'),
      '869999999999999',
    );
    await user.click(screen.getByRole('button', { name: /Tra Cứu Bảo Hành/i }));

    expect(
      await screen.findByText('Samsung Galaxy S23 Ultra'),
    ).toBeInTheDocument();
    expect(screen.getByText('Hết hạn bảo hành')).toBeInTheDocument();
    expect(screen.getByText('0 ngày còn lại')).toBeInTheDocument();
  });

  it('hiển thị ô lọc nhanh theo tên sản phẩm khi danh sách có nhiều phiếu', async () => {
    const user = userEvent.setup();
    vi.mocked(warrantyService.check).mockResolvedValueOnce([activeWarranty, expiredWarranty]);

    renderPage();

    await user.type(
      screen.getByLabelText('Mã IMEI, số điện thoại hoặc tên sản phẩm'),
      '0901234567',
    );
    await user.click(screen.getByRole('button', { name: /Tra Cứu Bảo Hành/i }));

    expect(await screen.findByText('iPhone 15 Pro Max')).toBeInTheDocument();
    expect(screen.getByText('Samsung Galaxy S23 Ultra')).toBeInTheDocument();

    const filterInput = screen.getByPlaceholderText(/Lọc theo tên sản phẩm, IMEI.../i);
    await user.type(filterInput, 'Samsung');

    expect(screen.queryByText('iPhone 15 Pro Max')).not.toBeInTheDocument();
    expect(screen.getByText('Samsung Galaxy S23 Ultra')).toBeInTheDocument();
  });

  it('hiển thị Empty state thân thiện kèm hướng dẫn kiểm tra IMEI khi không tìm thấy kết quả', async () => {
    const user = userEvent.setup();
    vi.mocked(warrantyService.check).mockResolvedValueOnce([]);

    renderPage();

    await user.type(
      screen.getByLabelText('Mã IMEI, số điện thoại hoặc tên sản phẩm'),
      '860000000000000',
    );
    await user.click(screen.getByRole('button', { name: /Tra Cứu Bảo Hành/i }));

    expect(
      await screen.findByText('Không tìm thấy thông tin bảo hành phù hợp'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/kiểm tra lại số IMEI/i),
    ).toBeInTheDocument();
  });

  it('tự động tra cứu khi truy cập kèm query param ?imei=...', async () => {
    vi.mocked(warrantyService.check).mockResolvedValueOnce([activeWarranty]);

    renderPage('/tra-cuu-bao-hanh?imei=861234567890123');

    await waitFor(() => {
      expect(warrantyService.check).toHaveBeenCalledWith('861234567890123');
    });
    expect(await screen.findByText('iPhone 15 Pro Max')).toBeInTheDocument();
  });
});
