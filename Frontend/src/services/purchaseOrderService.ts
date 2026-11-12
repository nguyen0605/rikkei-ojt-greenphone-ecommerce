import { get, post, put } from './api';
export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
export interface PurchaseOrderItem { id: number; variantId: number; sku: string; quantityOrdered: number; quantityReceived: number; unitCost: number }
export interface PurchaseOrder {
  id: number; poNumber: string; supplierId: number; supplierName: string; warehouseId: number; warehouseName: string;
  status: PurchaseOrderStatus; totalCost: number; note: string | null; createdAt: string; items: PurchaseOrderItem[];
}
export interface PurchaseOrderRequest {
  supplierId: number; warehouseId: number; status: 'DRAFT' | 'ORDERED'; note?: string;
  items: { variantId: number; quantity: number; unitCost: number }[];
}
export interface PurchaseOrderPage { content: PurchaseOrder[]; totalElements: number }
export interface PurchaseOrderFilters { keyword?: string; supplierId?: number; warehouseId?: number; sort?: string }
const path = '/v1/admin/purchase-orders';
export const purchaseOrderService = {
  list: (status?: PurchaseOrderStatus, page = 0, filters: PurchaseOrderFilters = {}) => get<PurchaseOrderPage>(path, { params: { status, page, size: 10, ...filters } }),
  get: (id: number) => get<PurchaseOrder>(`${path}/${id}`),
  create: (values: PurchaseOrderRequest) => post<PurchaseOrder>(path, values),
  update: (id: number, values: PurchaseOrderRequest) => put<PurchaseOrder>(`${path}/${id}`, values),
  receive: (id: number) => post<PurchaseOrder>(`${path}/${id}/receive`),
  order: (id: number) => post<PurchaseOrder>(`${path}/${id}/order`),
  cancel: (id: number) => post<PurchaseOrder>(`${path}/${id}/cancel`),
};
export const formatProcurementVnd = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
