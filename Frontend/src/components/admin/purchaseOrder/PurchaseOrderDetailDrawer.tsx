import { Alert, Button, Descriptions, Drawer, Popconfirm, Space, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { formatProcurementVnd, purchaseOrderService, type PurchaseOrder, type PurchaseOrderItem } from '@/services/purchaseOrderService';
export const receiveWarning = 'Thao tác này sẽ tự động cộng dồn số lượng vào tồn kho thực tế và không thể hoàn tác!';
export default function PurchaseOrderDetailDrawer({ id, pending, error, onClose, onAction, onEdit }: {
  id: number; pending: boolean; error?: string; onClose: () => void; onAction: (action: 'receive' | 'order' | 'cancel') => void; onEdit: (po: PurchaseOrder) => void;
}) {
  const query = useQuery({ queryKey: ['purchase-order', id], queryFn: () => purchaseOrderService.get(id) });
  const po = query.data;
  return <Drawer open size="large" title={po?.poNumber ?? 'Chi tiết đơn nhập hàng'} onClose={onClose} closable={!pending} mask={{ closable: !pending }}>
    {query.isError && <Alert type="error" title="Không tải được đơn nhập hàng" action={<Button onClick={() => void query.refetch()}>Thử lại</Button>} />}
    {error && <Alert type="error" title={error} className="mb-4" />}
    {po && <><Descriptions column={1} items={[
      { key: 'supplier', label: 'Nhà cung cấp', children: po.supplierName }, { key: 'warehouse', label: 'Kho nhận', children: po.warehouseName },
      { key: 'status', label: 'Trạng thái', children: <Tag color={po.status === 'RECEIVED' ? 'green' : 'blue'}>{po.status}</Tag> },
      { key: 'total', label: 'Tổng tiền nhập', children: formatProcurementVnd(po.totalCost) }, { key: 'note', label: 'Ghi chú', children: po.note || '—' },
    ]} />
      <Table<PurchaseOrderItem> rowKey="id" dataSource={po.items} pagination={false} size="small" scroll={{ x: 550 }} columns={[
        { title: 'SKU', dataIndex: 'sku' }, { title: 'Đặt', dataIndex: 'quantityOrdered', align: 'right' },
        { title: 'Đã nhận', dataIndex: 'quantityReceived', align: 'right' },
        { title: 'Đơn giá', dataIndex: 'unitCost', align: 'right', render: formatProcurementVnd },
        { title: 'Thành tiền', align: 'right', render: (_, item) => formatProcurementVnd(item.quantityOrdered * item.unitCost) },
      ]} />
      <Space className="mt-5" wrap>
        {po.status === 'DRAFT' && <Button disabled={pending} onClick={() => onEdit(po)}>Sửa PO nháp</Button>}
        {po.status === 'ORDERED' && <Popconfirm title="Xác nhận nhận hàng" description={receiveWarning} okText="Xác nhận nhận hàng" cancelText="Hủy" onConfirm={() => onAction('receive')} disabled={pending}>
          <Button aria-label="Nhận Hàng Vào Kho" type="primary" loading={pending} disabled={pending}>Nhận Hàng Vào Kho</Button>
        </Popconfirm>}
        {po.status === 'DRAFT' && <Button type="primary" loading={pending} disabled={pending} onClick={() => onAction('order')}>Đặt hàng</Button>}
        {(['DRAFT', 'ORDERED'] as string[]).includes(po.status) && <Popconfirm title="Hủy đơn nhập hàng?" okText="Hủy đơn" cancelText="Quay lại" onConfirm={() => onAction('cancel')} disabled={pending}>
          <Button danger disabled={pending}>Hủy PO</Button>
        </Popconfirm>}
      </Space>
    </>}
  </Drawer>;
}
