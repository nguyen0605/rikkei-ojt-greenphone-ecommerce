import { get, post, put } from './api';
import type {
  ClaimStatus,
  PageResponse,
  ReturnResponseDTO,
  ReturnReviewRequest,
  ReturnStatus,
  UpdateClaimStatusRequest,
  WarrantyClaimCreateRequest,
  WarrantyClaimResponseDTO,
} from '@/types/api';

export interface AdminReturnListParams {
  status?: ReturnStatus;
  keyword?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

/**
 * Service quản lý yêu cầu đổi trả & hoàn tiền dành cho Admin / Kỹ thuật / Kinh doanh.
 */
export const adminReturnService = {
  list: (params?: AdminReturnListParams) => {
    const query: Record<string, string | number> = {};
    if (params?.status) query.status = params.status;
    const term = params?.keyword?.trim() || params?.search?.trim();
    if (term) query.keyword = term;
    if (params?.page !== undefined) query.page = params.page;
    if (params?.size !== undefined) query.size = params.size;
    if (params?.sort) query.sort = params.sort;
    return get<PageResponse<ReturnResponseDTO>>('/admin/returns', { params: query });
  },

  detail: (id: number) => get<ReturnResponseDTO>(`/admin/returns/${id}`),

  approve: (id: number, data?: ReturnReviewRequest) =>
    put<ReturnResponseDTO>(`/admin/returns/${id}/approve`, data ?? {}),

  reject: (id: number, data: ReturnReviewRequest) =>
    put<ReturnResponseDTO>(`/admin/returns/${id}/reject`, data),

  complete: (id: number, data?: ReturnReviewRequest) =>
    put<ReturnResponseDTO>(`/admin/returns/${id}/complete`, data ?? {}),
};

/**
 * Service quản lý tiếp nhận & xử lý bảo hành phần cứng theo số IMEI (KTV / Kho / Admin).
 */
export const adminWarrantyClaimService = {
  list: (status?: ClaimStatus) =>
    get<WarrantyClaimResponseDTO[]>('/admin/warranty-claims', {
      params: status ? { status } : undefined,
    }),

  detail: (id: number) => get<WarrantyClaimResponseDTO>(`/admin/warranty-claims/${id}`),

  byCode: (claimCode: string) =>
    get<WarrantyClaimResponseDTO>(`/admin/warranty-claims/code/${encodeURIComponent(claimCode)}`),

  byImei: (imeiNumber: string) =>
    get<WarrantyClaimResponseDTO[]>(`/admin/warranty-claims/imei/${encodeURIComponent(imeiNumber)}`),

  create: (data: WarrantyClaimCreateRequest) =>
    post<WarrantyClaimResponseDTO>('/admin/warranty-claims', data),

  updateStatus: (id: number, data: UpdateClaimStatusRequest) =>
    put<WarrantyClaimResponseDTO>(`/admin/warranty-claims/${id}/status`, data),
};
