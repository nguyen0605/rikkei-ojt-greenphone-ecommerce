import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPurchaseOrdersPage from '../AdminPurchaseOrdersPage';
import AdminSuppliersPage from '../AdminSuppliersPage';
import { purchaseOrderService, type PurchaseOrder } from '@/services/purchaseOrderService';
import { supplierService } from '@/services/supplierService';
import { warehouseService } from '@/services/warehouseService';
import { receiveWarning } from '@/components/admin/purchaseOrder/PurchaseOrderDetailDrawer';
import { purchaseOrderSchema } from '@/components/admin/purchaseOrder/purchaseOrderSchema';
vi.mock('@/services/purchaseOrderService', async (original) => {
  const actual = await original<typeof import('@/services/purchaseOrderService')>();
  return { ...actual, purchaseOrderService: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), receive: vi.fn(), order: vi.fn(), cancel: vi.fn() } };
});
vi.mock('@/services/supplierService', () => ({ supplierService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), updateStatus: vi.fn() } }));
vi.mock('@/services/warehouseService', () => ({ warehouseService: { list: vi.fn() } }));
vi.mock('@/services', () => ({ adminPhoneService: { list: vi.fn().mockResolvedValue({ content: [] }), variants: vi.fn().mockResolvedValue([]) } }));
const po: PurchaseOrder = { id: 1, poNumber: 'PO-DEMO', supplierId: 3, supplierName: 'Digiworld', warehouseId: 2, warehouseName: 'Kho TP.HCM', status: 'ORDERED',
  totalCost: 1250000000, note: null, createdAt: '2026-11-11T10:00:00', items: [{ id: 1, variantId: 7, sku: 'IP16-PRO', quantityOrdered: 50, quantityReceived: 0, unitCost: 25000000 }] };
