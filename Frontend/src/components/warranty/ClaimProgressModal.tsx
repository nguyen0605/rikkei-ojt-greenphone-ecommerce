import React from 'react';
import { Modal, Tag, Image } from 'antd';
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
  ShoppingBag,
  ExternalLink,
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
      width={640}
      destroyOnHidden
      className="custom-claim-modal [&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!p-6 [&_.ant-modal-content]:!shadow-2xl"
    >
      <div className="py-1 space-y-5">
        {/* Header với cấu trúc chuyên nghiệp, chừa khoảng trống an toàn bên phải cho nút X */}
        <div className="border-b border-gray-100 pb-4 pr-10">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
                {returnRequest.returnCode}
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                {returnRequest.type === 'REFUND' ? 'Hoàn tiền' : 'Đổi mới 1 - 1'}
              </span>
            </div>
            <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {new Date(returnRequest.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>

          <div className="mt-3.5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100/60 text-emerald-700">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-snug">
                Tiến độ xử lý {returnRequest.type === 'REFUND' ? 'Hoàn tiền' : 'Đổi mới 1 - 1'}
              </h3>
              <p className="mt-1 text-xs text-gray-500 flex flex-wrap items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
                <span>Sản phẩm:</span>
                <span className="font-semibold text-gray-800">{returnRequest.phoneName || 'Thiết bị'}</span>
                {returnRequest.variantSku && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.2 font-mono text-[11px] text-gray-600">
                    {returnRequest.variantSku}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Thanh trạng thái tiến trình (Timeline Stepper) */}
        {!isRejected ? (
          <div className="relative py-2 px-2">
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
                          currentStep > stepNum ? 'bg-emerald-500' : 'bg-gray-100'
                        }`}
                      />
                    )}

                    {/* Vòng tròn biểu tượng */}
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-2xl text-xs font-bold transition-all shadow-xs ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                            ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 scale-105'
                            : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}
                    >
                      <StepIcon className="h-4 w-4" />
                    </div>

                    {/* Nội dung bước */}
                    <div className="mt-2.5">
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
          <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900">Yêu cầu đổi trả đã bị từ chối</h4>
              <p className="mt-1 text-xs text-red-700 leading-relaxed">
                {returnRequest.adminNote || 'Thiết bị không đáp ứng đủ điều kiện chính sách đổi trả hoặc đã quá thời hạn quy định.'}
              </p>
            </div>
          </div>
        )}

        {/* Thông tin chi tiết */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Lý do đổi trả:</span>
            <span className="font-semibold text-gray-900 bg-white px-2 py-0.5 rounded-md border border-gray-100">
              {returnRequest.reason}
            </span>
          </div>
          {returnRequest.errorDescription && (
            <div className="border-t border-gray-200/50 pt-2 flex flex-col gap-1">
              <span className="text-gray-500 font-medium">Mô tả sự cố từ bạn:</span>
              <div className="rounded-lg bg-white p-2.5 text-gray-800 leading-relaxed border border-gray-100 text-[11px] whitespace-pre-line">
                {returnRequest.errorDescription}
              </div>
            </div>
          )}
          {returnRequest.type === 'REFUND' && (
            <div className="flex justify-between items-center border-t border-gray-200/50 pt-2 font-semibold">
              <span className="text-gray-600">Số tiền hoàn dự kiến:</span>
              <span className="text-emerald-700 text-sm font-bold">{formatVND(returnRequest.refundAmount || 0)}</span>
            </div>
          )}
          {returnRequest.adminNote && (
            <div className="flex flex-col gap-1 border-t border-gray-200/50 pt-2">
              <span className="text-gray-500 font-medium">Kết luận từ quản trị viên:</span>
              <div className="rounded-lg bg-emerald-50/80 p-2.5 text-emerald-900 font-medium leading-relaxed border border-emerald-100 text-[11px]">
                {returnRequest.adminNote}
              </div>
            </div>
          )}
        </div>

        {/* Danh sách ảnh bằng chứng */}
        {returnRequest.proofImages && returnRequest.proofImages.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-bold text-gray-700">Ảnh minh chứng lỗi đã gửi:</h5>
              <span className="text-[11px] text-gray-400">({returnRequest.proofImages.length} ảnh)</span>
            </div>
            <Image.PreviewGroup>
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {returnRequest.proofImages.map((img, i) => (
                  <div
                    key={i}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-2xs hover:border-emerald-500 transition-colors"
                  >
                    <Image
                      src={img}
                      alt={`Minh chứng lỗi #${i + 1}`}
                      className="!h-full !w-full rounded-lg object-cover"
                      preview={{ mask: 'Phóng to' }}
                    />
                  </div>
                ))}
              </div>
            </Image.PreviewGroup>
          </div>
        )}

        {/* Nút đóng */}
        <div className="pt-2 flex justify-end border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ClaimProgressModal;
