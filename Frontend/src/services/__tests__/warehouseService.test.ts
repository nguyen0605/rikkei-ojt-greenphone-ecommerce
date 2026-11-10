import { beforeEach, describe, expect, it, vi } from 'vitest';
import api, { get, post, put } from '../api';
import { warehouseService, warehouseInventoryService } from '../warehouseService';

vi.mock('../api', () => ({ default: { patch: vi.fn() }, get: vi.fn(), post: vi.fn(), put: vi.fn() }));

describe('warehouseService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the versioned list endpoint and forwards cancellation', async () => {
    const signal = new AbortController().signal;
    vi.mocked(get).mockResolvedValue([]);
    expect(await warehouseService.list(signal)).toEqual([]);
    expect(get).toHaveBeenCalledWith('/v1/admin/warehouses', { signal });
  });

  it('posts and puts only warehouse form fields', async () => {
    const values = { code: 'WH-DN-Q1', name: 'Kho Đà Nẵng', address: 'Hải Châu' };
    await warehouseService.create(values);
    await warehouseService.update(3, values);
    expect(post).toHaveBeenCalledWith('/v1/admin/warehouses', values);
    expect(put).toHaveBeenCalledWith('/v1/admin/warehouses/3', values);
  });

  it('patches status and unwraps ApiResponse', async () => {
    const warehouse = { id: 3, status: 'INACTIVE' };
    vi.mocked(api.patch).mockResolvedValue({ data: { code: 200, data: warehouse } });
    expect(await warehouseService.updateStatus(3, 'INACTIVE')).toEqual(warehouse);
    expect(api.patch).toHaveBeenCalledWith('/v1/admin/warehouses/3/status', { status: 'INACTIVE' });
  });

  it('uses branch stock and variant distribution paths', async () => {
    await warehouseInventoryService.stock(3);
    await warehouseInventoryService.distribution(7);
    expect(get).toHaveBeenCalledWith('/v1/admin/warehouses/3/stock');
    expect(get).toHaveBeenCalledWith('/v1/admin/inventory/variants/7/warehouses');
  });

  it('posts explicit warehouse movements and transfers', async () => {
    const movement = { variantId: 7, quantity: 2, changeType: 'IMPORT' as const, reason: 'Delivery' };
    await warehouseInventoryService.movement(3, movement);
    await warehouseInventoryService.transfer(3, { variantId: 7, quantity: 2, targetWarehouseId: 1, reason: 'Transfer' });
    expect(post).toHaveBeenCalledWith('/v1/admin/warehouses/3/stock/movements', movement);
    expect(post).toHaveBeenCalledWith('/v1/admin/warehouses/3/stock/transfers', { variantId: 7, quantity: 2, targetWarehouseId: 1, reason: 'Transfer' });
  });
});
