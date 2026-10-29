import { Tag } from 'antd';

/* Hallmark · status tag map — semantic colors, pill shape. */

const COLOR: Record<string, string> = {
  // orders
  PENDING: 'orange', CONFIRMED: 'blue', PROCESSING: 'geekblue', SHIPPING: 'cyan',
  DELIVERED: 'green', CANCELLED: 'red',
  // payments
  UNPAID: 'orange', PAID: 'green', REFUNDED: 'purple',
  // users / entities
  ACTIVE: 'green', LOCKED: 'red', INACTIVE: 'default',
  // reviews
  SHOW: 'green', HIDDEN: 'default',
};

const LABEL: Record<string, string> = {
  PENDING: 'Chờ xử lý', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy',
  UNPAID: 'Chưa thanh toán', PAID: 'Đã thanh toán', REFUNDED: 'Đã hoàn tiền',
  ACTIVE: 'Hoạt động', LOCKED: 'Khóa',
  SHOW: 'Hiển thị', HIDDEN: 'Ẩn',
};

export default function StatusTag({ status }: { status: string }) {
  return (
    <Tag color={COLOR[status] || 'default'} className="!rounded-full !border-0 !px-2.5 !py-0.5 !text-xs !font-medium">
      {LABEL[status] || status}
    </Tag>
  );
}
