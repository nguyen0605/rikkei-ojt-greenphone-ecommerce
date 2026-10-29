import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, message, Space, type TableColumnsType } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { adminBannerService } from '@/services';
import type { BannerDTO, BannerRequest } from '@/types/api';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import StatusTag from '@/components/admin/StatusTag';

/* Hallmark · Workbench (design.md): page header + pill CTA, table card, modal form. */

export default function AdminBannersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const params: Record<string, string> = { page: String(page - 1), size: '15' };
  if (keyword) params.title = keyword;
  const { data, isLoading } = useQuery({
    queryKey: ['admin-banners', params],
    queryFn: () => adminBannerService.list(params),
  });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<BannerDTO | null>(null);
  const [form] = Form.useForm<BannerRequest>();

  const mut = useMutation({
    mutationFn: (v: BannerRequest) => edit ? adminBannerService.update(edit.id, v) : adminBannerService.create(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-banners'] }); setOpen(false); setEdit(null); form.resetFields(); message.success(edit ? 'Cập nhật' : 'Tạo'); },
  });
  const delMut = useMutation({ mutationFn: (id: number) => adminBannerService.remove(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-banners'] }); message.success('Đã xóa'); } });

  const openForm = (b?: BannerDTO) => { setEdit(b || null); form.setFieldsValue(b ? { title: b.title, imageUrl: b.imageUrl, linkUrl: b.linkUrl } : {}); setOpen(true); };

  const columns: TableColumnsType<BannerDTO> = [
    { title: 'STT', width: 60, render: (_: unknown, __: BannerDTO, index?: number) => <span className="text-ink-2">{(index ?? 0) + 1}</span> },
    { title: 'Ảnh', dataIndex: 'imageUrl', render: (v: string) => v ? <img src={v} alt="" className="h-12 w-28 rounded-lg border border-rule object-cover" /> : null, width: 140 },
    { title: 'Tiêu đề', dataIndex: 'title', render: (v: string) => <span className="font-medium text-ink">{v}</span> },
    { title: 'Link', dataIndex: 'linkUrl', ellipsis: true, render: (v: string) => <span className="text-ink-2">{v}</span> },
    { title: 'TT', dataIndex: 'status', width: 100, render: (s: string) => <StatusTag status={s} /> },
    { title: '', width: 110, render: (_, r) => <Space><Button size="small" icon={<EditOutlined />} onClick={() => openForm(r)} className="!rounded-full" /><Button size="small" danger icon={<DeleteOutlined />} onClick={() => delMut.mutate(r.id)} className="!rounded-full" /></Space> },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Banner"
        subtitle="Quản lý banner hiển thị trang chủ"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()} className="!rounded-full !bg-primary-600 hover:!bg-primary-700">
            Thêm banner
          </Button>
        }
      />
      <AdminCard>
        <div className="mb-4">
          <Input.Search
            placeholder="Tìm banner theo tiêu đề..."
            allowClear
            onSearch={(v) => { setKeyword(v.trim()); setPage(1); }}
            className="!w-56"
          />
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
      <Modal
        title={<span className="text-base font-bold text-ink">{edit ? 'Sửa banner' : 'Thêm banner'}</span>}
        open={open}
        onCancel={() => { setOpen(false); setEdit(null); }}
        onOk={() => form.submit()}
        confirmLoading={mut.isPending}
        okButtonProps={{ className: '!rounded-full !bg-primary-600 hover:!bg-primary-700' }}
        cancelButtonProps={{ className: '!rounded-full' }}
      >
        <Form form={form} layout="vertical" onFinish={(v) => mut.mutate(v)}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="imageUrl" label="URL ảnh" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="linkUrl" label="Link"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
