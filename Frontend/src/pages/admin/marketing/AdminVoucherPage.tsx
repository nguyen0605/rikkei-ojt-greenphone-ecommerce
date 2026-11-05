import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Input,
  Select,
  message,
  Space,
  Progress,
  Popconfirm,
  type TableColumnsType,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import adminMarketingService from '@/services/adminMarketingService';
import type { PromotionDTO, PromotionRequest } from '@/types/api';
import { formatNumber } from '@/utils';
import dayjs from 'dayjs';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import StatusTag from '@/components/admin/StatusTag';
import VoucherFormModal from '@/components/admin/marketing/VoucherFormModal';

export default function AdminVoucherPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<PromotionDTO | null>(null);

  const params: Record<string, string> = { page: String(page - 1), size: '15' };
  if (keyword) params.keyword = keyword;
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-vouchers', params],
    queryFn: () => adminMarketingService.getVouchers(params),
  });

  const mut = useMutation({
    mutationFn: (v: PromotionRequest) =>
      edit
        ? adminMarketingService.updateVoucher(edit.id, v)
        : adminMarketingService.createVoucher(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
      setOpen(false);
      setEdit(null);
      message.success(edit ? 'Cập nhật voucher thành công' : 'Tạo mã voucher mới thành công');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu voucher');
    },
  });

  // Nút vô hiệu hóa khẩn cấp 1-click
  const emergencyDeactivateMut = useMutation({
    mutationFn: (voucher: PromotionDTO) => {
      const payload: PromotionRequest = {
        code: voucher.code,
        name: voucher.name,
        description: voucher.description || '',
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        maxDiscountAmount: voucher.maxDiscountAmount || 0,
        minOrderValue: voucher.minOrderValue || 0,
        quantity: voucher.quantity,
        startDate: voucher.startDate,
        endDate: voucher.endDate,
        status: 'INACTIVE',
      };
      return adminMarketingService.updateVoucher(voucher.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
      message.warning('Đã vô hiệu hóa khẩn cấp mã voucher thành công!');
    },
  });

  const delMut = useMutation({
    mutationFn: (id: number) => adminMarketingService.deleteVoucher(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
      message.success('Đã xóa mã voucher');
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    message.success(`Đã sao chép mã voucher: ${code}`);
  };

  const openForm = (p?: PromotionDTO) => {
    setEdit(p || null);
    setOpen(true);
  };

  const columns: TableColumnsType<PromotionDTO> = [
    {
      title: 'Mã Voucher',
      dataIndex: 'code',
      width: 160,
      render: (v: string) => (
        <Space size={4}>
          <span className="rounded bg-primary-50 px-2 py-0.5 font-mono text-xs font-bold text-primary-700 border border-primary-200">
            {v}
          </span>
          <Button
            size="small"
            type="text"
            icon={<CopyOutlined />}
            onClick={() => copyCode(v)}
            title="Sao chép mã voucher"
            className="!text-ink-2 hover:!text-primary-600"
          />
        </Space>
      ),
    },
    {
      title: 'Tên chiến dịch',
      dataIndex: 'name',
      render: (v: string, r) => (
        <div>
          <div className="font-medium text-ink">{v}</div>
          {r.minOrderValue > 0 && (
            <div className="text-xs text-ink-3">
              Đơn tối thiểu: {formatNumber(r.minOrderValue)}đ
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Loại & Mức giảm',
      dataIndex: 'discountType',
      width: 170,
      render: (v: string, r) => (
        <div>
          <span className="rounded-full bg-bg-muted px-2 py-0.5 text-xs font-medium text-ink-2">
            {v === 'PERCENT' ? 'Phần trăm' : 'Cố định'}
          </span>
          <div className="mt-1 font-bold text-primary-700">
            {v === 'PERCENT' ? `${r.discountValue}%` : `${formatNumber(r.discountValue)}đ`}
            {v === 'PERCENT' && r.maxDiscountAmount > 0 && (
              <span className="text-xs font-normal text-ink-3 ml-1">
                (tối đa {formatNumber(r.maxDiscountAmount)}đ)
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Tiến độ sử dụng (Đã dùng / Tổng)',
      width: 200,
      render: (_, r) => {
        const used = r.usedQuantity ?? 0;
        const total = r.quantity || 1;
        const percent = Math.min(100, Math.round((used / total) * 100));
        return (
          <div className="w-full">
            <div className="flex justify-between text-xs text-ink-2 mb-1">
              <span>{used} đã dùng</span>
              <span className="font-semibold">{r.quantity} mã</span>
            </div>
            <Progress
              percent={percent}
              size="small"
              status={percent >= 100 ? 'exception' : 'active'}
              strokeColor={percent >= 90 ? '#f5222d' : '#16a34a'}
            />
          </div>
        );
      },
    },
    {
      title: 'Thời hạn hiệu lực',
      width: 210,
      render: (_, r) => {
        const isExpired = dayjs().isAfter(dayjs(r.endDate));
        return (
          <div className="text-xs">
            <div className="text-ink-2">
              Từ: {dayjs(r.startDate).format('DD/MM/YYYY HH:mm')}
            </div>
            <div className={isExpired ? 'font-semibold text-rose-600' : 'text-ink-2'}>
              Đến: {dayjs(r.endDate).format('DD/MM/YYYY HH:mm')} {isExpired && '(Hết hạn)'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: 'Thao tác',
      width: 140,
      render: (_, r) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openForm(r)}
            className="!rounded-full hover:!text-primary-600"
            title="Chỉnh sửa voucher"
          />

          {r.status === 'ACTIVE' && (
            <Popconfirm
              title="Vô hiệu hóa khẩn cấp"
              description={`Bạn có chắc muốn vô hiệu hóa ngay mã ${r.code}?`}
              onConfirm={() => emergencyDeactivateMut.mutate(r)}
              okText="Vô hiệu hóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                className="!rounded-full"
                title="Vô hiệu hóa khẩn cấp voucher"
              />
            </Popconfirm>
          )}

          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => delMut.mutate(r.id)}
            className="!rounded-full"
            title="Xóa voucher"
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Quản Lý Mã Khuyến Mãi (Vouchers)"
        subtitle="Danh mục mã coupon giảm giá, cấu hình điều kiện và theo dõi lượt sử dụng"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openForm()}
            className="!rounded-full !bg-primary-600 hover:!bg-primary-700"
          >
            Tạo mã Voucher mới
          </Button>
        }
      />

      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Input.Search
              placeholder="Tìm theo mã hoặc tên chiến dịch..."
              allowClear
              onSearch={(v) => {
                setKeyword(v.trim());
                setPage(1);
              }}
              className="!w-64"
            />
            <Select
              placeholder="Lọc trạng thái"
              allowClear
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              className="!w-36"
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
              ]}
            />
          </div>
          <div className="text-xs text-ink-2">
            🛡️ Bấm nút <StopOutlined className="text-rose-500" /> để khóa khẩn cấp voucher khi hết ngân sách
          </div>
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

      <VoucherFormModal
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
