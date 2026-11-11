import { Tag } from 'antd';

/* Hallmark · status tag map — semantic colors, pill shape. */

const COLOR: Record<string, string> = {
  // orders
  PENDING: 'orange',
  CONFIRMED: 'blue',
  PROCESSING: 'geekblue',
  SHIPPING: 'cyan',
  DELIVERED: 'green',
  CANCELLED: 'red',
  // payments
  UNPAID: 'orange',
  PAID: 'green',
  REFUND_PENDING: 'volcano',
  REFUNDED: 'purple',
  // users / entities
  ACTIVE: 'green',
  LOCKED: 'red',
  BLOCKED: 'red',
  INACTIVE: 'default',
  // roles
  ROLE_ADMIN: 'purple',
  ROLE_SALES: 'blue',
  ROLE_WAREHOUSE: 'cyan',
  ROLE_MARKETING: 'orange',
  ROLE_CUSTOMER: 'default',
  // reviews
  SHOW: 'green',
  HIDDEN: 'default',
};

const LABEL: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  REFUND_PENDING: 'Chờ hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
  ACTIVE: 'Hoạt động',
  LOCKED: 'Khóa',
  BLOCKED: 'Bị khóa',
  INACTIVE: 'Ngừng hoạt động',
  // roles
  ROLE_ADMIN: 'Quản trị viên',
  ROLE_SALES: 'Kinh doanh',
  ROLE_WAREHOUSE: 'Thủ kho',
  ROLE_MARKETING: 'Marketing',
  ROLE_CUSTOMER: 'Khách hàng',
  SHOW: 'Hiển thị',
  HIDDEN: 'Ẩn',
};

interface StatusTagProps {
  status: string;
  className?: string;
}

export default function StatusTag({ status, className }: StatusTagProps) {
  return (
    <Tag
      color={COLOR[status] || 'default'}
      className={`!rounded-full !border-0 !px-2.5 !py-0.5 !text-xs !font-medium text-center inline-flex items-center justify-center ${
        className || ''
      }`}
    >
      {LABEL[status] || status}
    </Tag>
  );
}
