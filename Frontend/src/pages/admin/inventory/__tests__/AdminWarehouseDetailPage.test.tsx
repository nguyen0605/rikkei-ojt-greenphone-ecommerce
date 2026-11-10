import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminWarehouseDetailPage from '../AdminWarehouseDetailPage';
import VariantWarehouseStock from '@/components/admin/warehouse/VariantWarehouseStock';
import { warehouseService, warehouseInventoryService, type Warehouse, type WarehouseStock } from '@/services/warehouseService';
import type { PhoneVariantDTO } from '@/types/api';

vi.mock('@/services/warehouseService', () => ({
  warehouseService: { get: vi.fn(), list: vi.fn() },
  warehouseInventoryService: { stock: vi.fn(), movement: vi.fn(), transfer: vi.fn(), history: vi.fn(), distribution: vi.fn() },
}));
vi.mock('@/services', () => ({ adminPhoneService: { list: vi.fn(), variants: vi.fn() } }));

const branch: Warehouse = { id: 3, code: 'WH-DN-Q1', name: 'Kho Đà Nẵng', address: 'Hải Châu', status: 'ACTIVE', createdAt: '', updatedAt: null };
const stock: WarehouseStock = { warehouseId: 3, warehouseCode: branch.code, warehouseName: branch.name, warehouseStatus: 'ACTIVE',
  variantId: 7, phoneId: 1, productName: 'Redmi Note', sku: 'REDMI-XF', ram: '8GB', storage: '256GB', color: 'Xanh', quantity: 5, aggregateQuantity: 65 };

