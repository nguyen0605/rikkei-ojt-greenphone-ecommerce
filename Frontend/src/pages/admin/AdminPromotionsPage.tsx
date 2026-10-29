import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Space, type TableColumnsType } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, GiftOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { adminPromotionService } from '@/services';
import type { PromotionDTO, PromotionRequest } from '@/types/api';
import { formatNumber } from '@/utils';
import dayjs from 'dayjs';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import StatusTag from '@/components/admin/StatusTag';

/* Hallmark · Workbench (design.md): page header + pill CTA, table card, modal form. */

type DiscountType = 'PERCENT' | 'FIXED';

export default function AdminPromotionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const params: Record<string, string> = { page: String(page - 1), size: '15' };
  if (keyword) params.keyword = keyword;
  if (statusFilter) params.status = statusFilter;
  const { data, isLoading } = useQuery({
    queryKey: ['admin-promos', params],
    queryFn: () => adminPromotionService.list(params),
  });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<PromotionDTO | null>(null);
  const [form] = Form.useForm();
  const discountType = Form.useWatch('discountType', form) as DiscountType | undefined;

  const mut = useMutation({
    mutationFn: (v: PromotionRequest) => edit ? adminPromotionService.update(edit.id, v) : adminPromotionService.create(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-promos'] }); setOpen(false); setEdit(null); form.resetFields(); message.success(edit ? 'Cập nhật' : 'Tạo'); },
  });
  const delMut = useMutation({ mutationFn: (id: number) => adminPromotionService.remove(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-promos'] }); message.success('Đã xóa'); } });

  const openForm = (p?: PromotionDTO) => {
    form.resetFields(); // clear previous edit values first (setFieldsValue({}) doesn't)
    if (p) form.setFieldsValue({ ...p, startDate: dayjs(p.startDate), endDate: dayjs(p.endDate) });
    setEdit(p || null);
    setOpen(true);
  };

  // Keep form values numeric — the thousand-separator display is only visual.
  const parseNumber = (s: string | undefined) => Number((s ?? '').replace(/[^\d]/g, ''));

  const columns: TableColumnsType<PromotionDTO> = [
    { title: 'Mã', dataIndex: 'code', width: 120, render: (v: string) => <span className="rounded bg-primary-50 px-2 py-0.5 font-mono text-xs font-semibold text-primary-700">{v}</span> },
    { title: 'Tên', dataIndex: 'name', render: (v: string) => <span className="font-medium text-ink">{v}</span> },
    { title: 'Loại', dataIndex: 'discountType', width: 200, render: (v: string) => <span className="rounded-full bg-bg-muted px-2.5 py-0.5 text-xs font-medium text-ink-2">{v === 'PERCENT' ? 'Phần trăm' : 'Cố định'}</span> },
    { title: 'Giá trị', dataIndex: 'discountValue', width: 110, render: (v: number, r) => <span className="font-semibold text-ink">{r.discountType === 'PERCENT' ? `${v}%` : formatNumber(v)}</span> },
    { title: 'TT', dataIndex: 'status', width: 100, render: (s: string) => <StatusTag status={s} /> },
    { title: '', width: 110, render: (_, r) => <Space><Button size="small" icon={<EditOutlined />} onClick={() => openForm(r)} className="!rounded-full" /><Button size="small" danger icon={<DeleteOutlined />} onClick={() => delMut.mutate(r.id)} className="!rounded-full" /></Space> },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Khuyến mãi"
        subtitle="Tạo mã giảm giá cho khách hàng"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()} className="!rounded-full !bg-primary-600 hover:!bg-primary-700">
            Thêm khuyến mãi
          </Button>
        }
      />
      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input.Search
            placeholder="Tìm mã / tên..."
            allowClear
            onSearch={(v) => { setKeyword(v.trim()); setPage(1); }}
            className="!w-56"
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            className="!w-36"
            options={[
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'INACTIVE', label: 'INACTIVE' },
            ]}
          />
        </div>
        <Table<PromotionDTO>
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
        title={<span className="text-base font-bold text-ink">{edit ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}</span>}
        open={open}
        onCancel={() => { setOpen(false); setEdit(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={mut.isPending}
        okButtonProps={{ className: '!rounded-full !bg-primary-600 hover:!bg-primary-700' }}
        cancelButtonProps={{ className: '!rounded-full' }}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={(v) => mut.mutate({ ...v, startDate: v.startDate.toISOString(), endDate: v.endDate.toISOString() })}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Thông tin cơ bản</div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="code" label="Mã" rules={[{ required: true, message: 'Nhập mã' }]}><Input placeholder="VD: GIAM10" /></Form.Item>
            <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}><Input placeholder="VD: Giảm 10% toàn sản phẩm" /></Form.Item>
            <Form.Item name="discountType" label="Loại khuyến mãi" rules={[{ required: true, message: 'Chọn loại' }]}>
              <Select options={[
                { value: 'PERCENT', label: 'Phần trăm (%)' },
                { value: 'FIXED', label: 'Cố định (VND)' },
              ]} />
            </Form.Item>
            <Form.Item name="discountValue" label={discountType === 'PERCENT' ? 'Giá trị giảm (%)' : 'Giá trị giảm (VND)'} rules={[{ required: true, message: 'Nhập giá trị' }]}>
              {discountType === 'PERCENT' ? (
                <InputNumber className="w-full" min={0} max={99} placeholder="VD: 10"
                  formatter={(v) => `${String(v ?? '').replace(/[^\d]/g, '')}%`}
                  parser={parseNumber}
                />
              ) : (
                <InputNumber className="w-full" min={0} placeholder="VD: 100,000"
                  formatter={(v) => formatNumber(Number(v ?? 0))}
                  parser={parseNumber}
                />
              )}
            </Form.Item>
            {discountType === 'PERCENT' && (
              <Form.Item name="maxDiscountAmount" label="Giảm tối đa (VND)" className="col-span-2">
                <InputNumber className="w-full" min={0} placeholder="VD: 200,000"
                  formatter={(v) => formatNumber(Number(v ?? 0))}
                  parser={parseNumber}
                />
              </Form.Item>
            )}
          </div>

          <div className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-ink-2">Điều kiện & thời gian</div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="minOrderValue" label="Đơn tối thiểu (VND)">
              <InputNumber className="w-full" min={0} placeholder="VD: 500,000"
                formatter={(v) => formatNumber(Number(v ?? 0))}
                parser={parseNumber}
              />
            </Form.Item>
            <Form.Item name="quantity" label="Số lượng mã">
              <InputNumber className="w-full" min={0} placeholder="VD: 100" />
            </Form.Item>
            <Form.Item name="startDate" label="Bắt đầu" rules={[{ required: true, message: 'Chọn ngày' }]}><DatePicker showTime className="w-full" /></Form.Item>
            <Form.Item name="endDate" label="Kết thúc" rules={[{ required: true, message: 'Chọn ngày' }]}><DatePicker showTime className="w-full" /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
