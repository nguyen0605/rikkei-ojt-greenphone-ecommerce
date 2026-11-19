import { useEffect, useState } from 'react';
import { Modal, Button } from 'antd';
import { ShieldAlert, Mail, Phone, Home } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';

interface BlockedEventDetail {
  code: string;
  message: string;
  reason: string;
  supportEmail: string;
  supportHotline: string;
}

export default function BlockedAccountModal() {
  const dispatch = useAppDispatch();
  const [blockedData, setBlockedData] = useState<BlockedEventDetail | null>(null);

  useEffect(() => {
    const handleAccountBlocked = (event: Event) => {
      const customEvent = event as CustomEvent<BlockedEventDetail>;
      if (customEvent.detail) {
        setBlockedData(customEvent.detail);
        dispatch(logout());
      }
    };

    window.addEventListener('greenphone:account-blocked', handleAccountBlocked);
    return () => {
      window.removeEventListener('greenphone:account-blocked', handleAccountBlocked);
    };
  }, [dispatch]);

  if (!blockedData) return null;

  const handleGoHome = () => {
    setBlockedData(null);
    window.location.href = '/';
  };

  const supportEmail = blockedData.supportEmail || 'hotro@greenphone.com';
  const supportHotline = blockedData.supportHotline || '1900 1234';

  return (
    <Modal
      open={true}
      closable={false}
      maskClosable={false}
      keyboard={false}
      centered
      width={520}
      title={
        <div className="flex items-center gap-2.5 text-red-600 font-bold text-lg border-b pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <span>Thông báo khóa tài khoản</span>
        </div>
      }
      footer={[
        <div key="actions" className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end pt-2">
          <Button
            key="home"
            size="large"
            icon={<Home className="h-4 w-4" />}
            onClick={handleGoHome}
            className="!rounded-xl !h-10 font-medium"
          >
            Về trang chủ
          </Button>
          <a
            key="support"
            href={`mailto:${supportEmail}?subject=${encodeURIComponent('Yêu cầu khiếu nại tài khoản bị khóa - GreenPhone')}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 h-10 transition-colors"
          >
            <Mail className="h-4 w-4" />
            <span>Liên hệ hỗ trợ</span>
          </a>
        </div>,
      ]}
    >
      <div className="py-4 space-y-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          Tài khoản của bạn đã bị <strong>tạm ngưng / khóa quyền truy cập</strong> bởi Quản trị viên hệ thống.
        </p>

        {/* Khung hiển thị lý do cụ thể do Admin vừa nhập */}
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4">
          <div className="text-xs font-bold text-red-800 uppercase tracking-wide mb-1">
            Lý do khóa tài khoản:
          </div>
          <div className="text-sm font-semibold text-red-900 leading-relaxed">
            {blockedData.reason}
          </div>
        </div>

        {/* Thông điệp hướng dẫn */}
        <p className="text-sm text-gray-600 leading-relaxed">
          Chúng tôi đã gửi thông báo chi tiết và hướng dẫn giải quyết tới email của bạn. Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ bộ phận hỗ trợ.
        </p>

        {/* Thông tin liên hệ nhanh */}
        <div className="rounded-xl bg-gray-50 p-3.5 text-xs text-gray-600 space-y-1.5 border border-gray-100">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span>Email hỗ trợ: <strong className="text-gray-800">{supportEmail}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span>Hotline khiếu nại: <strong className="text-gray-800">{supportHotline}</strong> (8:00 - 21:00)</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
