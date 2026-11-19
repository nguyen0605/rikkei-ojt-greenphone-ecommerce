import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Select, Button, message, type TableColumnsType, Rate, Image, Tooltip } from 'antd';
import { DeleteOutlined, PictureOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminReviewService } from '@/services';
import type { ReviewDTO } from '@/types/api';
import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';

/* Hallmark · Workbench (design.md): page header, table card, star rating + pill status. */

export default function AdminReviewsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [ratingFilter, setRatingFilter] = useState<number | undefined>();
  const params: Record<string, string> = { page: String(page - 1), size: '15' };
  if (statusFilter) params.status = statusFilter;
  if (ratingFilter) params.rating = String(ratingFilter);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-reviews', params],
    queryFn: () => adminReviewService.list(params),
  });

  // Làm mới danh sách đánh giá của trang hiện tại
  const handleRefresh = async () => {
    await refetch();
    message.success('Đã làm mới danh sách đánh giá');
  };

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminReviewService.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-reviews'] }); message.success('Cập nhật trạng thái'); },
  });
  const delMut = useMutation({ mutationFn: (id: number) => adminReviewService.remove(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-reviews'] }); message.success('Đã xóa'); } });

  const columns: TableColumnsType<ReviewDTO> = [
    { title: 'STT', width: 60, render: (_: unknown, __: ReviewDTO, index?: number) => <span className="text-ink-2">{(index ?? 0) + 1}</span> },
    { title: 'Người dùng', dataIndex: 'userName', width: 140, render: (v: string, r) => (
      <div>
        <span className="font-medium text-ink block">{v}</span>
        {r.phoneName && <span className="text-xs text-gray-400 block truncate max-w-[130px]" title={r.phoneName}>{r.phoneName}</span>}
      </div>
    ) },
    { title: 'Đánh giá', dataIndex: 'rating', width: 130, render: (v: number) => <Rate disabled value={v} className="!text-sm" /> },
    { title: 'Nội dung', dataIndex: 'content', ellipsis: true, render: (v: string) => <span className="text-ink-2">{v}</span> },
    // Cột xem trước hình ảnh đánh giá người dùng tải lên kèm tính năng phóng to
    {
      title: 'Ảnh đính kèm',
      width: 160,
      render: (_: unknown, r: ReviewDTO) => {
        const images = Array.isArray(r.images) ? r.images.filter(Boolean) : [];
        if (images.length === 0) {
          return <span className="text-xs text-gray-400 italic">Không có ảnh</span>;
        }
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Image.PreviewGroup>
              {images.map((imgUrl, idx) => (
                <div key={idx} className="relative group overflow-hidden rounded-md border border-gray-200">
                  <Image
                    src={imgUrl}
                    alt={`Ảnh ${idx + 1}`}
                    width={38}
                    height={38}
                    className="!object-cover rounded-md"
                  />
                </div>
              ))}
            </Image.PreviewGroup>
            <Tooltip title={`Có ${images.length} ảnh đính kèm, bấm vào để phóng to`}>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full">
                <PictureOutlined /> {images.length}
              </span>
            </Tooltip>
          </div>
        );
      },
    },
    { title: 'Trạng thái', dataIndex: 'status', width: 130, render: (s: string, r) => {
      const normalizedStatus = s === 'APPROVED' ? 'SHOW' : s;
      return (
        <Select
          size="small"
          value={normalizedStatus}
          style={{ width: 110 }}
          onChange={(v) => statusMut.mutate({ id: r.id, status: v })}
          options={[
            { value: 'SHOW', label: 'Hiển thị' },
            { value: 'HIDDEN', label: 'Ẩn' },
          ]}
        />
      );
    } },
    { title: 'Thao tác', width: 80, align: 'center', render: (_, r) => (
      <Button
        size="small"
        danger
        icon={<DeleteOutlined />}
        onClick={() => delMut.mutate(r.id)}
        className="!rounded-full hover:!bg-red-50"
        title="Xóa đánh giá"
      />
    ) },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Đánh giá"
        subtitle="Duyệt và quản lý đánh giá sản phẩm"
        onRefresh={handleRefresh}
      />
      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
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
          <Button
            type="text"
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={handleRefresh}
            className="text-gray-500 hover:text-primary-600 text-xs"
          >
            Tải lại bảng
          </Button>
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
