import { Alert, Button, Descriptions, Drawer, Popconfirm, Space, Table, Tag, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { formatProcurementVnd, purchaseOrderService, type PurchaseOrder, type PurchaseOrderItem } from '@/services/purchaseOrderService';
import { warehouseInventoryService } from '@/services/warehouseService';

export const receiveWarning = 'Thao tác này sẽ tự động cộng dồn số lượng vào tồn kho thực tế và không thể hoàn tác!';

function SkuProductCell({ item }: { item: PurchaseOrderItem }) {
  const dist = useQuery({
    queryKey: ['warehouse-distribution', item.variantId],
    queryFn: () => warehouseInventoryService.distribution(item.variantId),
    enabled: !!item.variantId && item.variantId > 0,
    staleTime: 60_000,
  });

  const first = dist.data?.[0];
  const info = first
    ? `${first.productName} (${first.ram} / ${first.storage} · ${first.color})`
    : null;

  return (
    <div>
      <div className="flex items-center gap-1.5 font-mono font-medium text-ink">
        <span>{item.sku}</span>
        {info && (
          <Tooltip title={`Sản phẩm: ${info}`}>
            <InfoCircleOutlined className="cursor-pointer text-xs text-primary-600" />
          </Tooltip>
        )}
      </div>
      {info ? (
        <div className="text-xs text-gray-500 line-clamp-1">{info}</div>
      ) : (
        <div className="text-[11px] text-gray-400">SKU: {item.sku}</div>
      )}
    </div>
  );
}
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
      <Table<PurchaseOrderItem> rowKey="id" dataSource={po.items} pagination={false} size="small" scroll={{ x: 650 }} columns={[
        {
          title: 'Sản phẩm & SKU',
          dataIndex: 'sku',
          width: 260,
          render: (_, item) => <SkuProductCell item={item} />,
        },
        { title: 'Đặt', dataIndex: 'quantityOrdered', align: 'right', width: 70 },
        { title: 'Đã nhận', dataIndex: 'quantityReceived', align: 'right', width: 80 },
        { title: 'Đơn giá', dataIndex: 'unitCost', align: 'right', render: formatProcurementVnd, width: 120 },
        { title: 'Thành tiền', align: 'right', render: (_, item) => formatProcurementVnd(item.quantityOrdered * item.unitCost), width: 130 },
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
