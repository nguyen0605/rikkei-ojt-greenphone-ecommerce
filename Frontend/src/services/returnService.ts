import { post, get } from './api';
import api from './api';
import type { ApiResponse } from '@/types/api';

export type ReturnType = 'EXCHANGE' | 'REFUND';
export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface ReturnCreateRequest {
  orderId: number;
  phoneVariantId: number;
  reason: string;
  errorDescription: string;
  type?: ReturnType;
  proofImages?: string[];
}

export interface ReturnResponse {
  id: number;
  returnCode: string;
  orderId: number;
  orderTrackingNumber?: string;
  phoneVariantId: number;
  phoneName?: string;
  variantSku?: string;
  imeiNumber?: string;
  userId: number;
  customerName?: string;
  reason: string;
  errorDescription: string;
  proofImages?: string[];
  type: ReturnType;
  status: ReturnStatus;
  refundAmount?: number;
  adminNote?: string;
  reviewedBy?: number;
  reviewerName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export const returnService = {
  /**
   * Tạo yêu cầu đổi trả / hoàn tiền
   */
  createRequest: (data: ReturnCreateRequest): Promise<ReturnResponse> => {
    return post<ReturnResponse>('/returns', data);
  },

  /**
   * Upload ảnh minh chứng lỗi lên Cloudflare R2
   */
  uploadProofImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<ApiResponse<string>>('/returns/proof-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  /**
   * Lấy danh sách yêu cầu đổi trả của tôi
   */
  getMyRequests: (): Promise<ReturnResponse[]> => {
    return get<ReturnResponse[]>('/returns/my-requests');
  },

  /**
   * Lấy chi tiết yêu cầu đổi trả
   */
  getDetail: (id: number): Promise<ReturnResponse> => {
    return get<ReturnResponse>(`/returns/${id}`);
  },

  /**
   * [ADMIN] Lấy danh sách yêu cầu đổi trả (phân trang + lọc trạng thái)
   */
  getAdminReturns: (params?: Record<string, string>): Promise<{ content: ReturnResponse[]; totalElements: number; totalPages: number; number: number; size: number }> => {
    return get<{ content: ReturnResponse[]; totalElements: number; totalPages: number; number: number; size: number }>('/admin/returns', { params });
  },

  /**
   * [ADMIN] Phê duyệt yêu cầu đổi trả (Đổi mới / Hoàn tiền)
   */
  approveReturn: (id: number, data?: { adminNote?: string; newImeiNumber?: string }): Promise<ReturnResponse> => {
    return api.put<ApiResponse<ReturnResponse>>(`/admin/returns/${id}/approve`, data || {}).then(res => res.data.data);
  },

  /**
   * [ADMIN] Từ chối yêu cầu đổi trả
   */
  rejectReturn: (id: number, data?: { adminNote?: string }): Promise<ReturnResponse> => {
    return api.put<ApiResponse<ReturnResponse>>(`/admin/returns/${id}/reject`, data || {}).then(res => res.data.data);
  },

  /**
   * [ADMIN] Xác nhận hoàn tất quy trình đổi trả
   */
  completeReturn: (id: number, data?: { adminNote?: string }): Promise<ReturnResponse> => {
    return api.put<ApiResponse<ReturnResponse>>(`/admin/returns/${id}/complete`, data || {}).then(res => res.data.data);
  },
};
