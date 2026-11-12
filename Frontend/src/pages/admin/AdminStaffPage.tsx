import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Select, Input, Button, message, Popconfirm, Avatar, Space, Tooltip,
  type TableColumnsType,
} from 'antd';
import {
  UserOutlined, PlusOutlined, SearchOutlined, LockOutlined, UnlockOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { adminStaffService } from '@/services/adminStaffService';
import type { StaffDTO } from '@/types/api';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import StatusTag from '@/components/admin/StatusTag';
import MaskedValue from '@/components/admin/MaskedValue';
import StaffCreateModal from '@/components/admin/StaffCreateModal';
import StaffRoleModal from '@/components/admin/StaffRoleModal';

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả vai trò' },
  { value: 'ROLE_ADMIN', label: 'Quản trị viên' },
  { value: 'ROLE_SALES', label: 'Kinh doanh & Đơn hàng' },
  { value: 'ROLE_WAREHOUSE', label: 'Thủ kho & Bảo hành' },
  { value: 'ROLE_MARKETING', label: 'Marketing & Sản phẩm' },
];

export default function AdminStaffPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [roleModalStaff, setRoleModalStaff] = useState<StaffDTO | null>(null);

  const queryParams: Record<string, string> = {
    page: String(page - 1),
    size: String(pageSize),
  };
  if (search.trim()) queryParams.search = search.trim();
  if (roleFilter) queryParams.role = roleFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff', queryParams],
    queryFn: () => adminStaffService.list(queryParams),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminStaffService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      message.success(
        variables.status === 'BLOCKED'
          ? 'Đã khóa tài khoản nhân viên thành công'
          : 'Đã kích hoạt lại tài khoản nhân viên thành công'
      );
      qc.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || err?.message || 'Không thể cập nhật trạng thái');
    },
  });

  const columns: TableColumnsType<StaffDTO> = [
    {
      title: 'STT',
      width: 65,
      align: 'center',
      render: (_: unknown, __: StaffDTO, index?: number) => (
        <span className="text-ink-2 font-medium">{(page - 1) * pageSize + (index ?? 0) + 1}</span>
      ),
    },
    {
      title: 'Nhân viên',
      dataIndex: 'fullName',
      render: (name: string, record: StaffDTO) => (
        <div className="flex items-center gap-3">
          <Avatar
            size={36}
            icon={<UserOutlined />}
            className="!bg-primary-100 !text-primary-700 font-semibold"
          >
            {name ? name.charAt(0).toUpperCase() : 'U'}
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium text-ink truncate">{name}</div>
            <div className="text-xs text-ink-2 truncate">
              <MaskedValue value={record.email} type="email" />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      width: 150,
      render: (phone: string) => <MaskedValue value={phone} type="phone" />,
    },
    {
      title: 'Vai trò nghiệp vụ',
      dataIndex: 'role',
      width: 170,
      render: (role: string) => <StatusTag status={role} />,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: 'Ngày khởi tạo',
      dataIndex: 'createdAt',
      width: 160,
      render: (dateStr: string) => (
        <span className="text-xs text-ink-2">
          {dateStr ? new Date(dateStr).toLocaleString('vi-VN') : '—'}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      width: 140,
      align: 'center',
      render: (_: unknown, record: StaffDTO) => (
        <Space size="small">
          <Tooltip title="Điều chỉnh vai trò">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setRoleModalStaff(record)}
              className="!text-ink-2 hover:!text-primary-600 hover:!bg-primary-50 !rounded-lg"
            />
          </Tooltip>

          {record.status === 'ACTIVE' ? (
            <Popconfirm
              title="Khóa tài khoản nhân viên"
              description={`Bạn có chắc muốn khóa tài khoản "${record.fullName}"?`}
              onConfirm={() => statusMutation.mutate({ id: record.id, status: 'BLOCKED' })}
              okText="Khóa tài khoản"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Khóa tài khoản">
                <Button
                  type="text"
                  size="small"
                  icon={<LockOutlined />}
                  danger
                  className="hover:!bg-red-50 !rounded-lg"
                />
              </Tooltip>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Mở khóa tài khoản nhân viên"
              description={`Bạn có chắc muốn kích hoạt lại tài khoản "${record.fullName}"?`}
              onConfirm={() => statusMutation.mutate({ id: record.id, status: 'ACTIVE' })}
              okText="Kích hoạt lại"
              cancelText="Hủy"
            >
              <Tooltip title="Mở khóa tài khoản">
                <Button
                  type="text"
                  size="small"
                  icon={<UnlockOutlined />}
                  className="!text-emerald-600 hover:!bg-emerald-50 !rounded-lg"
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản trị nhân sự nội bộ"
        subtitle="Quản lý danh sách nhân viên và phân quyền vai trò theo từng phân hệ nghiệp vụ (RBAC)"
      />

      <AdminCard>
        {/* Filters & Actions Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-rule mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Tìm theo tên, email, sđt..."
              prefix={<SearchOutlined className="text-ink-2" />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              allowClear
              className="w-64"
            />

            <Select
              value={roleFilter}
              onChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
              options={ROLE_FILTER_OPTIONS}
              className="w-48"
            />
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            className="!bg-primary-600 hover:!bg-primary-700 !rounded-xl !h-10 !px-4 font-medium"
          >
            Thêm nhân viên
          </Button>
        </div>

        {/* Staff Table */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.content || []}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.totalElements || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showTotal: (total) => `Tổng số ${total} nhân sự`,
          }}
          className="admin-table"
        />
      </AdminCard>

      <StaffCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <StaffRoleModal
        staff={roleModalStaff}
        open={!!roleModalStaff}
        onClose={() => setRoleModalStaff(null)}
      />
    </div>
  );
}