describe('purchase orders', () => {
  let client: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks(); client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
    const style = window.getComputedStyle.bind(window); vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => style(element));
    vi.mocked(purchaseOrderService.list).mockResolvedValue({ content: [po], totalElements: 1 });
    vi.mocked(purchaseOrderService.get).mockResolvedValue(po);
    vi.mocked(purchaseOrderService.receive).mockResolvedValue({ ...po, status: 'RECEIVED', items: po.items.map((item) => ({ ...item, quantityReceived: 50 })) });
    vi.mocked(supplierService.list).mockResolvedValue([{ id: 3, code: 'SUP-DGW', name: 'Digiworld', taxCode: '1234567890', email: null, phone: null, address: null, status: 'ACTIVE' }]);
    vi.mocked(warehouseService.list).mockResolvedValue([{ id: 2, code: 'WH-HCM-Q1', name: 'Kho TP.HCM', address: 'Q1', status: 'ACTIVE', createdAt: '', updatedAt: null }]);
  });
  afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });
  function mount(element = <AdminPurchaseOrdersPage />) { render(<QueryClientProvider client={client}>{element}</QueryClientProvider>); }
  it('renders PO supplier, warehouse and VND cost', async () => {
    mount(); expect(await screen.findByText('PO-DEMO')).toBeInTheDocument(); expect(screen.getByText('Kho TP.HCM')).toBeInTheDocument();
    expect(screen.getByText(/1\.250\.000\.000/)).toBeInTheDocument();
  });
  it('opens supplier details and filters inactive suppliers', async () => {
    mount(<AdminSuppliersPage />); const user=userEvent.setup({ delay: null });
    await user.click(await screen.findByRole('button', { name: 'Chi tiết SUP-DGW' }));
    expect(await screen.findByText('Chi tiết nhà cung cấp')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('combobox', { name: 'Lọc trạng thái NCC' }));
    await user.click((await screen.findAllByText('INACTIVE')).at(-1)!); await waitFor(() => expect(screen.queryByRole('button', { name: 'Chi tiết SUP-DGW' })).not.toBeInTheDocument());
  });
  it('sends PO sorting to the server and exposes an explicit detail action', async () => {
    mount(); const user=userEvent.setup({ delay: null });
    await user.click(screen.getByRole('combobox', { name: 'Sắp xếp PO' })); await user.click(await screen.findByText('Tổng tiền giảm dần'));
    await waitFor(() => expect(purchaseOrderService.list).toHaveBeenCalledWith(undefined,0,{ sort: 'COST_DESC' }));
    await user.click(await screen.findByRole('button', { name: 'Chi tiết PO-DEMO' }));
    expect(await screen.findByText('IP16-PRO')).toBeInTheDocument();
  });
  it('filters orders by status', async () => {
    mount(); const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole('combobox', { name: 'Lọc trạng thái PO' })); await user.click(await screen.findByText('CANCELLED'));
    await waitFor(() => expect(purchaseOrderService.list).toHaveBeenCalledWith('CANCELLED', 0));
  });
  it('validates required supplier, warehouse and line fields before creating', async () => {
    mount(); const user = userEvent.setup({ delay: null }); await user.click(screen.getByRole('button', { name: 'Tạo Đơn Nhập Hàng Mới' }));
    await user.click(screen.getByRole('button', { name: /^Tạo Đơn$/ }));
    expect(await screen.findByText('Chọn biến thể')).toBeInTheDocument();
    expect(screen.getByText('Đơn giá phải lớn hơn 0')).toBeInTheDocument(); expect(purchaseOrderService.create).not.toHaveBeenCalled();
  });
  it('confirms receive then removes receive action and updates list immediately', async () => {
    mount(); const user = userEvent.setup({ delay: null }); await user.click(await screen.findByText('PO-DEMO'));
    await user.click(await screen.findByRole('button', { name: 'Nhận Hàng Vào Kho' })); expect(await screen.findByText(receiveWarning)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xác nhận nhận hàng' }));
    await waitFor(() => expect(purchaseOrderService.receive).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Nhận Hàng Vào Kho' })).not.toBeInTheDocument());
    expect(screen.getAllByText('RECEIVED').length).toBeGreaterThan(0);
  });
  it.each(['RECEIVED', 'CANCELLED'] as const)('does not offer receive for %s', async (status) => {
    vi.mocked(purchaseOrderService.get).mockResolvedValue({ ...po, status }); mount();
    await userEvent.click(await screen.findByText('PO-DEMO')); await screen.findAllByText(status);
    expect(screen.queryByRole('button', { name: 'Nhận Hàng Vào Kho' })).not.toBeInTheDocument();
  });
  it('keeps failed receive retryable without marking PO received', async () => {
    vi.mocked(purchaseOrderService.receive).mockRejectedValue(new Error('Kho đã ngừng hoạt động')); mount(); const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByText('PO-DEMO')); await user.click(await screen.findByRole('button', { name: 'Nhận Hàng Vào Kho' }));
    await user.click(await screen.findByRole('button', { name: 'Xác nhận nhận hàng' }));
    expect(await screen.findByText('Kho đã ngừng hoạt động')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Nhận Hàng Vào Kho' })).toBeEnabled();
  });
  it('does not receive when confirmation is cancelled', async () => {
    mount(); const user = userEvent.setup({ delay: null }); await user.click(await screen.findByText('PO-DEMO'));
    await user.click(await screen.findByRole('button', { name: 'Nhận Hàng Vào Kho' }));
    await user.click(await screen.findByRole('button', { name: /^Hủy$/ })); expect(purchaseOrderService.receive).not.toHaveBeenCalled();
  });
  it('disables receive while the request is pending', async () => {
    let finish!: (value: PurchaseOrder) => void;
    vi.mocked(purchaseOrderService.receive).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    mount(); const user = userEvent.setup({ delay: null }); await user.click(await screen.findByText('PO-DEMO'));
    await user.click(await screen.findByRole('button', { name: 'Nhận Hàng Vào Kho' }));
    await user.click(await screen.findByRole('button', { name: 'Xác nhận nhận hàng' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nhận Hàng Vào Kho' })).toBeDisabled());
    expect(purchaseOrderService.receive).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ ...po, status: 'RECEIVED' }); });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Nhận Hàng Vào Kho' })).not.toBeInTheDocument(), { timeout: 5000 });
  });
  it('searches suppliers by tax code', async () => {
    mount(<AdminSuppliersPage />); await screen.findByText('Digiworld'); const input = screen.getByPlaceholderText('Tìm tên hoặc mã số thuế...');
    fireEvent.change(input, { target: { value: '1234567890' } }); fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    await waitFor(() => expect(supplierService.list).toHaveBeenCalledWith('1234567890'));
  });
  it('rejects duplicate variants and fractional VND amounts', () => {
    const line = { variantId: 7, quantity: 1, unitCost: 10 };
    expect(purchaseOrderSchema.safeParse({ supplierId: 3, warehouseId: 2, status: 'ORDERED', items: [line, line] }).success).toBe(false);
    expect(purchaseOrderSchema.safeParse({ supplierId: 3, warehouseId: 2, status: 'ORDERED', items: [{ ...line, unitCost: 1.5 }] }).success).toBe(false);
  });
  it('edits an existing draft with its current variant preserved', async () => {
    const draft = { ...po, status: 'DRAFT' as const };
    vi.mocked(purchaseOrderService.get).mockResolvedValue(draft);
    vi.mocked(purchaseOrderService.update).mockResolvedValue({ ...draft, totalCost: 75000000 });
    mount(); const user = userEvent.setup({ delay: null }); await user.click(await screen.findByText('PO-DEMO'));
    await user.click(await screen.findByRole('button', { name: 'Sửa PO nháp' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Số lượng' }), { target: { value: '3' } });
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(purchaseOrderService.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'DRAFT', items: [{ variantId: 7, quantity: 3, unitCost: 25000000 }] })));
  });
  it('does not offer edit for an ordered PO', async () => {
    mount(); await userEvent.click(await screen.findByText('PO-DEMO'));
    await screen.findByRole('button', { name: 'Nhận Hàng Vào Kho' }); expect(screen.queryByRole('button', { name: 'Sửa PO nháp' })).not.toBeInTheDocument();
  });
  it('creates a supplier with validation', async () => {
    vi.mocked(supplierService.create).mockResolvedValue({ id: 4, code: 'SUP-NEW', name: 'New supplier', taxCode: null, email: null, phone: null, address: null, status: 'ACTIVE' });
    mount(<AdminSuppliersPage />); const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole('button', { name: 'Thêm nhà cung cấp' }));
    await user.click(screen.getByRole('button', { name: 'Lưu' })); expect(await screen.findByText('Tên tối thiểu 3 ký tự')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Mã NCC' }), 'SUP-NEW'); await user.type(screen.getByRole('textbox', { name: 'Tên công ty' }), 'New supplier');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(supplierService.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'SUP-NEW', name: 'New supplier' })));
  });
  it('updates supplier details', async () => {
    vi.mocked(supplierService.update).mockResolvedValue({ id: 3, code: 'SUP-DGW', name: 'Digiworld Updated', taxCode: null, email: null, phone: null, address: null, status: 'ACTIVE' });
    mount(<AdminSuppliersPage />); const user = userEvent.setup({ delay: null }); await user.click(await screen.findByRole('button', { name: 'Sửa SUP-DGW' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Tên công ty' }), { target: { value: 'Digiworld Updated' } });
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(supplierService.update).toHaveBeenCalledWith(3, expect.objectContaining({ name: 'Digiworld Updated' })));
  });
  it('requires confirmation before deactivating supplier', async () => {
    const inactive = { id: 3, code: 'SUP-DGW', name: 'Digiworld', taxCode: '1234567890', email: null, phone: null, address: null, status: 'INACTIVE' as const };
    vi.mocked(supplierService.updateStatus).mockResolvedValue(inactive);
    mount(<AdminSuppliersPage />); const user = userEvent.setup({ delay: null }); await user.click(await screen.findByRole('switch', { name: 'Trạng thái SUP-DGW' }));
    expect(supplierService.updateStatus).not.toHaveBeenCalled(); vi.mocked(supplierService.list).mockResolvedValue([inactive]);
    await user.click(await screen.findByRole('button', { name: 'Ngừng hoạt động' }));
    await waitFor(() => expect(supplierService.updateStatus).toHaveBeenCalledWith(3, 'INACTIVE'));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Trạng thái SUP-DGW' })).not.toBeChecked());
  });
});
