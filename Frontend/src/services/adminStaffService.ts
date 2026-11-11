import { get, post, put } from './api';
import type { StaffDTO, CreateStaffRequest, UpdateStaffRoleRequest, PageResponse } from '@/types/api';

export const adminStaffService = {
  list: (params?: Record<string, string>) =>
    get<PageResponse<StaffDTO>>('/admin/staff', params),

  detail: (id: number) =>
    get<StaffDTO>(`/admin/staff/${id}`),

  create: (data: CreateStaffRequest) =>
    post<StaffDTO>('/admin/staff', data),

  updateRole: (id: number, data: UpdateStaffRoleRequest) =>
    put<StaffDTO>(`/admin/staff/${id}/role`, data),

  updateStatus: (id: number, status: string) =>
    put<StaffDTO>(`/admin/staff/${id}/status`, { status }),
};
