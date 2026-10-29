import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Select, Input, message, type TableColumnsType } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { adminOrderService } from '@/services';
import type { OrderDTO } from '@/types/api';
import { formatVND, formatDate } from '@/utils';
import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import StatusTag from '@/components/admin/StatusTag';

/* Hallmark · Workbench (design.md): page header + table card, status pill tags, accent ≤ 5%. */

const statusOpts = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
const paymentStatusOpts = ['UNPAID', 'PAID', 'REFUNDED'];

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const params: Record<string, string> = { page: String(page - 1), size: '15' };
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => adminOrderService.list(params),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminOrderService.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); message.success('Cập nhật trạng thái'); },
  });

  const paymentMut = useMutation({
    mutationFn: ({ id, paymentStatus }: { id: number; paymentStatus: string }) => adminOrderService.updatePaymentStatus(id, paymentStatus),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); message.success('Cập nhật thanh toán'); },
  });

  const columns: TableColumnsType<OrderDTO> = [
    { title: 'Đơn', dataIndex: 'id', width: 70, render: (v: number) => <span className="font-semibold text-ink">#{v}</span> },
    { title: 'Khách', dataIndex: 'userName', width: 130, render: (v: string) => <span className="font-medium text-ink">{v}</span> },
    { title: 'Ngày', dataIndex: 'createdAt', render: (v: string) => formatDate(v), width: 110 },
    { title: 'Tổng', dataIndex: 'finalAmount', render: (v: number) => <span className="font-semibold text-ink">{formatVND(v)}</span>, width: 130, align: 'right' as const },
    {
      title: 'Thanh toán', dataIndex: 'paymentStatus', width: 160,
      render: (s: string, r) => (
        <div className="flex items-center gap-2">
          <StatusTag status={s} />
          <Select size="small" value={s} style={{ width: 95 }} onChange={(v) => paymentMut.mutate({ id: r.id, paymentStatus: v })} options={paymentStatusOpts.map(o => ({ value: o, label: o }))} />
        </div>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'orderStatus', width: 180,
      render: (s: string, r) => (
        <div className="flex items-center gap-2">
          <StatusTag status={s} />
          <Select size="small" value={s} style={{ width: 110 }} onChange={(v) => statusMut.mutate({ id: r.id, status: v })} options={statusOpts.map(o => ({ value: o, label: o }))} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Đơn hàng"
        subtitle="Theo dõi và cập nhật trạng thái đơn hàng"
        actions={<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><ShoppingCartOutlined /></div>}
      />
      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input.Search
            placeholder="Tìm đơn theo tên / SĐT / mã..."
            allowClear
            onSearch={(v) => { setSearch(v.trim()); setPage(1); }}
            className="!w-64"
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            className="!w-36"
            options={statusOpts.map((s) => ({ value: s, label: s }))}
          />
        </div>
        <Table<OrderDTO>
          columns={columns}
          dataSource={data?.content || []}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={{
            current: page,
            pageSize: 15,
            total: data?.totalElements || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
          className="[&_.ant-table-thead>tr>th]:!bg-bg-soft [&_.ant-table-thead>tr>th]:!text-xs [&_.ant-table-thead>tr>th]:!uppercase [&_.ant-table-thead>tr>th]:!tracking-wide [&_.ant-table-thead>tr>th]:!text-ink-2 [&_.ant-table-thead>tr>th]:!font-semibold"
        />
      </AdminCard>
    </div>
  );
}
