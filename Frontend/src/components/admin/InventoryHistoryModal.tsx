import { Alert, Modal, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { adminInventoryService } from '@/services';
import type { InventoryHistoryItemDTO, PhoneVariantDTO } from '@/types/api';

const typeLabel: Record<InventoryHistoryItemDTO['changeType'], string> = {
  IMPORT: 'Nhập kho',
  EXPORT: 'Xuất kho',
  ADJUSTMENT: 'Điều chỉnh',
};

const columns: TableColumnsType<InventoryHistoryItemDTO> = [
  { title: 'Thời gian', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString('vi-VN') },
  {
    title: 'Loại biến động', dataIndex: 'changeType', render: (value: InventoryHistoryItemDTO['changeType']) => (
      <Tag color={value === 'IMPORT' ? 'green' : value === 'EXPORT' ? 'orange' : 'blue'}>{typeLabel[value]}</Tag>
    ),
  },
  { title: 'Trước đó', dataIndex: 'quantityBefore', align: 'right' },
  {
    title: 'Thay đổi', dataIndex: 'quantityChange', align: 'right', render: (value: number) => (
      <span className={value >= 0 ? 'font-semibold text-green-600' : 'font-semibold text-orange-600'}>{value > 0 ? `+${value}` : value}</span>
    ),
  },
  { title: 'Sau đó', dataIndex: 'quantityAfter', align: 'right' },
  { title: 'Lý do', dataIndex: 'reason' },
  { title: 'Người thực hiện', dataIndex: 'changedByName', render: (value: string) => <span className="font-medium text-ink">{value}</span> },
];

interface InventoryHistoryModalProps {
  variant: PhoneVariantDTO | null;
  open: boolean;
  onClose: () => void;
}

export default function InventoryHistoryModal({ variant, open, onClose }: InventoryHistoryModalProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-inventory-history', variant?.id],
    queryFn: () => adminInventoryService.history(variant!.id),
    enabled: open && !!variant,
  });

  return (
    <Modal
      title={`Lịch sử kho — ${variant?.ram || ''} ${variant?.storage || ''} ${variant?.color || ''}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={1050}
    >
      {isError && <Alert type="error" showIcon title="Không thể tải lịch sử tồn kho" className="mb-4" />}
      <div className="mb-4 rounded-xl bg-bg-soft px-4 py-3 text-sm">
        Tồn kho hiện tại: <strong className="text-primary-600">{data?.currentStock ?? '—'}</strong> máy
      </div>
      <Table<InventoryHistoryItemDTO>
        rowKey="id"
        columns={columns}
        dataSource={data?.entries || []}
        loading={isLoading}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        locale={{ emptyText: 'Chưa có lịch sử biến động' }}
        scroll={{ x: 900 }}
        size="small"
      />
    </Modal>
  );
}
