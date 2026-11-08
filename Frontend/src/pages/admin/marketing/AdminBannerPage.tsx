import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Input, message, Space, Switch, type TableColumnsType } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';
import adminMarketingService from '@/services/adminMarketingService';
import type { BannerDTO, BannerRequest } from '@/types/api';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import StatusTag from '@/components/admin/StatusTag';
import BannerFormModal from '@/components/admin/marketing/BannerFormModal';

export default function AdminBannerPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<BannerDTO | null>(null);

  const params: Record<string, string> = { page: String(page - 1), size: '15' };
  if (keyword) params.title = keyword;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-banners', params],
    queryFn: () => adminMarketingService.getBanners(params),
  });

  const mut = useMutation({
    mutationFn: (v: BannerRequest) =>
      edit
        ? adminMarketingService.updateBanner(edit.id, v)
        : adminMarketingService.createBanner(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      setOpen(false);
      setEdit(null);
      message.success(edit ? 'Cập nhật banner thành công' : 'Tạo banner mới thành công');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu banner');
    },
  });

  const toggleStatusMut = useMutation({
    mutationFn: ({ id, banner, checked }: { id: number; banner: BannerDTO; checked: boolean }) =>
      adminMarketingService.updateBanner(id, {
        title: banner.title,
        imageUrl: banner.imageUrl,
        linkUrl: banner.linkUrl,
        status: checked ? 'ACTIVE' : 'INACTIVE',
        sortOrder: banner.sortOrder ?? 0,
        position: banner.position || 'HERO',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      message.success('Đã cập nhật trạng thái banner');
    },
  });

  const delMut = useMutation({
    mutationFn: (id: number) => adminMarketingService.deleteBanner(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      message.success('Đã xóa banner');
    },
  });

  const openForm = (b?: BannerDTO) => {
    setEdit(b || null);
    setOpen(true);
  };

  const columns: TableColumnsType<BannerDTO> = [
    {
      title: 'STT',
      width: 60,
      render: (_: unknown, __: BannerDTO, index?: number) => (
        <span className="text-ink-2">{(index ?? 0) + 1}</span>
      ),
    },
    {
      title: 'Ảnh Thumbnail',
      dataIndex: 'imageUrl',
      width: 140,
      render: (v: string) =>
        v ? (
          <img
            src={v}
            alt=""
            className="h-12 w-28 rounded-lg border border-rule object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-12 w-28 items-center justify-center rounded-lg border border-dashed border-rule text-ink-3">
            <PictureOutlined />
          </div>
        ),
    },
    {
      title: 'Tiêu đề Banner',
      dataIndex: 'title',
      render: (v: string) => <span className="font-medium text-ink">{v}</span>,
    },
    {
      title: 'Vị trí hiển thị',
      dataIndex: 'position',
      width: 170,
      render: (pos: string) => {
        const labels: Record<string, { label: string; color: string }> = {
          HERO: { label: 'Slider chính (Hero)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
          SUB_BANNER: { label: 'Banner phụ', color: 'bg-purple-50 text-purple-700 border-purple-200' },
          PROMOTION: { label: 'Khuyến mãi nổi bật', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        };
        const item = labels[pos || 'HERO'] || { label: pos || 'Hero', color: 'bg-gray-50 text-gray-700 border-gray-200' };
        return (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${item.color}`}>
            {item.label}
          </span>
        );
      },
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      width: 90,
      align: 'center',
      render: (val: number) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-bg-muted text-ink-2">
          {val ?? 0}
        </span>
      ),
    },
    {
      title: 'Liên kết điều hướng',
      dataIndex: 'linkUrl',
      ellipsis: true,
      render: (v: string) => <span className="text-ink-2 font-mono text-xs">{v}</span>,
    },
    {
      title: 'Bật/Tắt hiển thị',
      width: 140,
      render: (_, r) => (
        <Switch
          checked={r.status === 'ACTIVE'}
          loading={toggleStatusMut.isPending}
          onChange={(checked) =>
            toggleStatusMut.mutate({ id: r.id, banner: r, checked })
          }
          checkedChildren="BẬT"
          unCheckedChildren="TẮT"
        />
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: 'Thao tác',
      width: 110,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openForm(r)}
            className="!rounded-full hover:!text-primary-600"
            title="Sửa banner"
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => delMut.mutate(r.id)}
            className="!rounded-full"
            title="Xóa banner"
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Quản Lý Banner Quảng Cáo"
        subtitle="Quản lý banner trình chiếu trang chủ (Carousel / Hero) và liên kết điều hướng"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openForm()}
            className="!rounded-full !bg-primary-600 hover:!bg-primary-700"
          >
            Thêm banner mới
          </Button>
        }
      />

      <AdminCard>
        <div className="mb-4 flex items-center justify-between">
          <Input.Search
            placeholder="Tìm banner theo tiêu đề..."
            allowClear
            onSearch={(v) => {
              setKeyword(v.trim());
              setPage(1);
            }}
            className="!w-64"
          />
          <div className="text-xs text-ink-2 flex items-center gap-1">
            <InfoCircleOutlined className="text-primary-500" />
            <span>Tỷ lệ ảnh khuyến nghị chuẩn trang chủ: <strong>3:1</strong> (VD: 1200x400px)</span>
          </div>
        </div>

        <Table<BannerDTO>
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

      <BannerFormModal
        open={open}
        editData={edit}
        loading={mut.isPending}
        onCancel={() => {
          setOpen(false);
          setEdit(null);
        }}
        onSubmit={(values) => mut.mutate(values)}
      />
    </div>
  );
}

