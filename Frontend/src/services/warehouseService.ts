import api, { get, post, put } from './api';
import type { ApiResponse } from '@/types/api';
import type { PhoneVariantDTO } from '@/types/api';

export type WarehouseStatus = 'ACTIVE' | 'INACTIVE';

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  address: string;
  status: WarehouseStatus;
  createdAt: string;
  updatedAt: string | null;
}

export interface WarehouseRequest {
  code: string;
  name: string;
  address: string;
}

const path = '/v1/admin/warehouses';

export const warehouseService = {
  get: (id: number) => get<Warehouse>(`${path}/${id}`),
  list: (signal?: AbortSignal) => get<Warehouse[]>(path, { signal }),
  create: (data: WarehouseRequest) => post<Warehouse>(path, data),
  update: (id: number, data: WarehouseRequest) => put<Warehouse>(`${path}/${id}`, data),
  updateStatus: async (id: number, status: WarehouseStatus): Promise<Warehouse> => {
    const response = await api.patch<ApiResponse<Warehouse>>(`${path}/${id}/status`, { status });
    return response.data.data;
  },
};

export interface WarehouseStock {
  warehouseId: number; warehouseCode: string; warehouseName: string; warehouseStatus: WarehouseStatus;
  variantId: number; phoneId: number; productName: string; sku: string;
  ram: string; storage: string; color: string; quantity: number; aggregateQuantity: number;
}
export interface WarehouseStockHistory {
  id: number; variantId: number; sku: string; changeType: string;
  quantityBefore: number; quantityChange: number; quantityAfter: number;
  reason: string; changedByName: string; createdAt: string; transferReference: string | null;
}
export interface BranchMovement { variantId: number; quantity: number; reason: string; changeType: 'IMPORT' | 'EXPORT' }
export const warehouseInventoryService = {
  stock: (id: number) => get<WarehouseStock[]>(`${path}/${id}/stock`),
  distribution: (variantId: number) => get<WarehouseStock[]>(`/v1/admin/inventory/variants/${variantId}/warehouses`),
  movement: (id: number, data: BranchMovement) => post<PhoneVariantDTO>(`${path}/${id}/stock/movements`, data),
  transfer: (id: number, data: Omit<BranchMovement, 'changeType'> & { targetWarehouseId: number }) =>
    post<PhoneVariantDTO>(`${path}/${id}/stock/transfers`, data),
  history: (id: number, variantId?: number) => get<WarehouseStockHistory[]>(`${path}/${id}/stock/history`, { params: { variantId } }),
};
