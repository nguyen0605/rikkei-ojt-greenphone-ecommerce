import api, { get, post, put } from './api';
import type { ApiResponse } from '@/types/api';
export interface Supplier {
  id: number; code: string; name: string; taxCode: string | null; phone: string | null;
  email: string | null; address: string | null; status: 'ACTIVE' | 'INACTIVE';
}
export type SupplierRequest = Omit<Supplier, 'id' | 'status'>;
const path = '/v1/admin/suppliers';
export const supplierService = {
  list: (keyword = '') => get<Supplier[]>(path, { params: { keyword } }),
  create: (values: SupplierRequest) => post<Supplier>(path, values),
  update: (id: number, values: SupplierRequest) => put<Supplier>(`${path}/${id}`, values),
  updateStatus: async (id: number, status: Supplier['status']) => {
    const response = await api.patch<ApiResponse<Supplier>>(`${path}/${id}/status`, { status });
    return response.data.data;
  },
};
