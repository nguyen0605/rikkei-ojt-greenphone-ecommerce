import { get } from './api';
import type { ShipmentDTO } from '@/types/api';

/**
 * Service tra cứu và quản lý vận đơn
 */
export const shipmentService = {
  /**
   * Lấy danh sách vận đơn theo mã đơn hàng (User)
   */
  getByOrderId: (orderId: number) => {
    return get<ShipmentDTO[]>(`/shipments/order/${orderId}`);
  },

  /**
   * Tra cứu chi tiết hành trình vận đơn theo mã tracking number
   */
  trackByNumber: (trackingNumber: string) => {
    return get<ShipmentDTO>(`/shipments/track/${trackingNumber}`);
  },

  /**
   * Lấy danh sách vận đơn theo mã đơn hàng (Admin)
   */
  adminGetByOrderId: (orderId: number) => {
    return get<ShipmentDTO[]>(`/admin/shipments/order/${orderId}`);
  },
};

