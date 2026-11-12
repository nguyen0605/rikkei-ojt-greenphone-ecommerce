import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Descriptions, Drawer, Input, Popconfirm, Select, Space, Switch, Table, Tag, Tooltip, message } from 'antd';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import { supplierService, type Supplier, type SupplierRequest } from '@/services/supplierService';
import SupplierModal from '@/components/admin/purchaseOrder/SupplierModal';
export default function AdminSuppliersPage() {
  const [keyword, setKeyword] = useState('');
  const [stateFilter, setStateFilter] = useState<string>();
  const [sort, setSort] = useState('NAME_ASC');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number>();
  const client = useQueryClient();
  const [editing, setEditing] = useState<Supplier | null | undefined>();
  const guard = useRef(false);
  const [messages, context] = message.useMessage();
  const query = useQuery({ queryKey: ['admin-suppliers', keyword], queryFn: () => supplierService.list(keyword) });
  const rows = (query.data ?? []).filter((row) => !stateFilter || row.status === stateFilter).sort((a, b) => {
    const key = sort.startsWith('CODE') ? 'code' : 'name';
    return (sort.endsWith('DESC') ? -1 : 1) * a[key].localeCompare(b[key], 'vi') || a.id - b.id;
  });
  const detail = query.data?.find((row) => row.id === detailId);
  const saved = async (supplier: Supplier) => {
    client.setQueriesData<Supplier[]>({ queryKey: ['admin-suppliers'] }, (current) => current?.map((row) => row.id === supplier.id ? supplier : row));
    await client.invalidateQueries({ queryKey: ['admin-suppliers'] });
  };
  const save = useMutation({ mutationFn: (values: SupplierRequest) => editing ? supplierService.update(editing.id, values) : supplierService.create(values), onSuccess: async (supplier) => {
    await saved(supplier); setEditing(undefined); messages.success('Đã lưu nhà cung cấp');
  } });
  const status = useMutation({ mutationFn: ({ id, value }: { id: number; value: Supplier['status'] }) => supplierService.updateStatus(id, value), onSuccess: saved });
  const toggle = async (supplier: Supplier, value: Supplier['status']) => {
    if (guard.current) return; guard.current = true;
    try { await status.mutateAsync({ id: supplier.id, value }); }
    catch (error) { messages.error(error instanceof Error ? error.message : 'Không thể đổi trạng thái'); }
    finally { guard.current = false; }
  };
  return <>{context}<AdminPageHeader title="Nhà cung cấp" subtitle="Đối tác phân phối chính hãng" actions={<Button type="primary" onClick={() => setEditing(null)}>Thêm nhà cung cấp</Button>} />
    <AdminCard><div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_auto]">
      <Input.Search aria-label="Tìm nhà cung cấp" placeholder="Tìm tên hoặc mã số thuế..." allowClear value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} onSearch={(value) => { setKeyword(value); setPage(1); }} />
      <Select aria-label="Lọc trạng thái NCC" placeholder="Tất cả trạng thái" allowClear value={stateFilter} onChange={(value) => { setStateFilter(value); setPage(1); }} options={['ACTIVE', 'INACTIVE'].map((value) => ({ value, label: value }))} />
      <Select aria-label="Sắp xếp NCC" value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[
        { value: 'NAME_ASC', label: 'Tên: A → Z' }, { value: 'NAME_DESC', label: 'Tên: Z → A' }, { value: 'CODE_ASC', label: 'Mã: A → Z' }, { value: 'CODE_DESC', label: 'Mã: Z → A' },
      ]} />
      <Button onClick={() => { setKeyword(''); setStateFilter(undefined); setSort('NAME_ASC'); setPage(1); }}>Đặt lại</Button>
    </div>
      {query.isError && <Alert type="error" title="Không tải được nhà cung cấp" action={<Button onClick={() => void query.refetch()}>Thử lại</Button>} />}
      <Table<Supplier> rowKey="id" loading={query.isPending} dataSource={rows} scroll={{ x: 1100 }} pagination={{ current: page, pageSize: 10, onChange: setPage }} columns={[
        { title: 'Mã NCC', dataIndex: 'code' }, { title: 'Tên công ty', dataIndex: 'name' },
        { title: 'Mã số thuế', dataIndex: 'taxCode', render: (value) => value || '—' },
        { title: 'Hotline', dataIndex: 'phone' }, { title: 'Email', dataIndex: 'email' }, { title: 'Địa chỉ', dataIndex: 'address' },
        { title: 'Trạng thái', dataIndex: 'status', render: (value) => <Tag color={value === 'ACTIVE' ? 'green' : 'default'}>{value}</Tag> },
        { title: 'Thao tác', align: 'right', render: (_, supplier) => <Space>
          <Tooltip title="Xem chi tiết"><Button aria-label={`Chi tiết ${supplier.code}`} icon={<EyeOutlined />} onClick={() => setDetailId(supplier.id)} /></Tooltip>
          <Tooltip title="Sửa nhà cung cấp"><Button aria-label={`Sửa ${supplier.code}`} icon={<EditOutlined />} disabled={status.isPending} onClick={() => setEditing(supplier)} /></Tooltip>
          <Popconfirm title="Ngừng hoạt động nhà cung cấp?" description="Nhà cung cấp sẽ không được chọn để lập/nhận PO mới. Lịch sử được giữ nguyên."
            disabled={supplier.status !== 'ACTIVE' || status.isPending} okText="Ngừng hoạt động" cancelText="Hủy" onConfirm={() => toggle(supplier, 'INACTIVE')}>
            <Switch aria-label={`Trạng thái ${supplier.code}`} checked={supplier.status === 'ACTIVE'} disabled={status.isPending} loading={status.isPending && status.variables?.id === supplier.id}
              onChange={(checked) => { if (checked) void toggle(supplier, 'ACTIVE'); }} />
          </Popconfirm>
        </Space> },
      ]} /></AdminCard>
      {editing !== undefined && <SupplierModal supplier={editing} onCancel={() => setEditing(undefined)} onSubmit={(values) => save.mutateAsync(values)} />}
      <Drawer open={detailId !== undefined} title="Chi tiết nhà cung cấp" onClose={() => setDetailId(undefined)}>
        {detail && <Descriptions column={1} items={[
          { key: 'code', label: 'Mã NCC', children: detail.code }, { key: 'name', label: 'Tên công ty', children: detail.name },
          { key: 'tax', label: 'Mã số thuế', children: detail.taxCode || '—' }, { key: 'phone', label: 'Hotline', children: detail.phone || '—' },
          { key: 'email', label: 'Email', children: detail.email || '—' }, { key: 'address', label: 'Địa chỉ', children: detail.address || '—' },
          { key: 'status', label: 'Trạng thái', children: <Tag color={detail.status === 'ACTIVE' ? 'green' : 'default'}>{detail.status}</Tag> },
        ]} />}
      </Drawer>
    </>;
}
