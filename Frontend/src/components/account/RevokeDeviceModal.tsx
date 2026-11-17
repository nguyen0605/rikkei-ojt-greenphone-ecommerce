import React from 'react';
import { Modal } from 'antd';
import { WarningFilled, LoadingOutlined } from '@ant-design/icons';
import type { DeviceSessionDTO } from '@/types/api';

interface RevokeDeviceModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  device?: DeviceSessionDTO | null;
  isRevokeAll?: boolean;
  loading?: boolean;
}

export const RevokeDeviceModal: React.FC<RevokeDeviceModalProps> = ({
  open,
  onClose,
  onConfirm,
  device,
  isRevokeAll = false,
  loading = false,
}) => {
  const title = isRevokeAll
    ? 'Đăng xuất tất cả thiết bị khác?'
    : 'Đăng xuất khỏi thiết bị này?';

  const description = isRevokeAll
    ? 'Thao tác này sẽ đăng xuất phiên làm việc của tài khoản trên tất cả các thiết bị khác. Chỉ có phiên làm việc trên thiết bị hiện tại của bạn được giữ lại.'
    : `Bạn có chắc chắn muốn đăng xuất phiên làm việc trên ${
        device?.deviceName || device?.os || 'thiết bị này'
      }? Thiết bị sẽ không thể tiếp tục truy cập vào tài khoản trừ khi đăng nhập lại.`;

  return (
    <Modal
      open={open}
      onCancel={loading ? undefined : onClose}
      footer={null}
      centered
      destroyOnHidden
      width={460}
      className="rounded-2xl overflow-hidden"
    >
      <div className="p-2 sm:p-4 text-center">
        {/* Warning Icon badge */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
          <WarningFilled className="text-2xl" />
        </div>

        <h3 className="text-lg font-bold text-gray-900">{title}</h3>

        <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>

        {device && !isRevokeAll && (
          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-left border border-gray-100">
            <div className="text-xs font-semibold text-gray-700">
              {device.deviceName || `${device.os} • ${device.browser}`}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {device.ipAddress ? `Địa chỉ IP: ${device.ipAddress} • ` : ''}
              Hệ điều hành: {device.os}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-60 sm:w-auto"
          >
            {loading && <LoadingOutlined className="text-sm" />}
            <span>{isRevokeAll ? 'Đăng xuất tất cả khác' : 'Đăng xuất ngay'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RevokeDeviceModal;
