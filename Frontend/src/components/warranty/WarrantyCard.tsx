import { Progress, Tag } from 'antd';
import dayjs from 'dayjs';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import type { WarrantyLookupItem } from '@/services/warrantyService';

interface WarrantyCardProps {
  warranty: WarrantyLookupItem;
}

/**
 * Tính phần trăm thời gian bảo hành đã trôi qua (0 - 100),
 * đồng bộ với trạng thái hết hạn từ Backend.
 */
function calculateElapsedPercent(warranty: WarrantyLookupItem, isExpired: boolean): number {
  if (isExpired) {
    return 100;
  }

  const startMs = dayjs(warranty.startDate).valueOf();
  const endMs = dayjs(warranty.endDate).valueOf();
  const nowMs = Date.now();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }

  if (nowMs <= startMs) {
    return 0;
  }

  if (nowMs >= endMs) {
    return 100;
  }

  const ratio = ((nowMs - startMs) / (endMs - startMs)) * 100;
  return Math.min(100, Math.max(0, Math.round(ratio)));
}

export default function WarrantyCard({ warranty }: WarrantyCardProps) {
  const remainingDays = Math.max(0, warranty.remainingDays ?? 0);
  const isExpired =
    warranty.status?.toUpperCase() === 'EXPIRED' || remainingDays === 0;
  const elapsedPercent = calculateElapsedPercent(warranty, isExpired);
  const imeiDisplay = warranty.imeiNumber || warranty.imei || 'Đang cập nhật';
  const durationMonths = warranty.warrantyDurationMonths ?? 12;

  const formattedStart = dayjs(warranty.startDate).isValid()
    ? dayjs(warranty.startDate).format('DD/MM/YYYY')
    : warranty.startDate;
  const formattedEnd = dayjs(warranty.endDate).isValid()
    ? dayjs(warranty.endDate).format('DD/MM/YYYY')
    : warranty.endDate;

  return (
    <article
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      data-testid="warranty-card"
    >
      {/* Top status bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 ${
          isExpired
            ? 'border-gray-200 bg-gray-50'
            : 'border-green-100 bg-green-50/70'
        }`}
      >
        <div className="flex items-center gap-2">
          {isExpired ? (
            <ShieldAlert className="h-5 w-5 text-gray-500" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          )}
          <span className="text-sm font-semibold text-gray-800">
            Thẻ bảo hành điện tử GreenPhone Care ({durationMonths} tháng)
          </span>
        </div>

        {isExpired ? (
          <Tag
            color="default"
            className="!m-0 rounded-full border-gray-300 bg-gray-200 px-3 py-0.5 text-xs font-semibold text-gray-700"
          >
            Hết hạn bảo hành
          </Tag>
        ) : (
          <Tag
            color="green"
            className="!m-0 flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold"
          >
            <CheckCircle2 className="inline h-3.5 w-3.5" />
            <span>Đang bảo hành - Còn lại {remainingDays} ngày</span>
          </Tag>
        )}
      </div>

      {/* Main content */}
      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {/* Product thumbnail */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-2 sm:h-28 sm:w-28">
            {warranty.thumbnailUrl ? (
              <img
                src={warranty.thumbnailUrl}
                alt={warranty.productName}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            ) : (
              <Smartphone className="h-10 w-10 text-gray-300" />
            )}
          </div>

          {/* Product & warranty details */}
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
                {warranty.productName}
              </h3>
              {warranty.variantDetails && (
                <p className="mt-0.5 text-sm font-medium text-gray-600">
                  Phiên bản: {warranty.variantDetails}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-3.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <span className="block text-xs text-gray-500">Mã IMEI</span>
                <span className="font-mono font-semibold tracking-wide text-gray-900">
                  {imeiDisplay}
                </span>
              </div>

              <div>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3.5 w-3.5" />
                  Ngày kích hoạt
                </span>
                <span className="font-semibold text-gray-900">{formattedStart}</span>
              </div>

              <div>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  Ngày hết hạn
                </span>
                <span className="font-semibold text-gray-900">{formattedEnd}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="pt-1">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-gray-600">
                  Tiến trình thời hạn bảo hành ({elapsedPercent}% đã sử dụng)
                </span>
                <span
                  className={
                    isExpired ? 'font-semibold text-gray-500' : 'font-semibold text-green-600'
                  }
                >
                  {isExpired ? '0 ngày còn lại' : `Còn lại ${remainingDays} ngày`}
                </span>
              </div>
              <Progress
                percent={elapsedPercent}
                showInfo={false}
                strokeColor={isExpired ? '#9ca3af' : '#16a34a'}
                railColor="#e5e7eb"
                size={{ height: 10 }}
              />
            </div>

            {warranty.note && (
              <p className="text-xs text-gray-500">Ghi chú: {warranty.note}</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
