import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Switch, Popconfirm, Input, message, type TableColumnsType, Avatar, Modal, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { ShieldAlert } from 'lucide-react';
import { adminUserService } from '@/services';
import type { UserDTO } from '@/types/api';
import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import StatusTag from '@/components/admin/StatusTag';
import MaskedValue from '@/components/admin/MaskedValue';

/* Hallmark · Workbench (design.md): page header, table card, avatar + pill status. */

const PAGE_SIZE = 15;

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [blockingUser, setBlockingUser] = useState<UserDTO | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const params: Record<string, string> = { page: String(page - 1), size: String(PAGE_SIZE) };
  if (search) params.search = search;
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => adminUserService.list(params),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: string; reason?: string }) =>
      reason ? adminUserService.updateStatus(id, status, reason) : adminUserService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      message.success('Cập nhật trạng thái thành công');
    },
    onError: (err: any) => {
      message.error(err?.message || 'Không thể cập nhật trạng thái');
    },
  });

  const columns: TableColumnsType<UserDTO> = [
    // Tính STT liên tục theo trang hiện tại (chuẩn phân trang)
    {
      title: 'STT',
      width: 60,
      align: 'center',
      render: (_: unknown, __: UserDTO, index?: number) => {
        const pageSize = data?.size || PAGE_SIZE;
        return (
          <span className="text-ink-2 font-medium">
            {(page - 1) * pageSize + (index ?? 0) + 1}
          </span>
        );
      },
    },
    {
      title: 'Khách hàng', dataIndex: 'fullName', render: (v: string, r) => (
        <div className="flex items-center gap-2.5">
          <Avatar size={32} icon={<UserOutlined />} className="!bg-primary-100 !text-primary-700" />
          <div className="min-w-0">
            <div className="font-medium text-ink truncate">{v || 'Chưa đặt tên'}</div>
            <div className="text-xs text-ink-2 truncate"><MaskedValue value={r.email} type="email" /></div>
          </div>
        </div>
      ),
    },
    { title: 'SĐT', dataIndex: 'phone', width: 140, render: (v: string) => <MaskedValue value={v} type="phone" /> },
    { title: 'Địa chỉ', dataIndex: 'address', width: 180, render: (v: string) => <MaskedValue value={v} type="address" /> },
    { title: 'Vai trò', dataIndex: 'role', width: 110, align: 'center', render: (v: string) => <span className="rounded-full bg-bg-muted px-2.5 py-0.5 text-xs font-medium text-ink-2">{v === 'ROLE_ADMIN' ? 'Quản trị' : 'Khách hàng'}</span> },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 130, align: 'center',
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: 'Khóa tài khoản', width: 140, align: 'center',
      render: (_: unknown, r: UserDTO) => {
        const isActive = r.status === 'ACTIVE';

        if (isActive) {
          return (
            <Switch
              checked={true}
              loading={statusMut.isPending && (statusMut.variables as any)?.id === r.id}
              checkedChildren="Mở"
              unCheckedChildren="Khóa"
              className="!bg-primary-600"
              onClick={() => {
                setBlockingUser(r);
                setBlockReason('');
              }}
            />
          );
        }

        return (
          <Popconfirm
            title="Mở khóa tài khoản"
            description={`Bạn có chắc muốn mở khóa cho tài khoản "${r.fullName || r.email}"?`}
            onConfirm={() => {
              statusMut.mutate({ id: r.id, status: 'ACTIVE' });
            }}
            okText="Mở khóa"
            cancelText="Hủy"
          >
            <Switch
              checked={false}
              loading={statusMut.isPending && (statusMut.variables as any)?.id === r.id}
              checkedChildren="Mở"
              unCheckedChildren="Khóa"
              className="!bg-red-500"
            />
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Khách hàng"
        subtitle="Quản lý tài khoản người dùng"
        actions={<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><UserOutlined /></div>}
      />
      <AdminCard>
        <div className="mb-4">
          <Input.Search
            placeholder="Tìm email / tên khách hàng..."
            allowClear
            onSearch={(v) => { setSearch(v.trim()); setPage(1); }}
            className="!w-64"
          />
        </div>
        <Table<UserDTO>
          columns={columns}
          dataSource={data?.content || []}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={{
            current: page,
            pageSize: data?.size || PAGE_SIZE,
            total: data?.totalElements || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
        />
      </AdminCard>

      {/* Modal Bắt Buộc Nhập Lý Do Khóa Tài Khoản (Bước 1) */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-red-600 font-bold text-base">
            <ShieldAlert className="h-5 w-5" />
            <span>Khóa tài khoản khách hàng</span>
          </div>
        }
        open={!!blockingUser}
        onCancel={() => {
          setBlockingUser(null);
          setBlockReason('');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setBlockingUser(null);
              setBlockReason('');
            }}
          >
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            loading={statusMut.isPending}
            disabled={blockReason.trim().length < 10}
            onClick={() => {
              if (blockingUser && blockReason.trim().length >= 10) {
                statusMut.mutate(
                  { id: blockingUser.id, status: 'BLOCKED', reason: blockReason.trim() },
                  {
                    onSuccess: () => {
                      setBlockingUser(null);
                      setBlockReason('');
                    },
                  }
                );
              }
            }}
          >
            Xác nhận khóa
          </Button>,
        ]}
        destroyOnHidden
      >
        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-gray-50 p-3 text-sm">
            <div className="font-semibold text-gray-900">
              Khách hàng: {blockingUser?.fullName || 'Chưa đặt tên'}
            </div>
            <div className="text-gray-500 font-mono text-xs">{blockingUser?.email}</div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Lý do khóa tài khoản <span className="text-red-500">*</span>
            </label>
            <Input.TextArea
              rows={4}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Nhập lý do chi tiết (tối thiểu 10 ký tự, ví dụ: Phát hiện gian lận hoàn tiền VietQR, Spam đơn hàng ảo...)"
              className="!rounded-xl"
            />
            <div className="mt-1.5 flex justify-between text-xs">
              <span className={blockReason.trim().length < 10 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                {blockReason.trim().length < 10
                  ? `Cần thêm ít nhất ${10 - blockReason.trim().length} ký tự nữa`
                  : 'Đạt yêu cầu tối thiểu'}
              </span>
              <span className="text-gray-400 font-mono">{blockReason.trim().length} ký tự</span>
            </div>
          </div>

          <div className="rounded-xl border border-red-100 bg-red-50/70 p-3 text-xs text-red-700 leading-relaxed">
            <strong>Cảnh báo hủy phiên tức thì:</strong> Sau khi khóa, toàn bộ phiên đăng nhập của khách hàng sẽ bị thu hồi ngay lập tức và hệ thống sẽ tự động gửi email thông báo kèm mã hồ sơ khiếu nại tới khách hàng.
          </div>
        </div>
      </Modal>
    </div>
  );
}
