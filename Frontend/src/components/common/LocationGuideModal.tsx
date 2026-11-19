import { useState } from 'react';
import { Modal, Button, Segmented } from 'antd';
import { Compass, RotateCw } from 'lucide-react';
import allowGuideImg from '@/assets/guide-allow-location.svg';
import unlockGuideImg from '@/assets/guide-unlock-location.svg';

export interface LocationGuideModalProps {
  open: boolean;
  onClose: () => void;
  onRetryLocate?: () => void;
}

export default function LocationGuideModal({
  open,
  onClose,
  onRetryLocate,
}: LocationGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'allow' | 'unlock'>('allow');

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('gp_auto_locate_on_reload', 'true');
      sessionStorage.setItem('gp_auto_open_address_modal', 'true');
      window.location.reload();
    }
  };

  const handleRetry = () => {
    onClose();
    if (onRetryLocate) {
      onRetryLocate();
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={520}
      title={
        <div className="flex items-center gap-2 text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          <Compass className="w-5 h-5 text-green-600" />
          <span>Hướng dẫn bật quyền vị trí</span>
        </div>
      }
    >
      <div className="py-2 space-y-3">
        {/* Tab switch between Allow prompt and Unlock lock icon */}
        <div className="flex justify-center">
          <Segmented
            value={activeTab}
            onChange={(val) => setActiveTab(val as 'allow' | 'unlock')}
            options={[
              { label: 'Bấm Allow khi hỏi', value: 'allow' },
              { label: 'Mở lại ở Ổ khóa nếu đã chặn', value: 'unlock' },
            ]}
            className="bg-gray-100 p-1 rounded-xl text-xs font-medium"
          />
        </div>

        {/* Visual Guide Image with Red Box & Red Arrow */}
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-slate-100 shadow-sm">
          {activeTab === 'allow' ? (
            <img
              src={allowGuideImg}
              alt="Hướng dẫn bấm Allow để cấp quyền vị trí"
              className="w-full h-auto block"
            />
          ) : (
            <img
              src={unlockGuideImg}
              alt="Hướng dẫn mở quyền vị trí ở biểu tượng ổ khóa"
              className="w-full h-auto block"
            />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
          <Button onClick={onClose} className="!rounded-xl text-xs">
            Đóng
          </Button>
          <Button
            icon={<RotateCw className="w-3.5 h-3.5" />}
            onClick={handleReload}
            className="!rounded-xl text-xs"
          >
            Tải lại trang (F5)
          </Button>
          <Button
            type="primary"
            onClick={handleRetry}
            className="!rounded-xl !bg-green-600 hover:!bg-green-700 text-xs font-semibold"
          >
            Tôi đã bật, định vị ngay
          </Button>
        </div>
      </div>
    </Modal>
  );
}
