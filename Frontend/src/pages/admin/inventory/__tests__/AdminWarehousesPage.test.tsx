import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminWarehousesPage from '../AdminWarehousesPage';
import { warehouseService, type Warehouse } from '@/services/warehouseService';
import { warehouseSchema } from '@/components/admin/warehouse/warehouseSchema';

vi.mock('@/services/warehouseService', () => ({
  warehouseService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), updateStatus: vi.fn() },
}));

const fixtures: Warehouse[] = [
  { id: 1, code: 'WH-HN-MAIN', name: 'Kho Tổng Hà Nội', address: 'Cầu Giấy, Hà Nội', status: 'ACTIVE', createdAt: '2026-11-10T00:00:00', updatedAt: null },
  { id: 2, code: 'WH-HCM-Q1', name: 'Kho TP.HCM', address: 'Quận 1, TP.HCM', status: 'INACTIVE', createdAt: '2026-11-10T00:00:00', updatedAt: null },
];

describe('AdminWarehousesPage', () => {
  let client: QueryClient;
  let rows: Warehouse[];

  beforeEach(() => {
    vi.resetAllMocks();
    const computedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => computedStyle(element));
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
    rows = fixtures.map((warehouse) => ({ ...warehouse }));
    vi.mocked(warehouseService.list).mockImplementation(async () => [...rows]);
    vi.mocked(warehouseService.create).mockImplementation(async (values) => {
      const warehouse: Warehouse = { ...values, id: 3, status: 'ACTIVE', createdAt: '2026-11-10T01:00:00', updatedAt: null };
      rows.push(warehouse);
      return warehouse;
    });
    vi.mocked(warehouseService.update).mockImplementation(async (id, values) => {
      const warehouse = { ...rows.find((item) => item.id === id)!, ...values };
      rows = rows.map((item) => item.id === id ? warehouse : item);
      return warehouse;
    });
    vi.mocked(warehouseService.updateStatus).mockImplementation(async (id, status) => {
      const warehouse = { ...rows.find((item) => item.id === id)!, status };
      rows = rows.map((item) => item.id === id ? warehouse : item);
      return warehouse;
    });
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.restoreAllMocks();
  });

  function mount() {
    return render(<MemoryRouter><QueryClientProvider client={client}><AdminWarehousesPage /></QueryClientProvider></MemoryRouter>);
  }

  async function openCreate() {
    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole('button', { name: 'Thêm Chi Nhánh Mới' }));
    return user;
  }

  async function fillForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Mã kho'), 'WH-DN-Q1');
    await user.type(screen.getByLabelText('Tên kho'), 'Kho Chi Nhánh Đà Nẵng');
    await user.type(screen.getByLabelText('Địa chỉ'), 'Hải Châu, Đà Nẵng');
  }

  it('renders codes, names, addresses and controlled statuses', async () => {
    mount();
    expect(await screen.findByText('WH-HN-MAIN')).toBeInTheDocument();
    expect(screen.getByText('Kho TP.HCM')).toBeInTheDocument();
    expect(screen.getByText('Cầu Giấy, Hà Nội')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Trạng thái WH-HN-MAIN' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Trạng thái WH-HCM-Q1' })).not.toBeChecked();
  });

  it('shows field errors and does not call API for invalid form', async () => {
    mount();
    const user = await openCreate();
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Tên kho phải có ít nhất 3 ký tự')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập địa chỉ')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Mã kho'), 'wh-đn');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Mã kho chỉ gồm chữ hoa không dấu, số và dấu gạch nối')).toBeInTheDocument();
    expect(warehouseService.create).not.toHaveBeenCalled();
  });

  it('adds a new row immediately without reloading the page', async () => {
    mount();
    await screen.findByText('WH-HN-MAIN');
    const user = await openCreate();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('WH-DN-Q1')).toBeInTheDocument();
    expect(warehouseService.create).toHaveBeenCalledWith({ code: 'WH-DN-Q1', name: 'Kho Chi Nhánh Đà Nẵng', address: 'Hải Châu, Đà Nẵng' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('prefills editing and saves the updated address', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Sửa WH-HN-MAIN' }));
    expect(screen.getByLabelText('Mã kho')).toHaveValue('WH-HN-MAIN');
    await user.clear(screen.getByLabelText('Địa chỉ'));
    await user.type(screen.getByLabelText('Địa chỉ'), 'Địa chỉ mới');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Địa chỉ mới')).toBeInTheDocument();
    expect(warehouseService.update).toHaveBeenCalledWith(1, expect.objectContaining({ address: 'Địa chỉ mới' }));
  });

  it('requires confirmation before deactivation and cancel sends no request', async () => {
    mount();
    const user = userEvent.setup();
    const toggle = await screen.findByRole('switch', { name: 'Trạng thái WH-HN-MAIN' });
    await user.click(toggle);
    expect(await screen.findByText('Ngừng hoạt động chi nhánh?')).toBeInTheDocument();
    expect(toggle).toBeChecked();
    expect(warehouseService.updateStatus).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(warehouseService.updateStatus).not.toHaveBeenCalled();
    expect(toggle).toBeChecked();
  });

  it('confirms deactivation and updates the badge and switch', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('switch', { name: 'Trạng thái WH-HN-MAIN' }));
    await user.click(await screen.findByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(warehouseService.updateStatus).toHaveBeenCalledWith(1, 'INACTIVE'));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Trạng thái WH-HN-MAIN' })).not.toBeChecked());
    const row = screen.getByText('WH-HN-MAIN').closest('tr')!;
    expect(within(row).getByText('INACTIVE')).toBeInTheDocument();
  });

  it('activates an inactive warehouse directly', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('switch', { name: 'Trạng thái WH-HCM-Q1' }));
    await waitFor(() => expect(warehouseService.updateStatus).toHaveBeenCalledWith(2, 'ACTIVE'));
    expect(screen.queryByText('Ngừng hoạt động chi nhánh?')).not.toBeInTheDocument();
  });

  it('retains old status if the update fails', async () => {
    vi.mocked(warehouseService.updateStatus).mockRejectedValue(new Error('Mất kết nối'));
    mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('switch', { name: 'Trạng thái WH-HCM-Q1' }));
    expect(await screen.findByText('Mất kết nối')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Trạng thái WH-HCM-Q1' })).not.toBeChecked();
  });

  it('shows duplicate error under code and preserves entered values', async () => {
    vi.mocked(warehouseService.create).mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { errorCode: 'WAREHOUSE_CODE_DUPLICATE' } } });
    mount();
    const user = await openCreate();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Mã kho đã tồn tại, vui lòng chọn mã khác')).toBeInTheDocument();
    expect(screen.getByLabelText('Tên kho')).toHaveValue('Kho Chi Nhánh Đà Nẵng');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('disables save while pending and blocks repeated submission', async () => {
    let finish!: (warehouse: Warehouse) => void;
    vi.mocked(warehouseService.create).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    mount();
    const user = await openCreate();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Lưu/ })).toBeDisabled());
    await user.click(screen.getByRole('button', { name: /Lưu/ }));
    expect(warehouseService.create).toHaveBeenCalledTimes(1);
    finish({ ...fixtures[0], id: 3, code: 'WH-DN-Q1' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows load error and retries successfully', async () => {
    vi.mocked(warehouseService.list).mockRejectedValueOnce(new Error('Không kết nối được'));
    mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('WH-HN-MAIN')).toBeInTheDocument();
  });

  it('renders empty list and resets form on reopening', async () => {
    rows = [];
    mount();
    expect(await screen.findByText('Chưa có chi nhánh kho hàng')).toBeInTheDocument();
    const user = await openCreate();
    await user.type(screen.getByLabelText('Mã kho'), 'OLD');
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    await openCreate();
    expect(screen.getByLabelText('Mã kho')).toHaveValue('');
  });

  it('enforces schema length limits and trims display fields', () => {
    const valid = { code: 'WH-DN-Q1', name: ' Kho Đà Nẵng ', address: ' Hải Châu ' };
    expect(warehouseSchema.parse(valid)).toEqual({ code: valid.code, name: 'Kho Đà Nẵng', address: 'Hải Châu' });
    for (const invalid of [{ ...valid, name: ' a ' }, { ...valid, address: ' ' },
      { ...valid, code: 'A'.repeat(51) }, { ...valid, name: 'A'.repeat(151) }, { ...valid, address: 'A'.repeat(256) }]) {
      expect(warehouseSchema.safeParse(invalid).success).toBe(false);
    }
  });
});
