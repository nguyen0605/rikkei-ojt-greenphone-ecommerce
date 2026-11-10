import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Drawer, Input, Select, Space, Table, Tag, message } from 'antd';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import BranchMovementModal, { type BranchAction, type BranchMovementValues } from '@/components/admin/warehouse/BranchMovementModal';
import { warehouseService, warehouseInventoryService, type WarehouseStock, type WarehouseStockHistory } from '@/services/warehouseService';

export default function AdminWarehouseDetailPage() {
  const id = Number(useParams().id);
  const valid = Number.isSafeInteger(id) && id > 0;
  const client = useQueryClient();
  const [messages, context] = message.useMessage();
  const [action, setAction] = useState<BranchAction | null>(null);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [storageFilter, setStorageFilter] = useState<string>();
  const [sort, setSort] = useState('NAME_ASC');
  const [page, setPage] = useState(1);
  const [historyVariant, setHistoryVariant] = useState<number | null>(null);
  const warehouse = useQuery({ queryKey: ['warehouse-detail', id], queryFn: () => warehouseService.get(id), enabled: valid });
  const stock = useQuery({ queryKey: ['warehouse-stock', id], queryFn: () => warehouseInventoryService.stock(id), enabled: valid });
  const history = useQuery({ queryKey: ['warehouse-history', id, historyVariant], queryFn: () => warehouseInventoryService.history(id, historyVariant!), enabled: valid && historyVariant !== null });
  const mutation = useMutation({
    mutationFn: (values: BranchMovementValues) => {
      if (values.targetWarehouseId === undefined || values.warehouseId === values.targetWarehouseId) throw new Error('Chọn hai đầu nhập/xuất khác nhau');
      if (values.warehouseId > 0 && values.targetWarehouseId > 0) {
        return warehouseInventoryService.transfer(values.warehouseId, { variantId: values.variantId, quantity: values.quantity, reason: values.reason, targetWarehouseId: values.targetWarehouseId });
      }
      const importing = values.warehouseId === 0;
      return warehouseInventoryService.movement(importing ? values.targetWarehouseId : values.warehouseId,
        { variantId: values.variantId, quantity: values.quantity, reason: values.reason, changeType: importing ? 'IMPORT' : 'EXPORT' });
    },
    onSuccess: () => {
      for (const key of ['warehouse-stock', 'warehouse-history', 'warehouse-distribution', 'admin-phones']) void client.invalidateQueries({ queryKey: [key] });
      setAction(null); messages.success('Đã cập nhật tồn kho chi nhánh');
    },
  });
  if (!valid) return <Alert type="error" title="Mã chi nhánh không hợp lệ" />;
  const active = warehouse.data?.status === 'ACTIVE';
  const rows = (stock.data ?? []).filter((row) => {
    const matchesSearch = `${row.productName} ${row.sku} ${row.ram} ${row.storage} ${row.color}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'));
    const matchesStock = stockFilter === 'ALL' || (stockFilter === 'IN_STOCK' && row.quantity > 0)
      || (stockFilter === 'LOW' && row.quantity > 0 && row.quantity <= 5) || (stockFilter === 'EMPTY' && row.quantity === 0);
    return matchesSearch && matchesStock && (!storageFilter || row.storage === storageFilter);
  }).sort((a, b) => {
    const comparison = sort.startsWith('QTY') ? a.quantity - b.quantity
      : sort.startsWith('SKU') ? (a.sku ?? '').localeCompare(b.sku ?? '', 'vi') : a.productName.localeCompare(b.productName, 'vi');
    return (sort.endsWith('DESC') ? -comparison : comparison) || a.variantId - b.variantId;
  });
  return <>{context}
    <Link to="/admin/warehouses">← Chi nhánh</Link>
    <AdminPageHeader title={warehouse.data?.name ?? 'Chi tiết chi nhánh'} subtitle={warehouse.data?.address}
      actions={<Button type="primary" disabled={!active || mutation.isPending} onClick={() => setAction({ mode: 'IMPORT' })}>Nhập sản phẩm</Button>} />
    {!active && warehouse.data && <Alert className="mb-4" type="warning" title="Chi nhánh INACTIVE: chỉ xem dữ liệu, không nhập/xuất/chuyển kho thủ công." />}
    {(warehouse.isError || stock.isError) && <Alert className="mb-4" type="error" title="Không thể tải chi nhánh hoặc tồn kho"
      action={<Button onClick={() => { void warehouse.refetch(); void stock.refetch(); }}>Thử lại</Button>} />}
    <div className="mb-5 grid grid-cols-2 gap-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4"><div className="text-sm text-gray-500">Biến thể tại chi nhánh</div><div className="mt-1 text-2xl font-semibold">{stock.data?.length ?? 0}</div></div>
      <div className="rounded-xl border border-green-100 bg-green-50 p-4"><div className="text-sm text-green-700">Sản phẩm trong kho</div><div className="mt-1 text-2xl font-semibold text-green-800">{(stock.data ?? []).reduce((sum, row) => sum + row.quantity, 0).toLocaleString('vi-VN')}</div></div>
    </div>
    <AdminCard><div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1.6fr)_repeat(3,minmax(160px,1fr))_auto]">
      <Input.Search style={{ width: '100%' }} placeholder="Tìm sản phẩm, SKU, màu..." aria-label="Tìm trong chi nhánh"
        allowClear value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
      <Select aria-label="Lọc tồn kho" value={stockFilter} style={{ width: '100%' }} onChange={(value) => { setStockFilter(value); setPage(1); }} options={[
        { value: 'ALL', label: 'Tất cả tồn kho' }, { value: 'IN_STOCK', label: 'Còn hàng' },
        { value: 'LOW', label: 'Sắp hết (1–5)' }, { value: 'EMPTY', label: 'Hết hàng (0)' },
      ]} />
      <Select aria-label="Lọc dung lượng" placeholder="Tất cả dung lượng" allowClear value={storageFilter} style={{ width: '100%' }}
        onChange={(value) => { setStorageFilter(value); setPage(1); }} options={[...new Set((stock.data ?? []).map((row) => row.storage))].sort().map((value) => ({ value, label: value }))} />
      <Select aria-label="Sắp xếp tồn kho" value={sort} style={{ width: '100%' }} onChange={(value) => { setSort(value); setPage(1); }} options={[
        { value: 'NAME_ASC', label: 'Tên sản phẩm: A → Z' }, { value: 'NAME_DESC', label: 'Tên sản phẩm: Z → A' },
        { value: 'QTY_ASC', label: 'Tồn kho: thấp → cao' }, { value: 'QTY_DESC', label: 'Tồn kho: cao → thấp' },
        { value: 'SKU_ASC', label: 'SKU: A → Z' }, { value: 'SKU_DESC', label: 'SKU: Z → A' },
      ]} />
      <Button onClick={() => { setSearch(''); setStockFilter('ALL'); setStorageFilter(undefined); setSort('NAME_ASC'); setPage(1); }}>Đặt lại</Button>
    </div>
    <p className="mb-3 text-sm text-gray-500">Hiển thị {rows.length} / {stock.data?.length ?? 0} biến thể</p>
    <Table<WarehouseStock> rowKey="variantId" size="middle" tableLayout="fixed" loading={stock.isPending}
      dataSource={rows} scroll={{ x: 1100 }} pagination={{ current: page, pageSize: 10, onChange: setPage, hideOnSinglePage: true }}
      locale={{ emptyText: stock.data?.length ? 'Không có biến thể phù hợp bộ lọc' : 'Chưa có sản phẩm tại chi nhánh. Bấm Nhập sản phẩm để thêm.' }} columns={[
        { title: 'Sản phẩm', width: '28%', render: (_, row) => <div><div className="font-semibold">{row.productName}</div><div className="mt-1 font-mono text-xs text-gray-500">{row.sku}</div></div> },
        { title: 'Biến thể', width: '27%', render: (_, row) => `${row.ram} / ${row.storage} / ${row.color}` },
        { title: 'Tồn chi nhánh', width: '14%', dataIndex: 'quantity', align: 'center', render: (quantity: number) => <span className="text-lg font-semibold text-green-700">{quantity}</span> },
        { title: 'Tổng tồn', width: '11%', dataIndex: 'aggregateQuantity', align: 'center' },
        { title: 'Thao tác', width: '20%', align: 'right', render: (_, row) => <Space>
          {(['IMPORT', 'EXPORT'] as const).map((mode) => <Button key={mode} disabled={!active || mutation.isPending}
            onClick={() => setAction({ mode, variant: row })}>{({ IMPORT: 'Nhập', EXPORT: 'Xuất' })[mode]}</Button>)}
          <Button onClick={() => setHistoryVariant(row.variantId)}>Lịch sử</Button>
        </Space> },
      ]} /></AdminCard>
    {action && <BranchMovementModal warehouseId={id} action={action} onCancel={() => setAction(null)} onSubmit={(values) => mutation.mutateAsync(values)} />}
    <Drawer open={historyVariant !== null} onClose={() => setHistoryVariant(null)} title="Lịch sử chi nhánh — 100 giao dịch gần nhất" size="large">
      {history.isError && <Alert type="error" title="Không tải được lịch sử" />}
      <Table<WarehouseStockHistory> rowKey="id" size="small" loading={history.isPending} dataSource={history.data ?? []} scroll={{ x: 850 }} columns={[
        { title: 'Thời gian', dataIndex: 'createdAt' }, { title: 'Loại', dataIndex: 'changeType', render: (type: string) => <Tag>{type}</Tag> },
        { title: 'Trước', dataIndex: 'quantityBefore' }, { title: 'Thay đổi', dataIndex: 'quantityChange' }, { title: 'Sau', dataIndex: 'quantityAfter' },
        { title: 'Người thực hiện', dataIndex: 'changedByName' }, { title: 'Lý do', dataIndex: 'reason' }, { title: 'Mã chuyển', dataIndex: 'transferReference' },
      ]} />
    </Drawer>
  </>;
}
