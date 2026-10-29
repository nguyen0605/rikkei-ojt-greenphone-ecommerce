import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Table, Tag, type TableColumnsType } from 'antd';
import { ShoppingBag, Clock } from 'lucide-react';
import { orderService } from '@/services';
import type { OrderDTO } from '@/types/api';
import { formatVND, formatDate } from '@/utils';

const statusColor: Record<string, string> = {
  PENDING: 'default', CONFIRMED: 'blue', PROCESSING: 'processing',
  SHIPPING: 'orange', DELIVERED: 'green', CANCELLED: 'red',
};

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã huỷ',
};

export default function AccountOrdersPage() {
  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: () => orderService.list() });
  const orders = data?.content || [];

  const columns: TableColumnsType<OrderDTO> = [
    {
      title: 'Mã ĐH', dataIndex: 'id', key: 'id', width: 80,
      render: (id: number) => <span className="font-mono font-semibold text-gray-900">#{id}</span>,
    },
    {
      title: 'Ngày đặt', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => <span className="text-gray-500">{formatDate(v)}</span>, width: 120,
    },
    {
      title: 'Sản phẩm', key: 'items',
      render: (_, r) => (
        <span className="line-clamp-1 text-sm">{r.orderDetails?.map(d => d.productName).join(', ') || ''}</span>
      ),
    },
    {
      title: 'Tổng tiền', dataIndex: 'finalAmount', key: 'finalAmount',
      render: (v: number) => <span className="font-semibold text-red-600">{formatVND(v)}</span>, width: 140,
    },
    {
      title: 'Trạng thái', dataIndex: 'orderStatus', key: 'orderStatus', width: 130,
      render: (s: string) => (
        <Tag color={statusColor[s] || 'default'} className="!rounded-full !px-2 !py-0.5 !text-xs !font-medium">
          {statusLabel[s] || s}
        </Tag>
      ),
    },
    {
      title: '', key: 'action', width: 80,
      render: (_, r) => (
        <Link to={'/tai-khoan/don-hang/' + r.id} className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline">
          Chi tiết
        </Link>
      ),
    },
  ];

  if (orders.length === 0 && !isLoading) {
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900">Đơn hàng của tôi</h2>
        <div className="mt-8 flex flex-col items-center py-12 text-center">
          <ShoppingBag className="mb-4 h-16 w-16 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-700">Chưa có đơn hàng nào</h3>
          <p className="mt-1 text-sm text-gray-500">Hãy mua sắm ngay để nhận nhiều ưu đãi!</p>
          <Link to="/san-pham" className="mt-4 inline-block rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
            Mua sắm ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Đơn hàng của tôi</h2>
          <p className="mt-1 text-sm text-gray-500">{orders.length} đơn hàng</p>
        </div>
      </div>
      <Table<OrderDTO>
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        className="[&_.ant-table]:!rounded-2xl [&_.ant-table]:!border [&_.ant-table]:!border-gray-100"
      />
    </div>
  );
}
