import React from 'react';
import { Modal } from 'antd';
import {
  Clock,
  Search,
  Wrench,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { ReturnResponse } from '@/services/returnService';
import { formatVND } from '@/utils';

interface ClaimProgressModalProps {
  open: boolean;
  onClose: () => void;
  returnRequest: ReturnResponse | null;
}

export const ClaimProgressModal: React.FC<ClaimProgressModalProps> = ({
  open,
  onClose,
  returnRequest,
}) => {
  if (!returnRequest) return null;

  // Lộ trình 4 bước chuẩn
  // 1: Tiếp nhận -> 2: Thẩm định kỹ thuật -> 3: Đang xử lý -> 4: Hoàn tất
  const getStepIndex = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 1; // Đã tiếp nhận, chờ thẩm định
      case 'APPROVED':
        return 3; // Đã thẩm định xong, đang xử lý đổi kho/hoàn tiền
      case 'COMPLETED':
        return 4; // Hoàn tất
      case 'REJECTED':
        return -1; // Bị từ chối
      default:
        return 1;
    }
  };

  const currentStep = getStepIndex(returnRequest.status);
  const isRejected = returnRequest.status === 'REJECTED';

  const steps = [
    { title: 'Tiếp nhận', desc: 'Đã nhận yêu cầu', icon: FileText },
    { title: 'Thẩm định', desc: 'Kỹ thuật kiểm tra', icon: Search },
    { title: 'Đang xử lý', desc: returnRequest.type === 'REFUND' ? 'Hoàn tiền' : 'Đổi máy mới', icon: Wrench },
    { title: 'Hoàn tất', desc: 'Giao dịch thành công', icon: CheckCircle2 },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={620}
      destroyOnHidden
      className="custom-claim-modal"
    >
      <div className="py-2 space-y-6">
        {/* Header */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-semibold text-emerald-700 border border-emerald-200">
              {returnRequest.returnCode}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(returnRequest.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold text-gray-900">
            Tiến độ xử lý {returnRequest.type === 'REFUND' ? 'Hoàn tiền' : 'Đổi mới 1 - 1'}
          </h3>
          <p className="text-xs text-gray-500">
            Sản phẩm: <span className="font-semibold text-gray-700">{returnRequest.phoneName || 'Thiết bị'}</span> ({returnRequest.variantSku || 'Biến thể'})
          </p>
        </div>

        {/* Thanh trạng thái tiến trình (Timeline Stepper) */}
        {!isRejected ? (
          <div className="relative py-2">
            <div className="grid grid-cols-4 gap-2 text-center">
              {steps.map((step, idx) => {
                const stepNum = idx + 1;
                const isPassed = currentStep > stepNum;
                const isCurrent = currentStep === stepNum;
                const StepIcon = step.icon;

                return (
                  <div key={step.title} className="flex flex-col items-center relative">
                    {/* Đường nối giữa các bước */}
                    {idx < steps.length - 1 && (
                      <div
                        className={`absolute top-4 left-1/2 w-full h-1 -z-10 transition-colors ${
                          currentStep > stepNum ? 'bg-emerald-500' : 'bg-gray-200'
                        }`}
                      />
                    )}

                    {/* Vòng tròn biểu tượng */}
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                            ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                            : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}
                    >
                      <StepIcon className="h-4 w-4" />
                    </div>

                    {/* Nội dung bước */}
                    <div className="mt-2">
                      <div
                        className={`text-xs font-bold ${
                          isCurrent
                            ? 'text-emerald-700'
                            : isPassed
                              ? 'text-gray-800'
                              : 'text-gray-400'
                        }`}
                      >
                        {step.title}
                      </div>
                      <div className="mt-0.5 text-[10px] text-gray-500 line-clamp-1">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900">Yêu cầu đổi trả đã bị từ chối</h4>
              <p className="mt-1 text-xs text-red-700">
                {returnRequest.adminNote || 'Thiết bị không đáp ứng đủ điều kiện chính sách đổi trả hoặc đã quá thời hạn quy định.'}
              </p>
            </div>
          </div>
        )}

        {/* Thông tin chi tiết */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Lý do đổi trả:</span>
            <span className="font-semibold text-gray-800">{returnRequest.reason}</span>
          </div>
          <div className="flex justify-between items-start gap-4">
            <span className="text-gray-500 shrink-0">Mô tả lỗi:</span>
            <span className="text-gray-700 text-right">{returnRequest.errorDescription}</span>
          </div>
          {returnRequest.type === 'REFUND' && (
            <div className="flex justify-between border-t border-gray-200/60 pt-2 font-semibold">
              <span className="text-gray-600">Số tiền hoàn dự kiến:</span>
              <span className="text-red-600 font-bold">{formatVND(returnRequest.refundAmount || 0)}</span>
            </div>
          )}
          {returnRequest.adminNote && (
            <div className="flex justify-between border-t border-gray-200/60 pt-2">
              <span className="text-gray-500 shrink-0">Ghi chú từ quản trị viên:</span>
              <span className="text-emerald-700 font-medium text-right">{returnRequest.adminNote}</span>
            </div>
          )}
        </div>

        {/* Danh sách ảnh bằng chứng */}
        {returnRequest.proofImages && returnRequest.proofImages.length > 0 && (
          <div>
            <h5 className="text-xs font-bold text-gray-700 mb-2">Ảnh minh chứng lỗi:</h5>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {returnRequest.proofImages.map((img, i) => (
                <a
                  key={i}
                  href={img}
                  target="_blank"
                  rel="noreferrer"
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                >
                  <img src={img} alt={`Proof ${i}`} className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Nút đóng */}
        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ClaimProgressModal;

