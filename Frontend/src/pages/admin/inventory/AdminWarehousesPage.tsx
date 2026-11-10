import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Popconfirm, Space, Switch, Table, Tag, Tooltip, message, type TableColumnsType } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import WarehouseModal from '@/components/admin/warehouse/WarehouseModal';
import { warehouseService, type Warehouse, type WarehouseRequest, type WarehouseStatus } from '@/services/warehouseService';

const queryKey = ['admin', 'warehouses'] as const;

export default function AdminWarehousesPage() {
  const navigate = useNavigate();
  const [messages, messageContext] = message.useMessage();
  const client = useQueryClient();
  const [editing, setEditing] = useState<Warehouse | null | undefined>();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const statusLock = useRef(false);
  const query = useQuery({ queryKey, queryFn: ({ signal }) => warehouseService.list(signal) });

  const updateCache = (warehouse: Warehouse) => {
    client.setQueryData<Warehouse[]>(queryKey, (previous = []) =>
      [...previous.filter((item) => item.id !== warehouse.id), warehouse].sort((a, b) => a.id - b.id));
    void client.invalidateQueries({ queryKey });
  };

  const save = useMutation({
    mutationFn: (values: WarehouseRequest) => editing
      ? warehouseService.update(editing.id, values) : warehouseService.create(values),
    onMutate: () => client.cancelQueries({ queryKey }),
    onSuccess: (warehouse) => {
      updateCache(warehouse);
      setEditing(undefined);
      messages.success('Đã lưu thông tin chi nhánh');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: WarehouseStatus }) => warehouseService.updateStatus(id, status),
    onMutate: () => client.cancelQueries({ queryKey }),
    onSuccess: (warehouse) => {
      updateCache(warehouse);
      messages.success('Đã cập nhật trạng thái chi nhánh');
    },
    onError: (error: Error) => messages.error(error.message || 'Không thể cập nhật trạng thái'),
  });

  const changeStatus = async (warehouse: Warehouse, status: WarehouseStatus) => {
    if (statusLock.current) return;
    statusLock.current = true;
    try {
      await statusMutation.mutateAsync({ id: warehouse.id, status });
    } catch {
      // Mutation reports the error; keep the server's previous status visible.
    } finally {
      statusLock.current = false;
      setConfirmId(null);
    }
  };

  const busy = save.isPending || statusMutation.isPending;
  const columns: TableColumnsType<Warehouse> = [
    { title: 'Mã kho', dataIndex: 'code', width: 190, render: (code: string) => <Tag color="green">{code}</Tag> },
    { title: 'Tên chi nhánh', dataIndex: 'name', width: 240 },
    { title: 'Địa chỉ', dataIndex: 'address', width: 300 },
    { title: 'Trạng thái', dataIndex: 'status', width: 150,
      render: (status: WarehouseStatus) => <Badge status={status === 'ACTIVE' ? 'success' : 'default'} text={status} /> },
    { title: 'Thao tác', width: 160, render: (_: unknown, warehouse: Warehouse) => (
      <Space>
        <Tooltip title="Chi tiết"><Button type="text" icon={<EyeOutlined />} aria-label={`Chi tiết ${warehouse.code}`}
          onClick={() => navigate(`/admin/warehouses/${warehouse.id}`)} /></Tooltip>
        <Tooltip title="Sửa"><Button type="text" icon={<EditOutlined />} aria-label={`Sửa ${warehouse.code}`} disabled={busy}
          onClick={() => setEditing(warehouse)} /></Tooltip>
        <Popconfirm title="Ngừng hoạt động chi nhánh?"
          description={<div style={{ maxWidth: 280, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
            Bạn có chắc muốn chuyển {warehouse.code} sang INACTIVE?
          </div>}
          okText="Xác nhận" cancelText="Hủy" open={confirmId === warehouse.id}
          disabled={warehouse.status !== 'ACTIVE' || busy}
          onOpenChange={(open) => { if (!busy) setConfirmId(open ? warehouse.id : null); }}
          onCancel={() => setConfirmId(null)} onConfirm={() => changeStatus(warehouse, 'INACTIVE')}
          okButtonProps={{ loading: statusMutation.isPending, disabled: statusMutation.isPending }}>
          <Switch checked={warehouse.status === 'ACTIVE'} disabled={busy}
            loading={statusMutation.isPending && statusMutation.variables?.id === warehouse.id}
            aria-label={`Trạng thái ${warehouse.code}`}
            onChange={(checked) => {
              if (checked) void changeStatus(warehouse, 'ACTIVE');
              else setConfirmId(warehouse.id);
            }} />
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <>
      {messageContext}
      <AdminPageHeader title="Chi nhánh" subtitle="Quản lý thông tin và trạng thái hoạt động của các kho hàng" />
      <div className="mb-4 flex justify-end">
        <Button type="primary" icon={<PlusOutlined aria-hidden />} aria-label="Thêm Chi Nhánh Mới"
          disabled={busy} onClick={() => setEditing(null)}>
          Thêm Chi Nhánh Mới
        </Button>
      </div>
      {query.isError && <Alert type="error" showIcon className="mb-4" title="Không thể tải danh sách chi nhánh"
        description={query.error.message} action={<Button onClick={() => void query.refetch()}>Thử lại</Button>} />}
      <AdminCard>
        <Table<Warehouse> rowKey="id" columns={columns} dataSource={query.data ?? []}
          loading={query.isPending} scroll={{ x: 1050 }} pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: 'Chưa có chi nhánh kho hàng' }} />
      </AdminCard>
      {editing !== undefined && <WarehouseModal warehouse={editing} onCancel={() => setEditing(undefined)}
        onSubmit={(values) => save.mutateAsync(values)} />}
    </>
  );
}
