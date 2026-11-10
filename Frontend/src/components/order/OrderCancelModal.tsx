import React, { useState } from 'react';
import { Modal, Select, Input, Alert, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/orderService';

export interface OrderCancelModalProps {
  orderId: number | null;
  paymentStatus?: string;
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
  paymentStatus,
  open,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');
  const qc = useQueryClient();

  const isPaidOnline = paymentStatus === 'PAID';

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const finalReason = selectedReason === 'Lý do khác' ? customReason.trim() : selectedReason;
      return orderService.cancel(id, {
        reason: finalReason,
        bankName: isPaidOnline ? bankName.trim() : undefined,
        accountNumber: isPaidOnline ? accountNumber.trim() : undefined,
        accountHolder: isPaidOnline ? accountHolder.trim().toUpperCase() : undefined,
      });
    },
    onSuccess: () => {
      if (isPaidOnline) {
        message.success(`Đã hủy đơn #${orderId} và gửi yêu cầu hoàn tiền thành công. GreenPhone sẽ xử lý hoàn trả tiền sớm nhất cho bạn.`);
      } else {
        message.success(`Đã hủy đơn hàng #${orderId} thành công`);
      }
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
    if (isPaidOnline) {
      if (selectedReason === 'Lý do khác' && !customReason.trim()) {
        message.warning('Đối với đơn hàng đã thanh toán, vui lòng nhập chi tiết lý do hủy đơn');
        return;
      }
      if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
        message.warning('Vui lòng nhập đầy đủ thông tin Ngân hàng, Số tài khoản và Tên chủ thẻ để nhận tiền hoàn');
        return;
      }
    }
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
              Chi tiết lý do {isPaidOnline && <span className="text-red-500">*</span>}
            </label>
            <Input.TextArea
              rows={3}
              placeholder={
                isPaidOnline
                  ? 'Vui lòng nhập chi tiết lý do hủy đơn (bắt buộc đối với đơn đã thanh toán)...'
                  : 'Nhập lý do cụ thể của bạn...'
              }
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              maxLength={200}
              showCount
              status={isPaidOnline && !customReason.trim() ? 'warning' : ''}
            />
            {isPaidOnline && !customReason.trim() && (
              <p className="mt-1 text-[11px] text-amber-600">
                * Bắt buộc nhập chi tiết lý do đối với đơn hàng đã thanh toán để đối soát hoàn tiền.
              </p>
            )}
          </div>
        )}

        {isPaidOnline && (
          <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-3 space-y-3">
            <div className="text-xs font-semibold text-orange-900 flex items-center gap-1.5">
              <span>💳 Thông tin tài khoản nhận tiền hoàn (Đơn đã thanh toán online)</span>
            </div>
            <p className="text-[11px] text-orange-700">
              Đơn hàng này đã thanh toán chuyển khoản. GreenPhone sẽ hoàn tiền vào tài khoản ngân hàng của bạn trong vòng 24h làm việc.
            </p>
            <div className="space-y-2">
              <div>
                <label className="mb-0.5 block text-[11px] font-medium text-gray-700">
                  Ngân hàng <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ví dụ: MB Bank, Vietcombank, Techcombank..."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  size="small"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] font-medium text-gray-700">
                  Số tài khoản <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Nhập số tài khoản ngân hàng nhận tiền"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  size="small"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[11px] font-medium text-gray-700">
                  Tên chủ tài khoản <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Nhập tên chủ tài khoản (VIẾT HOA KHÔNG DẤU)"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  size="small"
                />
              </div>
            </div>
          </div>
        )}

        <Alert
          type="warning"
          showIcon
          message="Lưu ý quan trọng"
          description={
            isPaidOnline
              ? "Khi xác nhận hủy, số lượng sản phẩm và voucher sẽ được hoàn lại, yêu cầu hoàn tiền sẽ được gửi tới bộ phận kế toán để chuyển khoản lại cho bạn."
              : "Khi hủy đơn hàng, toàn bộ số lượng điện thoại đã đặt và mã ưu đãi Voucher (nếu có) sẽ được khôi phục tự động về tài khoản của bạn."
          }
          className="text-xs"
        />
      </div>
    </Modal>
  );
};

export default OrderCancelModal;
