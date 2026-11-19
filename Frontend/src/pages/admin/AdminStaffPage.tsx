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
import { useAppSelector } from '@/store/hooks';
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
  const { user: currentUser } = useAppSelector((s) => s.auth);
  const isSuperAdmin = currentUser?.id === 1 || currentUser?.email?.toLowerCase() === 'admin@greenphone.vn';

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
      render: (_: unknown, record: StaffDTO) => {
        const isSelf = !!currentUser && (currentUser.id === record.id || currentUser.email?.toLowerCase() === record.email?.toLowerCase());
        const isRecordSuperAdmin = record.id === 1 || record.email?.toLowerCase() === 'admin@greenphone.vn';
        const isRecordAdmin = record.role === 'ROLE_ADMIN' || record.role === 'ADMIN';

        // Quyền sửa vai trò:
        let canEditRole = true;
        let editTooltip = 'Điều chỉnh vai trò';
        if (isRecordSuperAdmin) {
          canEditRole = false;
          editTooltip = 'Quản trị viên tối cao - Quyền hạn bất khả xâm phạm';
        } else if (isSelf) {
          canEditRole = false;
          editTooltip = 'Không thể tự thay đổi vai trò của chính mình';
        } else if (isRecordAdmin && !isSuperAdmin) {
          canEditRole = false;
          editTooltip = 'Chỉ Quản trị viên tối cao mới có thể điều chỉnh quyền của Quản trị viên khác';
        }

        // Quyền khóa / mở khóa:
        let canToggleStatus = true;
        let statusTooltip = record.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản';
        if (isRecordSuperAdmin) {
          canToggleStatus = false;
          statusTooltip = 'Tài khoản Quản trị viên tối cao không thể bị khóa';
        } else if (isSelf) {
          canToggleStatus = false;
          statusTooltip = 'Không thể tự khóa tài khoản của chính mình';
        } else if (isRecordAdmin && !isSuperAdmin) {
          canToggleStatus = false;
          statusTooltip = 'Chỉ Quản trị viên tối cao mới có thể khóa tài khoản Quản trị viên khác';
        }

        return (
          <Space size="small">
            <Tooltip title={editTooltip}>
              <span>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  disabled={!canEditRole}
                  onClick={() => setRoleModalStaff(record)}
                  className="!text-ink-2 hover:!text-primary-600 hover:!bg-primary-50 !rounded-lg disabled:!opacity-40 disabled:!cursor-not-allowed"
                />
              </span>
            </Tooltip>

            {record.status === 'ACTIVE' ? (
              canToggleStatus ? (
                <Popconfirm
                  title="Khóa tài khoản nhân viên"
                  description={`Bạn có chắc muốn khóa tài khoản "${record.fullName}"?`}
                  onConfirm={() => statusMutation.mutate({ id: record.id, status: 'BLOCKED' })}
                  okText="Khóa tài khoản"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title={statusTooltip}>
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
                <Tooltip title={statusTooltip}>
                  <span>
                    <Button
                      type="text"
                      size="small"
                      icon={<LockOutlined />}
                      disabled
                      className="!rounded-lg !opacity-40 !cursor-not-allowed text-gray-400"
                    />
                  </span>
                </Tooltip>
              )
            ) : canToggleStatus ? (
              <Popconfirm
                title="Mở khóa tài khoản nhân viên"
                description={`Bạn có chắc muốn kích hoạt lại tài khoản "${record.fullName}"?`}
                onConfirm={() => statusMutation.mutate({ id: record.id, status: 'ACTIVE' })}
                okText="Kích hoạt lại"
                cancelText="Hủy"
              >
                <Tooltip title={statusTooltip}>
                  <Button
                    type="text"
                    size="small"
                    icon={<UnlockOutlined />}
                    className="!text-emerald-600 hover:!bg-emerald-50 !rounded-lg"
                  />
                </Tooltip>
              </Popconfirm>
            ) : (
              <Tooltip title={statusTooltip}>
                <span>
                  <Button
                    type="text"
                    size="small"
                    icon={<UnlockOutlined />}
                    disabled
                    className="!rounded-lg !opacity-40 !cursor-not-allowed text-gray-400"
                  />
                </span>
              </Tooltip>
            )}
          </Space>
        );
      },
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
