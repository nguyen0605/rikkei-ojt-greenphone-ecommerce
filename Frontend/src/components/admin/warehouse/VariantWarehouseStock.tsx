import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Space, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { warehouseInventoryService, type WarehouseStock } from '@/services/warehouseService';
import LowStockAlertBadge from '@/components/admin/LowStockAlertBadge';

export default function VariantWarehouseStock({ variantId, stocks }: { variantId: number; stocks?: WarehouseStock[] }) {
  const query = useQuery({ queryKey: ['warehouse-distribution', variantId], queryFn: () => warehouseInventoryService.distribution(variantId), enabled: stocks === undefined });
  if (stocks === undefined && query.isError) return <Alert type="error" title="Không thể tải phân bổ tồn kho" action={<Button onClick={() => void query.refetch()}>Thử lại</Button>} />;
  return <Table<WarehouseStock> size="small" rowKey="warehouseId" loading={stocks === undefined && query.isPending} dataSource={stocks ?? query.data ?? []}
    pagination={false} columns={[
      { title: 'Chi nhánh', render: (_, row) => <Link to={`/admin/warehouses/${row.warehouseId}`}>{row.warehouseName}</Link> },
      { title: 'Mã kho', dataIndex: 'warehouseCode' },
      { title: 'Trạng thái', dataIndex: 'warehouseStatus', render: (status: string) => <Tag color={status === 'ACTIVE' ? 'green' : undefined}>{status}</Tag> },
      {
        title: 'Số lượng',
        dataIndex: 'quantity',
        align: 'right',
        render: (quantity: number) => (
          <Space size={6}>
            <span className="font-semibold">{quantity}</span>
            <LowStockAlertBadge stockQuantity={quantity} />
          </Space>
        ),
      },
    ]} />;
}
