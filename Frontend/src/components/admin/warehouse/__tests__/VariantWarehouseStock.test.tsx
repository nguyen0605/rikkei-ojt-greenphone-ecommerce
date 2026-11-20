import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VariantWarehouseStock from '../VariantWarehouseStock';
import { warehouseInventoryService, type WarehouseStock } from '@/services/warehouseService';

vi.mock('@/services/warehouseService', () => ({ warehouseInventoryService: { distribution: vi.fn() } }));
const stock = { warehouseId: 1, warehouseCode: 'WH-A', warehouseName: 'Branch A', warehouseStatus: 'ACTIVE',
  variantId: 7, quantity: 2, aggregateQuantity: 22 } as WarehouseStock;

describe('variant branch stock on expansion', () => {
  let client: QueryClient;
  beforeEach(() => {
    vi.resetAllMocks();
    const computed = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => computed(element));
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    vi.mocked(warehouseInventoryService.distribution).mockResolvedValue([stock]);
  });
  afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });
  const mount = (variantId = 7, stocks?: WarehouseStock[] | null) => render(
    <MemoryRouter><QueryClientProvider client={client}><VariantWarehouseStock variantId={variantId} stocks={stocks} /></QueryClientProvider></MemoryRouter>,
  );

  it('loads immediately when the regular variants API supplies warehouseStocks null', async () => {
    mount(7, null);
    await waitFor(() => expect(warehouseInventoryService.distribution).toHaveBeenCalledWith(7));
    expect(await screen.findByText('WH-A')).toBeInTheDocument();
  });

  it('also loads when the field is absent, and shows loading until the API completes', async () => {
    let finish!: (rows: WarehouseStock[]) => void;
    vi.mocked(warehouseInventoryService.distribution).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const view = mount();
    await waitFor(() => expect(warehouseInventoryService.distribution).toHaveBeenCalledWith(7));
    expect(view.container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    await act(async () => { finish([stock]); });
    expect(await screen.findByText('WH-A')).toBeInTheDocument();
    expect(view.container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
  });

  it('renders filtered branch data without fetching the unfiltered distribution', async () => {
    mount(7, [stock]);
    expect(screen.getByText('WH-A')).toBeInTheDocument();
    expect(warehouseInventoryService.distribution).not.toHaveBeenCalled();
  });

  it('treats an explicit empty filter result as empty, not as a request to fetch all branches', () => {
    mount(7, []);
    expect(screen.getByText('Không có dữ liệu tồn kho chi nhánh trong phạm vi hiện tại')).toBeInTheDocument();
    expect(warehouseInventoryService.distribution).not.toHaveBeenCalled();
  });

  it('shows empty state after a successful API response with no branches', async () => {
    vi.mocked(warehouseInventoryService.distribution).mockResolvedValue([]);
    mount(7, null);
    expect(await screen.findByText('Không có dữ liệu tồn kho chi nhánh trong phạm vi hiện tại')).toBeInTheDocument();
    await waitFor(() => expect(warehouseInventoryService.distribution).toHaveBeenCalledTimes(1));
  });

  it('shows a retry action after error, and fetches again on retry', async () => {
    vi.mocked(warehouseInventoryService.distribution).mockRejectedValueOnce(new Error('Network failed')).mockResolvedValueOnce([stock]);
    mount(7, null);
    expect(await screen.findByText('Không thể tải phân bổ tồn kho')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Thử lại'));
    expect(await screen.findByText('WH-A')).toBeInTheDocument();
    expect(warehouseInventoryService.distribution).toHaveBeenCalledTimes(2);
  });

  it('uses cached data on remount without requesting the same variant again', async () => {
    const first = mount(7, null);
    await screen.findByText('WH-A');
    first.unmount();
    mount(7, null);
    expect(screen.getByText('WH-A')).toBeInTheDocument();
    expect(warehouseInventoryService.distribution).toHaveBeenCalledTimes(1);
  });

  it('keeps simultaneous variants separate and deduplicates consumers of the same variant', async () => {
    vi.mocked(warehouseInventoryService.distribution).mockImplementation(async id => [{ ...stock, variantId: id, warehouseCode: 'VARIANT-' + id }]);
    mount(7, null); mount(8, null); mount(7, null);
    await screen.findByText('VARIANT-8');
    expect(await screen.findAllByText('VARIANT-7')).toHaveLength(2);
    expect(warehouseInventoryService.distribution).toHaveBeenCalledTimes(2);
  });

  it('refreshes changed quantity when the movement-success query invalidation runs', async () => {
    mount(7, null);
    await screen.findByText('WH-A');
    vi.mocked(warehouseInventoryService.distribution).mockResolvedValue([{ ...stock, quantity: 9 }]);
    await act(async () => { await client.invalidateQueries({ queryKey: ['warehouse-distribution', 7] }); });
    expect(await screen.findByText('9')).toBeInTheDocument();
    expect(warehouseInventoryService.distribution).toHaveBeenCalledTimes(2);
  });

  it('uses an in-flight request on fast close/reopen without mixing or duplicating it', async () => {
    let finish!: (rows: WarehouseStock[]) => void;
    vi.mocked(warehouseInventoryService.distribution).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const first = mount(7, null);
    await waitFor(() => expect(warehouseInventoryService.distribution).toHaveBeenCalledTimes(1));
    first.unmount(); mount(7, null);
    await act(async () => { finish([stock]); });
    expect(await screen.findByText('WH-A')).toBeInTheDocument();
    expect(warehouseInventoryService.distribution).toHaveBeenCalledTimes(1);
  });
});
