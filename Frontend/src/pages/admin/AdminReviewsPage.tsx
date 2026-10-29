import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Select, Button, message, type TableColumnsType, Rate } from 'antd';
import { DeleteOutlined, StarOutlined } from '@ant-design/icons';
import { adminReviewService } from '@/services';
import type { ReviewDTO } from '@/types/api';
import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import StatusTag from '@/components/admin/StatusTag';

/* Hallmark · Workbench (design.md): page header, table card, star rating + pill status. */

export default function AdminReviewsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [ratingFilter, setRatingFilter] = useState<number | undefined>();
  const params: Record<string, string> = { page: String(page - 1), size: '15' };
  if (statusFilter) params.status = statusFilter;
  if (ratingFilter) params.rating = String(ratingFilter);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', params],
    queryFn: () => adminReviewService.list(params),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminReviewService.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-reviews'] }); message.success('Cập nhật trạng thái'); },
  });
  const delMut = useMutation({ mutationFn: (id: number) => adminReviewService.remove(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-reviews'] }); message.success('Đã xóa'); } });

  const columns: TableColumnsType<ReviewDTO> = [
    { title: 'STT', width: 60, render: (_: unknown, __: ReviewDTO, index?: number) => <span className="text-ink-2">{(index ?? 0) + 1}</span> },
    { title: 'Người dùng', dataIndex: 'userName', width: 130, render: (v: string) => <span className="font-medium text-ink">{v}</span> },
    { title: 'Nội dung', dataIndex: 'content', ellipsis: true, render: (v: string) => <span className="text-ink-2">{v}</span> },
    { title: 'Đánh giá', dataIndex: 'rating', width: 120, render: (v: number) => <Rate disabled value={v} className="!text-sm" /> },
    { title: 'Trạng thái', dataIndex: 'status', width: 170, render: (s: string, r) => (
      <div className="flex items-center gap-2">
        <StatusTag status={s} />
        <Select size="small" value={s} style={{ width: 90 }} onChange={(v) => statusMut.mutate({ id: r.id, status: v })} options={['SHOW', 'HIDDEN'].map(o => ({ value: o, label: o === 'SHOW' ? 'SHOW' : 'HIDDEN' }))} />
      </div>
    ) },
    { title: '', width: 60, render: (_, r) => <Button size="small" danger icon={<DeleteOutlined />} onClick={() => delMut.mutate(r.id)} className="!rounded-full" /> },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Đánh giá"
        subtitle="Duyệt và quản lý đánh giá sản phẩm"
        actions={<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><StarOutlined /></div>}
      />
      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select
            placeholder="Trạng thái"
            allowClear
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            className="!w-36"
            options={[
              { value: 'SHOW', label: 'Hiển thị' },
              { value: 'HIDDEN', label: 'Ẩn' },
            ]}
          />
          <Select
            placeholder="Số sao"
            allowClear
            value={ratingFilter}
            onChange={(v) => { setRatingFilter(v); setPage(1); }}
            className="!w-32"
            options={[5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} ★` }))}
          />
        </div>
        <Table<ReviewDTO>
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
        />
      </AdminCard>
    </div>
  );
}
