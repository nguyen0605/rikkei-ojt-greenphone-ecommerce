import { get, post, put, del } from './api';
import type {
  ReviewDTO,
  ReviewRequest,
  ReviewSummary,
  PageResponse,
  OrderDTO,
  ReviewQueryParams,
} from '@/types/api';

export const reviewService = {
  /**
   * Tải ảnh đánh giá lên máy chủ / Cloudflare R2
   */
  uploadImages: (formData: FormData): Promise<string[]> => {
    return post<string[]>('/reviews/images', formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
  },

  /**
   * Lấy danh sách đánh giá của sản phẩm theo trang và tham số lọc
   */
  byPhone: (
    phoneId: number,
    params?: ReviewQueryParams | Record<string, string | number | boolean | undefined>
  ) => {
    const cleanParams: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          cleanParams[key] = String(val);
        }
      });
    }
    return get<PageResponse<ReviewDTO>>(`/reviews/phone/${phoneId}`, {
      params: cleanParams,
    });
  },

  /**
   * Lấy dữ liệu thống kê đánh giá (điểm trung bình, phân bố sao)
   */
  summary: (phoneId: number) => {
    return get<ReviewSummary>(`/reviews/phone/${phoneId}/summary`);
  },

  /**
   * Tạo đánh giá mới (yêu cầu đã đăng nhập và đã nhận đơn hàng)
   */
  create: (data: ReviewRequest | { orderDetailId: number; rating: number; content: string; images?: string[]; phoneId?: number }) => {
    return post<ReviewDTO>('/reviews', data);
  },

  /**
   * Cập nhật đánh giá
   */
  update: (id: number, data: { rating: number; content: string }) => {
    return put<ReviewDTO>(`/reviews/${id}`, data);
  },

  /**
   * Xóa đánh giá
   */
  remove: (id: number) => {
    return del<void>(`/reviews/${id}`);
  },

  /**
   * Lấy danh sách đánh giá của tôi
   */
  myReviews: (params?: Record<string, string | number>) => {
    return get<PageResponse<ReviewDTO>>('/reviews/me', { params });
  },

  /**
   * Lấy danh sách đơn hàng đủ điều kiện đánh giá
   */
  eligible: (params?: Record<string, string | number>) => {
    return get<PageResponse<OrderDTO>>('/reviews/eligible', { params });
  },
};

