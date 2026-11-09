import React from 'react';
import {
  Package,
  Clock,
  RotateCw,
  Truck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export type OrderTabKey = 'all' | 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled';

export interface StatusTabConfig {
  key: OrderTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STATUS_TABS: StatusTabConfig[] = [
  { key: 'all', label: 'Tất cả', icon: Package },
  { key: 'pending', label: 'Chờ thanh toán', icon: Clock },
  { key: 'processing', label: 'Đang xử lý', icon: RotateCw },
  { key: 'shipping', label: 'Đang giao hàng', icon: Truck },
  { key: 'delivered', label: 'Đã giao', icon: CheckCircle2 },
  { key: 'cancelled', label: 'Đã hủy', icon: XCircle },
];

/**
 * Trả về cấu hình hiển thị Badge trạng thái đơn hàng
 */
export function getStatusBadgeConfig(status: string, paymentStatus?: string) {
  switch (status) {
    case 'PENDING':
      if (paymentStatus === 'UNPAID') {
        return {
          label: 'Chờ thanh toán',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          dotColor: 'bg-amber-500',
        };
      }
      return {
        label: 'Chờ xác nhận',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        dotColor: 'bg-amber-500',
      };
    case 'CONFIRMED':
      return {
        label: 'Đã xác nhận',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500',
      };
    case 'PROCESSING':
      return {
        label: 'Đang xử lý',
        className: 'bg-sky-50 text-sky-700 border-sky-200',
        dotColor: 'bg-sky-500',
      };
    case 'SHIPPING':
      return {
        label: 'Đang giao hàng',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dotColor: 'bg-indigo-500',
      };
    case 'DELIVERED':
      return {
        label: 'Đã giao hàng',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
      };
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
        dotColor: 'bg-rose-500',
      };
    default:
      return {
        label: status,
        className: 'bg-gray-50 text-gray-700 border-gray-200',
        dotColor: 'bg-gray-400',
      };
  }
}

/**
 * Hiển thị tên phương thức thanh toán thân thiện
 */
export function formatPaymentMethod(method: string): string {
  switch (method) {
    case 'VIETQR':
    case 'SEPAY':
      return 'Chuyển khoản VietQR';
    case 'COD':
      return 'Thanh toán khi nhận hàng (COD)';
    default:
      return method;
  }
}

/**
 * Xác định vị trí bước hiện tại trong quy trình 4 bước (1 -> 4).
 * Trả về:
 * - 1: PENDING (Đang chờ xác nhận)
 * - 2: CONFIRMED hoặc PROCESSING (Đã duyệt / đang đóng gói)
 * - 3: SHIPPING (Đang vận chuyển)
 * - 4: DELIVERED (Đã giao hàng thành công)
 * - 0: CANCELLED (Đã hủy)
 */
export function getTimelineStep(status: string): number {
  switch (status) {
    case 'PENDING':
      return 1;
    case 'CONFIRMED':
    case 'PROCESSING':
      return 2;
    case 'SHIPPING':
      return 3;
    case 'DELIVERED':
      return 4;
    case 'CANCELLED':
      return 0;
    default:
      return 1;
  }
}

