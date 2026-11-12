import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Input, Select, Table, Tag, Tooltip, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { supplierService } from '@/services/supplierService';
import { warehouseService } from '@/services/warehouseService';
import type { PurchaseOrderFilters } from '@/services/purchaseOrderService';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import CreatePurchaseOrderModal from '@/components/admin/purchaseOrder/CreatePurchaseOrderModal';
import PurchaseOrderDetailDrawer from '@/components/admin/purchaseOrder/PurchaseOrderDetailDrawer';
import { formatProcurementVnd, purchaseOrderService, type PurchaseOrder, type PurchaseOrderRequest, type PurchaseOrderStatus } from '@/services/purchaseOrderService';
export default function AdminPurchaseOrdersPage() {
  const client = useQueryClient();
  const [status, setStatus] = useState<PurchaseOrderStatus>();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<PurchaseOrderFilters>({});
  const suppliers = useQuery({ queryKey: ['admin-suppliers', ''], queryFn: () => supplierService.list() });
  const warehouses = useQuery({ queryKey: ['admin', 'warehouses'], queryFn: () => warehouseService.list() });
  const filter = (values: PurchaseOrderFilters) => { setFilters((current) => ({ ...current, ...values })); setPage(1); };
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder>();
  const [detailId, setDetailId] = useState<number>();
  const guard = useRef(false);
  const [messages, context] = message.useMessage();
  const query = useQuery({ queryKey: ['purchase-orders', status, page, filters], queryFn: () => Object.keys(filters).length ? purchaseOrderService.list(status, page - 1, filters) : purchaseOrderService.list(status, page - 1) });
  const create = useMutation({ mutationFn: (values: PurchaseOrderRequest) => editing ? purchaseOrderService.update(editing.id, values) : purchaseOrderService.create(values), onSuccess: (po) => {
    void client.invalidateQueries({ queryKey: ['purchase-orders'] }); client.setQueryData(['purchase-order', po.id], po);
    setCreating(false); setEditing(undefined); setDetailId(po.id); messages.success(editing ? 'Đã cập nhật PO nháp' : 'Đã tạo đơn nhập hàng');
  } });
  const action = useMutation({ mutationFn: ({ id, kind }: { id: number; kind: 'receive' | 'order' | 'cancel' }) => purchaseOrderService[kind](id), onSuccess: async (po) => {
    client.setQueryData(['purchase-order', po.id], po);
    client.setQueriesData<{ content: PurchaseOrder[]; totalElements: number }>({ queryKey: ['purchase-orders'] }, (current) => current ? { ...current, content: current.content.map((item) => item.id === po.id ? po : item) } : current);
    await Promise.all(['purchase-orders', 'admin-phones', 'phones', 'admin-variants', 'admin-inventory-history', 'warehouse-stock', 'warehouse-distribution', 'warehouse-history'].map((key) => client.invalidateQueries({ queryKey: [key] })));
    messages.success(po.status === 'RECEIVED' ? 'Đã nhận hàng và cập nhật tồn kho' : 'Đã cập nhật đơn nhập hàng');
  } });
  const handleAction = async (kind: 'receive' | 'order' | 'cancel') => {
    if (guard.current || !detailId) return;
    guard.current = true;
    try { await action.mutateAsync({ id: detailId, kind }); }
    catch { /* Mutation error is displayed inside the drawer. */ }
    finally { guard.current = false; }
  };
  return <>{context}<AdminPageHeader title="Đơn Nhập Hàng (PO)" subtitle="Lập đơn mua hàng và nghiệm thu vào đúng chi nhánh"
    actions={<Button type="primary" onClick={() => setCreating(true)}>Tạo Đơn Nhập Hàng Mới</Button>} />
    <AdminCard><div className="mb-4 flex flex-wrap gap-3">
      <Input.Search aria-label="Tìm PO" placeholder="Tìm mã PO hoặc nhà cung cấp..." value={filters.keyword ?? ''} style={{ width: 300 }} allowClear onChange={(event) => filter({ keyword: event.target.value })} onSearch={(keyword) => filter({ keyword })} />
      <Select aria-label="Lọc trạng thái PO" placeholder="Tất cả trạng thái" allowClear style={{ width: 180 }} value={status}
      options={['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'].map((value) => ({ value, label: value }))} onChange={(value) => { setStatus(value); setPage(1); }} />
      <Select aria-label="Lọc NCC của PO" placeholder="Tất cả NCC" allowClear style={{ width: 200 }} value={filters.supplierId} loading={suppliers.isPending} onChange={(supplierId) => filter({ supplierId })} options={(suppliers.data ?? []).map((item) => ({ value: item.id, label: item.name }))} />
      <Select aria-label="Lọc kho của PO" placeholder="Tất cả chi nhánh" allowClear style={{ width: 200 }} value={filters.warehouseId} loading={warehouses.isPending} onChange={(warehouseId) => filter({ warehouseId })} options={(warehouses.data ?? []).map((item) => ({ value: item.id, label: item.name }))} />
      <Select aria-label="Sắp xếp PO" value={filters.sort ?? 'NEWEST'} style={{ width: 200 }} onChange={(sort) => filter({ sort })} options={[
        { value: 'NEWEST', label: 'Mới nhất' }, { value: 'OLDEST', label: 'Cũ nhất' }, { value: 'COST_ASC', label: 'Tổng tiền tăng dần' }, { value: 'COST_DESC', label: 'Tổng tiền giảm dần' }, { value: 'CODE_ASC', label: 'Mã PO: A → Z' }, { value: 'CODE_DESC', label: 'Mã PO: Z → A' },
      ]} />
      <Button onClick={() => { setFilters({}); setStatus(undefined); setPage(1); }}>Đặt lại</Button>
    </div>
      {query.isError && <Alert type="error" title="Không tải được đơn nhập hàng" action={<Button onClick={() => void query.refetch()}>Thử lại</Button>} />}
      <Table<PurchaseOrder> rowKey="id" loading={query.isPending} dataSource={query.data?.content ?? []} scroll={{ x: 1100 }}
        pagination={{ current: page, pageSize: 10, total: query.data?.totalElements ?? 0, onChange: setPage, showSizeChanger: false }} columns={[
          { title: 'Mã PO', dataIndex: 'poNumber', render: (value, po) => <Button type="link" onClick={() => { action.reset(); setDetailId(po.id); }}>{value}</Button> },
          { title: 'Nhà cung cấp', dataIndex: 'supplierName' }, { title: 'Kho nhận hàng', dataIndex: 'warehouseName' },
          { title: 'Trạng thái', dataIndex: 'status', render: (value) => <Tag color={value === 'RECEIVED' ? 'green' : value === 'CANCELLED' ? 'default' : 'blue'}>{value}</Tag> },
          { title: 'Tổng tiền nhập', dataIndex: 'totalCost', align: 'right', render: formatProcurementVnd },
          { title: 'Ngày tạo', dataIndex: 'createdAt', render: (value) => new Date(value).toLocaleString('vi-VN') },
          { title: 'Thao tác', align: 'right', render: (_, po) => <Tooltip title="Xem chi tiết"><Button aria-label={`Chi tiết ${po.poNumber}`} icon={<EyeOutlined />} onClick={() => { action.reset(); setDetailId(po.id); }} /></Tooltip> },
        ]} />
    </AdminCard>
    {creating && <CreatePurchaseOrderModal initialOrder={editing} onCancel={() => { setCreating(false); setEditing(undefined); }} onSubmit={(values) => create.mutateAsync(values)} />}
    {detailId !== undefined && <PurchaseOrderDetailDrawer id={detailId} pending={action.isPending} error={action.error?.message} onClose={() => { if (!guard.current) { setDetailId(undefined); action.reset(); } }} onAction={(kind) => void handleAction(kind)} onEdit={(po) => { setEditing(po); setCreating(true); }} />}
  </>;
}
