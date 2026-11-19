import type { ReactNode } from 'react';
import { Button, Tooltip, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { useState } from 'react';

/* Hallmark · Workbench page-header pattern (design.md):
 * title + subtitle left, actions right. Pill primary CTA. */

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  // Bật/tắt nút làm mới tự động trên header (mặc định là true)
  showRefresh?: boolean;
  // Callback làm mới tùy biến (nếu không truyền sẽ tự động refetch toàn bộ query đang active của trang)
  onRefresh?: () => Promise<void> | void;
}

export default function AdminPageHeader({ title, subtitle, actions, showRefresh = true, onRefresh }: Props) {
  const queryClient = useQueryClient();
  const isFetchingCount = useIsFetching();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Xử lý làm mới dữ liệu cho trang
  const handleReload = async () => {
    try {
      setIsRefreshing(true);
      if (onRefresh) {
        await onRefresh();
      } else {
        await queryClient.refetchQueries({ type: 'active' });
      }
      message.success(`Đã làm mới dữ liệu ${title.toLowerCase()}`);
    } catch {
      message.error('Không thể làm mới dữ liệu, vui lòng thử lại');
    } finally {
      setIsRefreshing(false);
    }
  };

  const isBusy = isRefreshing || isFetchingCount > 0;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {showRefresh && (
          <Tooltip title="Làm mới dữ liệu trang này">
            <Button
              icon={<ReloadOutlined spin={isBusy} />}
              onClick={handleReload}
              loading={isBusy}
              className="!rounded-full hover:!border-primary-500 hover:!text-primary-600 shadow-2xs"
            >
              Làm mới
            </Button>
          </Tooltip>
        )}
        {actions}
      </div>
    </div>
  );
}
