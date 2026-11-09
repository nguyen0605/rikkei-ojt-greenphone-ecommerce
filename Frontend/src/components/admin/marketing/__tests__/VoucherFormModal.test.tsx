import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import VoucherFormModal from '../VoucherFormModal';
import type { PromotionDTO } from '@/types/api';
import dayjs from 'dayjs';

describe('VoucherFormModal', () => {
  beforeEach(() => {
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
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders correctly in creation mode', () => {
    render(
      <VoucherFormModal
        open={true}
        editData={null}
        loading={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('Thêm mã khuyến mãi (Voucher)')).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã Voucher/i)).toHaveValue('');
    expect(screen.getByLabelText(/Tên chiến dịch/i)).toHaveValue('');
  });

  it('renders correctly in edit mode with existing data', () => {
    const editData: PromotionDTO = {
      id: 5,
      code: 'SALE50',
      name: 'Giảm 50K',
      description: 'Khuyến mãi đặc biệt',
      discountType: 'FIXED',
      discountValue: 50000,
      maxDiscountAmount: 50000,
      minOrderValue: 200000,
      quantity: 50,
      startDate: '2026-11-01T00:00:00',
      endDate: '2026-11-30T23:59:59',
      status: 'ACTIVE',
    };

    render(
      <VoucherFormModal
        open={true}
        editData={editData}
        loading={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('Sửa mã khuyến mãi')).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã Voucher/i)).toHaveValue('SALE50');
    expect(screen.getByLabelText(/Tên chiến dịch/i)).toHaveValue('Giảm 50K');
  });

  it('validates required fields on submission', async () => {
    const onSubmit = vi.fn();
    render(
      <VoucherFormModal
        open={true}
        editData={null}
        loading={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const okBtn = screen.getByRole('button', { name: 'OK' });
    await userEvent.click(okBtn);

    await waitFor(() => {
      expect(screen.getByText('Nhập mã voucher')).toBeInTheDocument();
      expect(screen.getByText('Nhập tên chương trình')).toBeInTheDocument();
      expect(screen.getByText('Nhập giá trị chiết khấu')).toBeInTheDocument();
      expect(screen.getByText('Chọn khoảng thời gian hiệu lực')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates percentage discount range (1-100%)', async () => {
    const editData: PromotionDTO = {
      id: 8,
      code: 'TESTPERCENT',
      name: 'Test Percent',
      description: 'Test',
      discountType: 'PERCENT',
      discountValue: 0,
      maxDiscountAmount: 50000,
      minOrderValue: 200000,
      quantity: 50,
      startDate: dayjs().add(1, 'day').toISOString(),
      endDate: dayjs().add(5, 'day').toISOString(),
      status: 'ACTIVE',
    };

    render(
      <VoucherFormModal
        open={true}
        editData={editData}
        loading={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const okBtn = screen.getByRole('button', { name: 'OK' });
    await userEvent.click(okBtn);

    await waitFor(() => {
      expect(screen.getByText('Mức giảm theo % phải từ 1% đến 100%')).toBeInTheDocument();
    });
  });

  it('shows validation error when end date is in the past', async () => {
    const pastStart = dayjs().subtract(5, 'day');
    const pastEnd = dayjs().subtract(2, 'day');

    const editData: PromotionDTO = {
      id: 5,
      code: 'PASTVOUCHER',
      name: 'Voucher cũ',
      description: 'Test past date',
      discountType: 'PERCENT',
      discountValue: 10,
      maxDiscountAmount: 50000,
      minOrderValue: 200000,
      quantity: 50,
      startDate: pastStart.toISOString(),
      endDate: pastEnd.toISOString(),
      status: 'ACTIVE',
    };

    render(
      <VoucherFormModal
        open={true}
        editData={editData}
        loading={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const okBtn = screen.getByRole('button', { name: 'OK' });
    await userEvent.click(okBtn);

    await waitFor(() => {
      expect(screen.getByText('Ngày hết hạn không được ở trong quá khứ')).toBeInTheDocument();
    });
  });

  it('submits valid form data correctly', async () => {
    const onSubmit = vi.fn();
    const futureStart = dayjs().add(1, 'day');
    const futureEnd = dayjs().add(10, 'day');

    const editData: PromotionDTO = {
      id: 6,
      code: 'VALID2026',
      name: 'Voucher hợp lệ',
      description: 'Mô tả test',
      discountType: 'PERCENT',
      discountValue: 15,
      maxDiscountAmount: 100000,
      minOrderValue: 300000,
      quantity: 80,
      startDate: futureStart.toISOString(),
      endDate: futureEnd.toISOString(),
      status: 'ACTIVE',
    };

    render(
      <VoucherFormModal
        open={true}
        editData={editData}
        loading={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const okBtn = screen.getByRole('button', { name: 'OK' });
    await userEvent.click(okBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALID2026',
          name: 'Voucher hợp lệ',
          discountType: 'PERCENT',
          discountValue: 15,
          quantity: 80,
        })
      );
    });
  });
});
