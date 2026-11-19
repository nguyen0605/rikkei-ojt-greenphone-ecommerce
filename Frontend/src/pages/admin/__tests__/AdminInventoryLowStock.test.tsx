import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminProductsPage from '../AdminProductsPage';
import { adminPhoneService, brandService, optionService } from '@/services';
import { warehouseService, warehouseInventoryService } from '@/services/warehouseService';
import type { PhoneDTO, PhoneVariantDTO, PageResponse } from '@/types/api';
import type { WarehouseStock } from '@/services/warehouseService';

vi.mock('@/services', () => ({
  adminPhoneService: { list: vi.fn(), variants: vi.fn() },
  brandService: { list: vi.fn() }, optionService: { list: vi.fn() }, adminOptionService: {},
}));
vi.mock('@/services/warehouseService', () => ({
  warehouseService: { list: vi.fn() }, warehouseInventoryService: { distribution: vi.fn() },
}));
const branchStock = { warehouseId: 1, warehouseCode: 'A', warehouseName: 'Branch A', warehouseStatus: 'ACTIVE',
  variantId: 1, quantity: 2, aggregateQuantity: 22 } as WarehouseStock;
const low = { id: 1, phoneId: 1, ram: '8GB', storage: '128GB', color: 'Black', sku: 'LOW-SKU', stockQuantity: 22, price: 100 } as PhoneVariantDTO;
const healthy = { ...low, id: 2, sku: 'HEALTHY-SKU', stockQuantity: 27 };
const phone = { id: 1, name: 'Mixed phone', brandName: 'Brand', variantCount: 2 } as PhoneDTO;

describe('inventory filter scope', () => {
  let client: QueryClient;
  beforeEach(() => {
    vi.resetAllMocks();
    const computed = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => computed(element));
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    vi.mocked(adminPhoneService.list).mockImplementation(async (params) => ({ content: [{ ...phone, variantCount: params?.lowStock ? 1 : 2 }], totalElements: 1, size: 15 } as PageResponse<PhoneDTO>));
    vi.mocked(adminPhoneService.variants).mockImplementation(async (_, params) => params?.warehouseId === '2' && params.lowStock
      ? [] : params?.lowStock ? [{ ...low, warehouseStocks: [branchStock] }] : [low, healthy]);
    vi.mocked(warehouseService.list).mockResolvedValue([
      { id: 1, name: 'Branch A', status: 'ACTIVE' }, { id: 2, name: 'Branch B', status: 'ACTIVE' },
    ] as Awaited<ReturnType<typeof warehouseService.list>>);
    vi.mocked(brandService.list).mockResolvedValue([]);
    vi.mocked(optionService.list).mockResolvedValue([]);
    vi.mocked(warehouseInventoryService.distribution).mockResolvedValue([branchStock, { ...branchStock, warehouseId: 2, quantity: 20 }]);
  });
  afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });
  function mount() { render(<MemoryRouter><QueryClientProvider client={client}><AdminProductsPage inventoryMode /></QueryClientProvider></MemoryRouter>); }

  it('refetches expanded variants on toggle and restores normal variants when disabled', async () => {
    mount(); const user = userEvent.setup({ delay: null });
    await screen.findByText('Mixed phone');
    const expand = screen.getByRole('button', { name: 'Mở rộng biến thể Mixed phone' });
    fireEvent.click(expand);
    expect(await screen.findByText('HEALTHY-SKU')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sắp hết hàng' }));
    await waitFor(() => expect(screen.queryByText('HEALTHY-SKU')).not.toBeInTheDocument());
    expect(await screen.findByText('LOW-SKU')).toBeInTheDocument();
    expect(adminPhoneService.variants).toHaveBeenCalledWith(1, { lowStock: 'true' });
    expect(screen.getByText('1 biến thể')).toBeInTheDocument();
    expect(screen.queryByText('22')).not.toBeInTheDocument();
    fireEvent.click(document.querySelector('.ant-table-expanded-row .ant-table-row-expand-icon') as HTMLElement);
    expect(await screen.findByText('Branch A')).toBeInTheDocument();
    expect(screen.queryByText('20')).not.toBeInTheDocument();
    expect(warehouseInventoryService.distribution).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sắp hết hàng' }));
    expect(await screen.findByText('HEALTHY-SKU')).toBeInTheDocument();
  }, 20000);

  it('switches branch scope without reusing the previous expanded results', async () => {
    mount(); const user = userEvent.setup({ delay: null });
    await screen.findByText('Mixed phone');
    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng biến thể Mixed phone' }));
    await user.click(screen.getByRole('button', { name: 'Sắp hết hàng' }));
    await screen.findByText('LOW-SKU');
    const branch = screen.getAllByRole('combobox')[2];
    await user.click(branch);
    await user.click(screen.getByText('Branch B', { selector: '.ant-select-item-option-content' }));
    await waitFor(() => expect(adminPhoneService.variants).toHaveBeenCalledWith(1, { lowStock: 'true', warehouseId: '2' }));
    expect(await screen.findByText('Không có biến thể phù hợp bộ lọc')).toBeInTheDocument();
    expect(screen.queryByText('LOW-SKU')).not.toBeInTheDocument();
  }, 20000);
});
