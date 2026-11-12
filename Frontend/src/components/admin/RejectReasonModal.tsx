import { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Tag } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import type { ReturnResponseDTO } from '@/types/api';

const { TextArea } = Input;

const REJECT_PRESETS = [
  'Thiết bị có dấu hiệu rơi vỡ / cấn móp do người dùng',
  'Thiết bị có dấu hiệu vào nước / ẩm mốc',
  'Không phát hiện lỗi phần cứng như mô tả',
  'Quá thời hạn đổi trả 7 ngày theo chính sách',
  'Thiết bị đã bị can thiệp phần cứng bên thứ ba',
];

interface RejectReasonModalProps {
  open: boolean;
  returnItem: ReturnResponseDTO | null;
  initialReason?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

/**
 * Modal bắt buộc nhập lý do từ chối tiếp nhận yêu cầu đổi trả / hoàn tiền.
 */
export default function RejectReasonModal({
  open,
  returnItem,
  initialReason = '',
  loading = false,
  onCancel,
  onConfirm,
}: RejectReasonModalProps) {
  const [reason, setReason] = useState(initialReason);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setReason(initialReason);
      setErrorMsg('');
    }
  }, [open, initialReason]);

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập lý do từ chối để thông báo tới khách hàng.');
      return;
    }
    setErrorMsg('');
    onConfirm(trimmed);
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <div className="flex items-center gap-2 text-red-600">
          <ExclamationCircleOutlined />
          <span>Từ chối tiếp nhận yêu cầu {returnItem?.returnCode || ''}</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onCancel} disabled={loading}>
            Quay lại
          </Button>
          <Button
            type="primary"
            danger
            loading={loading}
            onClick={handleSubmit}
            data-testid="confirm-reject-btn"
          >
            Xác nhận từ chối
          </Button>
        </div>
      }
      destroyOnHidden
      mask={{ closable: !loading }}
    >
      <div className="space-y-4 pt-2">
        <Alert
          type="warning"
          showIcon
          title="Bắt buộc cung cấp lý do rõ ràng"
          description="Lý do từ chối sẽ được lưu vào hồ sơ kỹ thuật và hiển thị trực tiếp cho khách hàng."
        />

        <div>
          <div className="mb-2 text-xs font-medium text-ink-2">Gợi ý lý do nhanh:</div>
          <div className="flex flex-wrap gap-1.5">
            {REJECT_PRESETS.map((preset) => (
              <Tag
                key={preset}
                color={reason.trim() === preset ? 'red' : 'default'}
                className="!cursor-pointer !rounded-full !px-2.5 !py-0.5 text-xs transition-colors hover:!border-red-400"
                onClick={() => {
                  setReason(preset);
                  setErrorMsg('');
                }}
              >
                {preset}
              </Tag>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="reject-reason-textarea"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Lý do từ chối <span className="text-red-500">*</span>
          </label>
          <TextArea
            id="reject-reason-textarea"
            rows={4}
            maxLength={255}
            showCount
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (errorMsg && e.target.value.trim()) {
                setErrorMsg('');
              }
            }}
            placeholder="Nhập kết quả kiểm tra và lý do từ chối (tối đa 255 ký tự)..."
            status={errorMsg ? 'error' : undefined}
          />
          {errorMsg && (
            <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
              {errorMsg}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

