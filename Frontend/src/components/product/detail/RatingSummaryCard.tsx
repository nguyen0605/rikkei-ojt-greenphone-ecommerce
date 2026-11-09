import React from 'react';
import { Star } from 'lucide-react';
import type { ReviewSummary, ReviewFilterType } from '@/types/api';
import { calculateStarPercentage } from '@/utils/reviewUtils';

export interface RatingSummaryCardProps {
  summary?: ReviewSummary | null;
  selectedFilter?: ReviewFilterType;
  onSelectFilter?: (filter: ReviewFilterType) => void;
  isLoading?: boolean;
}

export const RatingSummaryCard: React.FC<RatingSummaryCardProps> = ({
  summary,
  selectedFilter,
  onSelectFilter,
  isLoading = false,
}) => {
  const total = summary?.totalReviews ?? 0;
  const rawAvg = summary?.averageRating ?? 0;
  // Giữ nguyên giá trị trung bình từ backend, format 1 chữ số thập phân
  const formattedAvg = Number.isFinite(rawAvg) ? rawAvg.toFixed(1) : '0.0';

  if (isLoading) {
    return (
      <div
        className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm animate-pulse"
        aria-busy="true"
        aria-label="Đang tải dữ liệu tổng quan đánh giá"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center sm:w-56 sm:border-r sm:border-gray-100 sm:pr-6">
            <div className="h-12 w-20 bg-gray-200 rounded-lg mb-2" />
            <div className="h-4 w-14 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-28 bg-gray-200 rounded" />
          </div>
          <div className="flex-1 space-y-3">
            {[5, 4, 3, 2, 1].map((s) => (
              <div key={s} className="h-4 bg-gray-200 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Tổng quan đánh giá sản phẩm"
      className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* Điểm trung bình và tổng số đánh giá */}
        <div className="text-center sm:w-56 sm:shrink-0 sm:border-r sm:border-gray-100 sm:pr-6">
          <div className="text-5xl font-extrabold text-gray-900 tracking-tight">
            {formattedAvg}
          </div>
          <div className="mt-1 text-sm font-medium text-gray-500">trên 5</div>

          {/* 5 ngôi sao trực quan */}
          <div
            className="mt-2.5 flex items-center justify-center gap-1"
            aria-label={`Đánh giá trung bình ${formattedAvg} trên 5 sao`}
          >
            {Array.from({ length: 5 }).map((_, index) => {
              const starNumber = index + 1;
              const fillRatio = Math.max(0, Math.min(1, rawAvg - index));
              const isFull = fillRatio >= 0.75;
              const isHalf = fillRatio >= 0.25 && fillRatio < 0.75;

              return (
                <div key={starNumber} className="relative inline-block">
                  <Star
                    className={`h-5 w-5 ${
                      isFull
                        ? 'fill-amber-400 text-amber-400'
                        : isHalf
                          ? 'fill-amber-300 text-amber-400'
                          : 'text-gray-200 fill-gray-100'
                    }`}
                    aria-hidden="true"
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-2 text-xs text-gray-500 font-medium">
            {total > 0 ? (
              <span>
                Dựa trên <strong className="text-gray-800">{total}</strong> lượt đánh giá
              </span>
            ) : (
              <span>Chưa có đánh giá</span>
            )}
          </div>
        </div>

        {/* 5 thanh tiến trình phân bố đánh giá từ 5 sao xuống 1 sao */}
        <div className="flex-1 space-y-2.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary?.distribution?.[star] ?? 0;
            const pct = calculateStarPercentage(count, total);
            const isRowSelected = selectedFilter === star;

            return (
              <button
                key={star}
                type="button"
                onClick={() => onSelectFilter?.(isRowSelected ? 'ALL' : (star as ReviewFilterType))}
                className={`group flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  isRowSelected
                    ? 'bg-amber-50/80 ring-1 ring-amber-300 font-semibold'
                    : 'hover:bg-gray-50'
                }`}
                title={`Lọc theo đánh giá ${star} sao (${count} lượt)`}
              >
                {/* Nhãn sao */}
                <div className="flex w-14 shrink-0 items-center gap-1 text-gray-700 font-medium group-hover:text-amber-600">
                  <span>{star}</span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                </div>

                {/* Thanh tiến trình */}
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${star} sao: ${count} đánh giá (${Math.round(pct)}%)`}
                  className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100"
                >
                  <div
                    style={{ width: `${pct}%` }}
                    className="h-full rounded-full bg-amber-400 transition-all duration-300 group-hover:bg-amber-500"
                  />
                </div>

                {/* Số lượng & tỷ lệ phần trăm */}
                <div className="flex w-24 shrink-0 items-center justify-end gap-1.5 text-xs text-gray-500 tabular-nums">
                  <span className="font-semibold text-gray-700">{count}</span>
                  <span className="text-gray-400">({Math.round(pct)}%)</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RatingSummaryCard;

