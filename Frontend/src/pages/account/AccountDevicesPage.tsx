import React, { useEffect, useState, useCallback } from 'react';
import { message, Spin } from 'antd';
import {
  SafetyCertificateOutlined,
  LogoutOutlined,
  ReloadOutlined,
  MobileOutlined,
} from '@ant-design/icons';
import { deviceService } from '@/services/deviceService';
import type { DeviceSessionDTO } from '@/types/api';
import DeviceItemCard from '@/components/account/DeviceItemCard';
import RevokeDeviceModal from '@/components/account/RevokeDeviceModal';

export const AccountDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<DeviceSessionDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [targetDevice, setTargetDevice] = useState<DeviceSessionDTO | null>(null);
  const [isRevokeAll, setIsRevokeAll] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchDevices = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await deviceService.getDevices();
      setDevices(Array.isArray(data) ? data : []);
      if (isSilent) {
        message.success('Đã làm mới danh sách thiết bị');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách thiết bị.';
      message.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Click single revoke
  const handleOpenRevokeSingle = (device: DeviceSessionDTO) => {
    setTargetDevice(device);
    setIsRevokeAll(false);
    setModalOpen(true);
  };

  // Click revoke all others
  const handleOpenRevokeAll = () => {
    setTargetDevice(null);
    setIsRevokeAll(true);
    setModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    if (actionLoading) return;
    setModalOpen(false);
    setTargetDevice(null);
  };

  // Confirm action in modal
  const handleConfirmRevoke = async () => {
    setActionLoading(true);
    try {
      if (isRevokeAll) {
        await deviceService.revokeOtherDevices();
        message.success('Đã đăng xuất khỏi tất cả các thiết bị khác thành công!');
      } else if (targetDevice) {
        await deviceService.revokeDevice(targetDevice.id);
        message.success('Đã đăng xuất thiết bị thành công!');
      }
      setModalOpen(false);
      setTargetDevice(null);
      // Cập nhật lại danh sách ngầm (không nháy màn hình)
      await fetchDevices(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thao tác không thành công. Vui lòng thử lại.';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const currentDevice = devices.find((d) => d.isCurrentSession);
  const otherDevices = devices.filter((d) => !d.isCurrentSession);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Thiết bị đăng nhập</h2>
            <SafetyCertificateOutlined className="text-emerald-600 text-lg" />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Theo dõi các phiên làm việc và quản lý quyền truy cập tài khoản từ xa
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => fetchDevices(true)}
            disabled={loading || refreshing}
            aria-label="Tải lại danh sách"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            <ReloadOutlined className={refreshing ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          {otherDevices.length > 0 && (
            <button
              type="button"
              onClick={handleOpenRevokeAll}
              disabled={loading || actionLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50"
            >
              <LogoutOutlined />
              <span>Đăng xuất tất cả thiết bị khác</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-8">
          <Spin size="large" />
          <p className="mt-4 text-sm text-gray-500">Đang tải danh sách thiết bị...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-400">
            <MobileOutlined className="text-2xl" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-gray-800">Chưa có thông tin thiết bị</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-sm">
            Hệ thống sẽ ghi nhận thiết bị khi bạn đăng nhập vào ứng dụng.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Thiết bị hiện tại */}
          {currentDevice && (
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                Thiết bị bạn đang sử dụng
              </div>
              <DeviceItemCard
                device={currentDevice}
                onRevoke={handleOpenRevokeSingle}
                isRevoking={actionLoading}
              />
            </div>
          )}

          {/* Các thiết bị khác */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Các thiết bị đăng nhập khác ({otherDevices.length})
              </span>
            </div>

            {otherDevices.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 text-center text-sm text-gray-500">
                Không có thiết bị nào khác đang đăng nhập tài khoản này.
              </div>
            ) : (
              <div className="space-y-3">
                {otherDevices.map((dev) => (
                  <DeviceItemCard
                    key={dev.id}
                    device={dev}
                    onRevoke={handleOpenRevokeSingle}
                    isRevoking={actionLoading && targetDevice?.id === dev.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <RevokeDeviceModal
        open={modalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmRevoke}
        device={targetDevice}
        isRevokeAll={isRevokeAll}
        loading={actionLoading}
      />
    </div>
  );
};

export default AccountDevicesPage;
