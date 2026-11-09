import React from 'react';
import { ClipboardCheck, PackageCheck, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDate } from '@/utils';
import { extractCancelReason } from '@/utils/orderStateMachine';
import { getTimelineStep } from './orderHelpers';

export interface OrderTrackingTimelineProps {
  order: {
    orderStatus: string;
    createdAt?: string | null;
    note?: string | null;
  };
  className?: string;
}

interface StepItem {
  id: number;
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TIMELINE_STEPS: StepItem[] = [
  {
    id: 1,
    key: 'ORDER_PLACED',
    title: 'Đã đặt hàng',
    description: 'Đơn hàng đã được tạo',
    icon: ClipboardCheck,
  },
  {
    id: 2,
    key: 'CONFIRMED',
    title: 'Đã xác nhận',
    description: 'Hệ thống đã xác nhận đơn',
    icon: PackageCheck,
  },
  {
    id: 3,
    key: 'SHIPPING',
    title: 'Đang vận chuyển',
    description: 'Đơn hàng đang trên đường giao',
    icon: Truck,
  },
  {
    id: 4,
    key: 'DELIVERED',
    title: 'Giao hàng thành công',
    description: 'Khách hàng đã nhận kiện hàng',
    icon: CheckCircle2,
  },
];

export const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ order, className = '' }) => {
  const currentStep = getTimelineStep(order.orderStatus);
  const isCancelled = order.orderStatus === 'CANCELLED';
  const cancelReason = extractCancelReason(order.note);

  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-xs ${className}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Tiến trình đơn hàng</h3>
          <p className="text-xs text-gray-500">Mốc thời gian cập nhật theo hệ thống vận hành</p>
        </div>
        {order.createdAt && (
          <span className="inline-flex items-center rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
            Ngày đặt: {formatDate(order.createdAt)}
          </span>
        )}
      </div>

      {/* Trạng thái ĐÃ HỦY hiển thị thông báo riêng biệt, không giả lập giao hàng */}
      {isCancelled ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50/80 p-5 text-red-900 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-800">Đơn hàng đã được hủy</h4>
              <p className="mt-1 text-xs sm:text-sm text-red-700 leading-relaxed">
                {cancelReason ? (
                  <>
                    Lý do hủy: <strong className="font-semibold text-red-900">{cancelReason}</strong>.
                  </>
                ) : (
                  'Đơn hàng đã được hủy thành công theo yêu cầu của quý khách.'
                )}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-red-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                Số lượng tồn kho và phiếu giảm giá (nếu có) đã được hoàn lại đầy đủ.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Desktop Timeline (Ngang) */}
          <div className="hidden sm:block" role="list">
            <div className="relative flex items-start justify-between">
              {/* Thanh nối ngang */}
              <div
                className="absolute top-5 left-8 right-8 h-1 -translate-y-1/2 bg-gray-200"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-emerald-600 transition-all duration-500"
                  style={{
                    width: `${((Math.max(1, currentStep) - 1) / (TIMELINE_STEPS.length - 1)) * 100}%`,
                  }}
                />
              </div>

              {TIMELINE_STEPS.map((step) => {
                const isCompleted = currentStep > step.id || currentStep === 4;
                const isCurrent = currentStep === step.id && currentStep !== 4;
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.id}
                    role="listitem"
                    aria-current={isCurrent ? 'step' : undefined}
                    className="relative z-10 flex flex-col items-center text-center"
                    style={{ width: `${100 / TIMELINE_STEPS.length}%` }}
                  >
                    {/* Circle Icon Indicator */}
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all shadow-xs ${
                        isCompleted
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                          : isCurrent
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-200 animate-pulse'
                            : 'bg-white text-gray-400 border-2 border-gray-200'
                      }`}
                    >
                      <StepIcon className="h-5 w-5" />
                    </div>

                    {/* Step Content */}
                    <div className="mt-3 px-2">
                      <div
                        className={`text-sm font-semibold ${
                          isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.title}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500 leading-tight">
                        {step.description}
                      </div>
                      {step.id === 1 && order.createdAt && (
                        <div className="mt-1 text-[11px] font-medium text-emerald-700">
                          {formatDate(order.createdAt)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Timeline (Dọc) */}
          <div className="block sm:hidden space-y-4" role="list">
            {TIMELINE_STEPS.map((step, idx) => {
              const isCompleted = currentStep > step.id || currentStep === 4;
              const isCurrent = currentStep === step.id && currentStep !== 4;
              const isLast = idx === TIMELINE_STEPS.length - 1;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.id}
                  role="listitem"
                  aria-current={isCurrent ? 'step' : undefined}
                  className="relative flex items-start gap-3"
                >
                  {/* Vertical line connecting steps */}
                  {!isLast && (
                    <div
                      className={`absolute left-4 top-8 -bottom-3 w-0.5 ${
                        isCompleted ? 'bg-emerald-600' : 'bg-gray-200'
                      }`}
                      aria-hidden="true"
                    />
                  )}

                  {/* Icon Indicator */}
                  <div
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all shadow-xs ${
                      isCompleted
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                        : isCurrent
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-200 animate-pulse'
                          : 'bg-white text-gray-400 border border-gray-300'
                    }`}
                  >
                    <StepIcon className="h-4 w-4" />
                  </div>

                  {/* Text details */}
                  <div className="min-w-0 flex-1 pt-0.5 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.title}
                      </span>
                      {step.id === 1 && order.createdAt && (
                        <span className="text-[11px] font-medium text-emerald-700 shrink-0">
                          {formatDate(order.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 leading-snug">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTrackingTimeline;
