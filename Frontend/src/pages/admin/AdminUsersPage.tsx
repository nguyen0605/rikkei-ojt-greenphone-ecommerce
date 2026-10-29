import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Select, Input, message, type TableColumnsType, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { adminUserService } from '@/services';
import type { UserDTO } from '@/types/api';
import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import StatusTag from '@/components/admin/StatusTag';
import MaskedValue from '@/components/admin/MaskedValue';

/* Hallmark · Workbench (design.md): page header, table card, avatar + pill status. */

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const params: Record<string, string> = { page: String(page - 1), size: '15' };
  if (search) params.search = search;
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => adminUserService.list(params),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminUserService.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); message.success('Cập nhật trạng thái'); },
  });

  const columns: TableColumnsType<UserDTO> = [
    { title: 'STT', width: 60, render: (_: unknown, __: UserDTO, index?: number) => <span className="text-ink-2">{(index ?? 0) + 1}</span> },
    {
      title: 'Khách hàng', dataIndex: 'fullName', render: (v: string, r) => (
        <div className="flex items-center gap-2.5">
          <Avatar size={32} icon={<UserOutlined />} className="!bg-primary-100 !text-primary-700" />
          <div>
            <div className="font-medium text-ink">{v}</div>
            <div className="text-xs text-ink-2"><MaskedValue value={r.email} type="email" /></div>
          </div>
        </div>
      ),
    },
    { title: 'SĐT', dataIndex: 'phone', width: 150, render: (v: string) => <MaskedValue value={v} type="phone" /> },
    { title: 'Địa chỉ', dataIndex: 'address', width: 180, render: (v: string) => <MaskedValue value={v} type="address" /> },
    { title: 'Vai trò', dataIndex: 'role', width: 110, render: (v: string) => <span className="rounded-full bg-bg-muted px-2.5 py-0.5 text-xs font-medium text-ink-2">{v === 'ROLE_ADMIN' ? 'Quản trị' : 'Khách hàng'}</span> },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 170,
      render: (s: string, r) => (
        <div className="flex items-center gap-2">
          <StatusTag status={s} />
          <Select size="small" value={s} style={{ width: 100 }} onChange={(v) => statusMut.mutate({ id: r.id, status: v })} options={['ACTIVE', 'LOCKED'].map(o => ({ value: o, label: o === 'ACTIVE' ? 'ACTIVE' : 'LOCKED' }))} />
        </div>
      ),
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