describe('branch inventory', () => {
  let client: QueryClient;
  beforeEach(() => {
    vi.resetAllMocks();
    const computedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => computedStyle(element));
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
    vi.mocked(warehouseService.get).mockResolvedValue(branch);
    vi.mocked(warehouseService.list).mockResolvedValue([branch, { ...branch, id: 1, code: 'WH-HN-MAIN', name: 'Hà Nội' }]);
    vi.mocked(warehouseInventoryService.stock).mockResolvedValue([stock]);
    vi.mocked(warehouseInventoryService.distribution).mockResolvedValue([stock,
      { ...stock, warehouseId: 1, warehouseCode: 'WH-HN-MAIN', warehouseName: 'Hà Nội', quantity: 60 }]);
    vi.mocked(warehouseInventoryService.history).mockResolvedValue([]);
    vi.mocked(warehouseInventoryService.movement).mockResolvedValue({ id: 7 } as PhoneVariantDTO);
    vi.mocked(warehouseInventoryService.transfer).mockResolvedValue({ id: 7 } as PhoneVariantDTO);
  });
  afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });
  const mount = () => render(<MemoryRouter initialEntries={['/admin/warehouses/3']}><QueryClientProvider client={client}>
    <Routes><Route path="/admin/warehouses/:id" element={<AdminWarehouseDetailPage />} /></Routes>
  </QueryClientProvider></MemoryRouter>);

  it('renders branch information and variant stock', async () => {
    mount();
    expect(await screen.findByText('REDMI-XF')).toBeInTheDocument();
    expect(screen.getByText('8GB / 256GB / Xanh')).toBeInTheDocument();
    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kho Đà Nẵng' })).toBeInTheDocument();
  });

  it('combines stock filters and search, sorts quantity, and resets', async () => {
    vi.mocked(warehouseInventoryService.stock).mockResolvedValue([
      { ...stock, variantId: 8, sku: 'ZERO', productName: 'Alpha', quantity: 0 },
      { ...stock, variantId: 9, sku: 'MANY', productName: 'Beta', quantity: 20 }, stock,
    ]);
    mount(); const user = userEvent.setup({ delay: null });
    await screen.findByText('REDMI-XF');
    await user.click(screen.getByRole('combobox', { name: 'Lọc tồn kho' }));
    await user.click(screen.getByText('Sắp hết (1–5)'));
    await waitFor(() => expect(screen.queryByText('ZERO')).not.toBeInTheDocument());
    expect(screen.getByText('REDMI-XF')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm trong chi nhánh' }), { target: { value: 'missing' } });
    expect(await screen.findByText('Không có biến thể phù hợp bộ lọc')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đặt lại' }));
    expect(await screen.findByText('ZERO')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Sắp xếp tồn kho' }));
    await user.click(screen.getByText('Tồn kho: cao → thấp'));
    await waitFor(() => {
      const rows = document.querySelectorAll('tr.ant-table-row');
      expect(rows[0]).toHaveTextContent('MANY');
      expect(rows[2]).toHaveTextContent('ZERO');
    });
  }, 15000);

  it('validates movement reason then submits the selected branch and variant', async () => {
    mount(); const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole('button', { name: 'Xuất' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));
    expect(await screen.findByText('Nhập lý do')).toBeInTheDocument();
    expect(warehouseInventoryService.movement).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Xuất bán tại cửa hàng' } });
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(warehouseInventoryService.movement).toHaveBeenCalledWith(3,
      { variantId: 7, quantity: 1, reason: 'Xuất bán tại cửa hàng', changeType: 'EXPORT' }));
  });

  it('retains the form and stock after a failed export', async () => {
    vi.mocked(warehouseInventoryService.movement).mockRejectedValue(new Error('Insufficient stock'));
    mount(); const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole('button', { name: 'Xuất' }));
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Test' } });
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));
    expect(await screen.findByText('Insufficient stock')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Lý do')).toHaveValue('Test');
  });

  it('always shows four fields with stock quantities and rejects identical warehouses', async () => {
    mount(); const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole('button', { name: /^Nhập$/ }));
    expect(screen.getByRole('combobox', { name: 'Kho nhập' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Kho xuất' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Số lượng' })).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Kho xuất' }));
    await user.click(await screen.findByText(/WH-DN-Q1 — Kho Đà Nẵng · Tồn: 5/, { selector: '.ant-select-item-option-content' }));
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Test same warehouse' } });
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));
    expect(await screen.findByText('Kho nhập phải khác kho xuất')).toBeInTheDocument();
    expect(warehouseInventoryService.movement).not.toHaveBeenCalled();
    expect(warehouseInventoryService.transfer).not.toHaveBeenCalled();
  }, 15000);

  it('sends the warehouse selected in the export form instead of the viewed branch', async () => {
    mount(); const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole('button', { name: 'Xuất' }));
    await user.click(screen.getByRole('combobox', { name: 'Kho xuất' }));
    await user.click(await screen.findByText(/WH-HN-MAIN — Hà Nội · Tồn:/));
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Xuất từ Hà Nội' } });
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(warehouseInventoryService.movement).toHaveBeenCalledWith(1,
      { variantId: 7, quantity: 1, reason: 'Xuất từ Hà Nội', changeType: 'EXPORT' }));
  }, 15000);

  it('uses export to move stock between branches without a separate transfer action', async () => {
    mount(); const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole('button', { name: /^Xuất$/ }));
    expect(screen.queryByRole('button', { name: /^Chuyển kho$/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Điều chuyển' } });
    await user.click(screen.getByRole('combobox', { name: 'Kho nhập' }));
    await user.click(await screen.findByText(/WH-HN-MAIN — Hà Nội · Tồn:/));
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(warehouseInventoryService.transfer).toHaveBeenCalledWith(3,
      { variantId: 7, quantity: 1, reason: 'Điều chuyển', targetWarehouseId: 1 }));
  }, 15000);

  it('disables stock operations for inactive branches', async () => {
    vi.mocked(warehouseService.get).mockResolvedValue({ ...branch, status: 'INACTIVE' });
    mount();
    await screen.findByText('REDMI-XF');
    expect(screen.getByRole('button', { name: 'Nhập sản phẩm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xuất' })).toBeDisabled();
  });

  it('expands variant allocation including branches with zero quantity', async () => {
    vi.mocked(warehouseInventoryService.distribution).mockResolvedValue([{ ...stock, quantity: 0 },
      { ...stock, warehouseId: 1, warehouseCode: 'WH-HN-MAIN', warehouseName: 'Hà Nội', quantity: 60 }]);
    render(<MemoryRouter><QueryClientProvider client={client}><VariantWarehouseStock variantId={7} /></QueryClientProvider></MemoryRouter>);
    expect(await screen.findByText('WH-HN-MAIN')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hà Nội' })).toHaveAttribute('href', '/admin/warehouses/1');
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
