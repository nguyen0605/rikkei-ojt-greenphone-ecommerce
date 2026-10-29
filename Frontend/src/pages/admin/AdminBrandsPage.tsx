import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Switch, type TableColumnsType } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TagOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { adminBrandService } from '@/services';
import type { BrandDTO, BrandRequest } from '@/types/api';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';

/* Hallmark · Workbench (design.md): page header + pill CTA, table card, modal form. */

export default function AdminBrandsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const params: Record<string, string> = { page: String(page - 1), size: '15' };
  if (keyword) params.keyword = keyword;
  const { data, isLoading } = useQuery({
    queryKey: ['admin-brands', params],
    queryFn: () => adminBrandService.list(params),
  });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<BrandDTO | null>(null);
  const [form] = Form.useForm<BrandRequest>();

  const mut = useMutation({
    mutationFn: (v: BrandRequest) => edit ? adminBrandService.update(edit.id, v) : adminBrandService.create(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-brands'] }); setOpen(false); setEdit(null); form.resetFields(); message.success(edit ? 'Cập nhật' : 'Tạo'); },
  });

  const delMut = useMutation({
    mutationFn: (id: number) => adminBrandService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-brands'] }); message.success('Đã xóa vĩnh viễn'); },
    onError: (e) => message.error(e instanceof Error ? e.message : 'Không thể xóa'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminBrandService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-brands'] });
      qc.invalidateQueries({ queryKey: ['brands'] });
      message.success('Đã cập nhật trạng thái');
    },
    onError: (e) => message.error(e instanceof Error ? e.message : 'Cập nhật thất bại'),
  });

  const openForm = (b?: BrandDTO) => { setEdit(b || null); form.setFieldsValue(b ? { name: b.name, logoUrl: b.logoUrl } : {}); setOpen(true); };

  const columns: TableColumnsType<BrandDTO> = [
    { title: 'STT', width: 60, render: (_: unknown, __: BrandDTO, index?: number) => <span className="text-ink-2">{(index ?? 0) + 1}</span> },
    {
      title: 'Hãng', dataIndex: 'name', render: (v: string, r) => (
        <div className="flex items-center gap-2.5">
          {r.logoUrl ? (
            <img src={r.logoUrl} alt={v} className="h-8 w-8 rounded-lg border border-rule bg-white object-contain p-0.5" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><TagOutlined /></div>
          )}
          <span className="font-medium text-ink">{v}</span>
        </div>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 90,
      render: (s: string, r) => (
        <Switch
          checked={s === 'ACTIVE'}
          loading={statusMut.isPending}
          onChange={(checked) => statusMut.mutate({ id: r.id, status: checked ? 'ACTIVE' : 'INACTIVE' })}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      ),
    },
    {
      title: '', width: 110,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openForm(r)} className="!rounded-full" />
          <Popconfirm
            title="Xóa vĩnh viễn hãng này?"
            description="Sẽ xóa luôn khỏi hệ thống, không thể khôi phục. Hãng đang có sản phẩm sẽ bị chặn."
            okText="Xóa"
            okButtonProps={{ danger: true }}
            onConfirm={() => delMut.mutate(r.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} className="!rounded-full" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Hãng"
        subtitle="Quản lý thương hiệu điện thoại"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()} className="!rounded-full !bg-primary-600 hover:!bg-primary-700">
            Thêm hãng
          </Button>
        }
      />
      <AdminCard>
        <div className="mb-4">
          <Input.Search
            placeholder="Tìm hãng..."
            allowClear
            onSearch={(v) => { setKeyword(v.trim()); setPage(1); }}
            className="!w-56"
          />
        </div>
        <Table<BrandDTO>
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
        title={<span className="text-base font-bold text-ink">{edit ? 'Sửa hãng' : 'Thêm hãng'}</span>}
        open={open}
        onCancel={() => { setOpen(false); setEdit(null); }}
        onOk={() => form.submit()}
        confirmLoading={mut.isPending}
        okButtonProps={{ className: '!rounded-full !bg-primary-600 hover:!bg-primary-700' }}
        cancelButtonProps={{ className: '!rounded-full' }}
      >
        <Form form={form} layout="vertical" onFinish={(v) => mut.mutate(v)}>
          <Form.Item name="name" label="Tên hãng" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="logoUrl" label="Logo URL"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
