import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Space, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { warehouseInventoryService, type WarehouseStock } from '@/services/warehouseService';
import LowStockAlertBadge from '@/components/admin/LowStockAlertBadge';

export default function VariantWarehouseStock({ variantId, stocks }: { variantId: number; stocks?: WarehouseStock[] | null }) {
  // The unfiltered variants API serializes this optional field as null.
  // An explicit [] is instead an authoritative (empty) filtered result.
  const scopedStocks = stocks ?? undefined;
  const query = useQuery({ queryKey: ['warehouse-distribution', variantId], queryFn: () => warehouseInventoryService.distribution(variantId), enabled: scopedStocks === undefined, staleTime: 30_000 });
  if (scopedStocks === undefined && query.isError) return <Alert type="error" title="Không thể tải phân bổ tồn kho" action={<Button onClick={() => void query.refetch()}>Thử lại</Button>} />;
  return <Table<WarehouseStock> size="small" rowKey="warehouseId" loading={scopedStocks === undefined && query.isPending} dataSource={scopedStocks ?? query.data ?? []}
    pagination={false} locale={{ emptyText: 'Không có dữ liệu tồn kho chi nhánh trong phạm vi hiện tại' }} columns={[
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
