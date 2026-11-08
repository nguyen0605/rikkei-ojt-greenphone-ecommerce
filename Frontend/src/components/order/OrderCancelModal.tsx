import React, { useState } from 'react';
import { Modal, Select, Input, Alert, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';

export interface OrderCancelModalProps {
  orderId: number | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CANCEL_REASONS = [
  'Tôi muốn đổi sản phẩm hoặc màu sắc khác',
  'Tôi muốn thay đổi địa chỉ nhận hàng',
  'Thời gian giao hàng dự kiến quá lâu',
  'Tìm thấy giá tốt hơn ở nơi khác',
  'Đặt nhầm đơn hàng',
  'Lý do khác',
];

export const OrderCancelModal: React.FC<OrderCancelModalProps> = ({
  orderId,
  open,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const qc = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      return orderService.cancel(id);
    },
    onSuccess: () => {
      message.success(`Đã hủy đơn hàng #${orderId} thành công`);
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) {
        qc.invalidateQueries({ queryKey: ['order', String(orderId)] });
        qc.invalidateQueries({ queryKey: ['order', orderId] });
      }
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { message?: string })?.message ||
        'Không thể hủy đơn hàng do trạng thái đơn đã thay đổi.';
      message.error(errorMsg);
    },
  });

  const handleConfirmCancel = () => {
    if (!orderId || cancelMutation.isPending) return;
    cancelMutation.mutate(orderId);
  };

  return (
    <Modal
      title={
        <div className="text-base font-bold text-gray-900">
          Xác nhận hủy đơn hàng #{orderId}
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={handleConfirmCancel}
      okText={cancelMutation.isPending ? 'Đang xử lý...' : 'Xác nhận hủy đơn'}
      cancelText="Giữ lại đơn hàng"
      okButtonProps={{
        danger: true,
        loading: cancelMutation.isPending,
        disabled: cancelMutation.isPending,
      }}
      destroyOnHidden
    >
      <div className="space-y-4 py-3">
        <p className="text-sm text-gray-600">
          Bạn có chắc chắn muốn hủy đơn hàng này không? Xin vui lòng chọn lý do để giúp GreenPhone cải thiện dịch vụ:
        </p>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            Lý do hủy đơn <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedReason}
            onChange={(val) => setSelectedReason(val)}
            className="w-full"
            options={CANCEL_REASONS.map((r) => ({ label: r, value: r }))}
          />
        </div>

        {selectedReason === 'Lý do khác' && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Chi tiết lý do
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Nhập lý do cụ thể của bạn..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              maxLength={200}
              showCount
            />
          </div>
        )}

        <Alert
          type="warning"
          showIcon
          message="Lưu ý quan trọng"
          description="Khi hủy đơn hàng, toàn bộ số lượng điện thoại đã đặt và mã ưu đãi Voucher (nếu có) sẽ được khôi phục tự động về tài khoản của bạn."
          className="text-xs"
        />
      </div>
    </Modal>
  );
};

export default OrderCancelModal;
