import React from 'react';
import {
  LaptopOutlined,
  MobileOutlined,
  TabletOutlined,
  CheckCircleFilled,
  GlobalOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import type { DeviceSessionDTO } from '@/types/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

interface DeviceItemCardProps {
  device: DeviceSessionDTO;
  onRevoke: (device: DeviceSessionDTO) => void;
  isRevoking?: boolean;
}

export const DeviceItemCard: React.FC<DeviceItemCardProps> = ({
  device,
  onRevoke,
  isRevoking = false,
}) => {
  const getDeviceIcon = () => {
    const osLower = (device.os || '').toLowerCase();
    const devLower = (device.deviceName || '').toLowerCase();

    if (osLower.includes('ios') || osLower.includes('android') || devLower.includes('phone') || devLower.includes('iphone')) {
      if (devLower.includes('ipad') || devLower.includes('tablet')) {
        return <TabletOutlined className="text-2xl text-blue-600" />;
      }
      return <MobileOutlined className="text-2xl text-emerald-600" />;
    }
    return <LaptopOutlined className="text-2xl text-indigo-600" />;
  };

  const formatLastActive = (dateString?: string) => {
    if (!dateString) return 'Vừa mới đây';
    const date = dayjs(dateString);
    if (!date.isValid()) return dateString;

    const diffMinutes = dayjs().diff(date, 'minute');
    if (diffMinutes < 5) {
      return 'Đang hoạt động';
    }
    return `Hoạt động ${date.fromNow()}`;
  };

  const isCurrent = device.isCurrentSession;

  return (
    <div
      className={`relative rounded-2xl p-5 transition-all duration-200 ${
        isCurrent
          ? 'border-2 border-emerald-500 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-500/20'
          : 'border border-gray-100 bg-white shadow-sm hover:border-gray-200 hover:shadow-md'
      }`}
      data-testid={`device-card-${device.id}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Device Information */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              isCurrent ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {getDeviceIcon()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {device.deviceName || `${device.os} • ${device.browser}`}
              </h3>

              {isCurrent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  <CheckCircleFilled className="text-xs" />
                  Thiết bị này
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span>{device.os || 'Hệ điều hành không xác định'}</span>
                <span>•</span>
                <span>{device.browser || 'Trình duyệt không xác định'}</span>
              </span>

              {device.ipAddress && (
                <span className="flex items-center gap-1">
                  <GlobalOutlined className="text-gray-400" />
                  <span>IP: {device.ipAddress}</span>
                </span>
              )}

              <span className="flex items-center gap-1">
                <ClockCircleOutlined className="text-gray-400" />
                <span className={isCurrent ? 'font-medium text-emerald-700' : ''}>
                  {isCurrent ? 'Đang hoạt động' : formatLastActive(device.lastActiveAt)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Button: Chỉ hiển thị cho các thiết bị khác, cấm hiển thị trên thiết bị hiện tại */}
        {!isCurrent && (
          <div className="shrink-0 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={() => onRevoke(device)}
              disabled={isRevoking}
              aria-label={`Đăng xuất ${device.deviceName || device.os}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 active:bg-rose-100 disabled:opacity-50 sm:w-auto"
            >
              <LogoutOutlined />
              <span>Đăng xuất thiết bị</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceItemCard;
