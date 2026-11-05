import { get, post, put, del } from './api';
import type {
  BrandDTO,
  BrandRequest,
  OptionDTO,
  OptionRequest,
  OptionItemDTO,
  OptionItemRequest,
  PageResponse,
  PhoneDTO,
} from '@/types/api';

export const adminCatalogService = {
  // ---- Brand APIs ----
  getBrands: (params?: Record<string, string>) =>
    get<PageResponse<BrandDTO>>('/admin/brands', { params }),

  createBrand: (data: BrandRequest) =>
    post<BrandDTO>('/admin/brands', data),

  updateBrand: (id: number, data: BrandRequest) =>
    put<BrandDTO>(`/admin/brands/${id}`, data),

  updateBrandStatus: (id: number, status: 'ACTIVE' | 'INACTIVE' | string) =>
    put<BrandDTO>(`/admin/brands/${id}/status`, { status }),

  deleteBrand: (id: number) =>
    del<void>(`/admin/brands/${id}`),

  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return post<{ url: string }>('/admin/brands/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ---- Option Category APIs ----
  getCategories: () =>
    get<OptionDTO[]>('/admin/options'),

  getTypes: () =>
    get<string[]>('/admin/options/types'),

  createCategory: (data: OptionRequest) =>
    post<OptionDTO>('/admin/options', data),

  updateCategory: (id: number, data: OptionRequest) =>
    put<OptionDTO>(`/admin/options/${id}`, data),

  deleteCategory: (id: number) =>
    del<void>(`/admin/options/${id}`),

  // ---- Option Item APIs ----
  getItems: (optionId: number) =>
    get<OptionItemDTO[]>(`/admin/options/${optionId}/items`),

  createItem: (optionId: number, data: OptionItemRequest) =>
    post<OptionItemDTO>(`/admin/options/${optionId}/items`, data),

  updateItem: (id: number, data: OptionItemRequest) =>
    put<OptionItemDTO>(`/admin/options/items/${id}`, data),

  deleteItem: (id: number) =>
    del<void>(`/admin/options/items/${id}`),

  getItemUsage: (id: number, params?: Record<string, string>) =>
    get<PageResponse<PhoneDTO>>(`/admin/options/items/${id}/usage`, { params }),
};

export default adminCatalogService;

