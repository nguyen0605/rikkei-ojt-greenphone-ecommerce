import { get, post, put } from './api';
import type { PageResponse, OrderDTO, OrderRequest } from '@/types/api';

/**
 * Service API quản lý đơn hàng phía khách hàng
 */
export const orderService = {
  /**
   * Lấy danh sách đơn hàng của người dùng hiện tại (có phân trang)
   */
  list: (params?: Record<string, string | number | boolean>) => {
    return get<PageResponse<OrderDTO>>('/orders', { params });
  },

  /**
   * Lấy chi tiết đơn hàng theo mã ID
   */
  detail: (id: number) => {
    return get<OrderDTO>(`/orders/${id}`);
  },

  /**
   * Khách hàng yêu cầu hủy đơn hàng (áp dụng cho đơn PENDING/CONFIRMED)
   */
  cancel: (id: number, reason?: string) => {
    return reason
      ? put<OrderDTO>(`/orders/${id}/cancel`, { reason })
      : put<OrderDTO>(`/orders/${id}/cancel`);
  },

  /**
   * Tạo đơn hàng mới từ giỏ hàng
   */
  create: (data: OrderRequest) => {
    return post<OrderDTO>('/orders', data);
  },

  /**
   * Lấy lịch sử các đơn hàng đã hoàn tất (DELIVERED)
   */
  history: (params?: Record<string, string | number | boolean>) => {
    return get<PageResponse<OrderDTO>>('/orders/history', { params });
  },

  /**
   * Áp dụng mã khuyến mãi cho đơn hàng chờ xử lý
   */
  applyPromotion: (id: number, userPromotionId: number) => {
    return put<OrderDTO>(`/orders/${id}/promotion`, { userPromotionId });
  },
};

export default orderService;

