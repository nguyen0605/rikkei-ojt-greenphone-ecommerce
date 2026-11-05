import { AlertOutlined } from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';

export const LOW_STOCK_THRESHOLD = 5;

export default function LowStockAlertBadge({ stockQuantity }: { stockQuantity: number }) {
  if (stockQuantity > LOW_STOCK_THRESHOLD) return null;

  return (
    <Tooltip title={stockQuantity === 0 ? 'Biến thể đã hết hàng' : `Chỉ còn ${stockQuantity} máy`}>
      <Tag color="red" icon={<AlertOutlined />} className="motion-safe:animate-pulse font-medium">
        {stockQuantity === 0 ? 'Hết hàng' : 'Sắp hết'}
      </Tag>
    </Tooltip>
  );
}
