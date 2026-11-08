import React from 'react';
import { Star, Image as ImageIcon } from 'lucide-react';
import type { ReviewFilterType, ReviewSummary } from '@/types/api';

export interface ReviewFilterTabsProps {
  currentFilter: ReviewFilterType;
  onFilterChange: (filter: ReviewFilterType) => void;
  summary?: ReviewSummary | null;
  withImageCount?: number;
  disabled?: boolean;
}

interface FilterOption {
  key: ReviewFilterType;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export const ReviewFilterTabs: React.FC<ReviewFilterTabsProps> = ({
  currentFilter,
  onFilterChange,
  summary,
  withImageCount,
  disabled = false,
}) => {
  const options: FilterOption[] = [
    {
      key: 'ALL',
      label: 'Tất cả',
      count: summary?.totalReviews,
    },
    {
      key: 5,
      label: '5 sao',
      icon: <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />,
      count: summary?.distribution?.[5],
    },
    {
      key: 4,
      label: '4 sao',
      icon: <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />,
      count: summary?.distribution?.[4],
    },
    {
      key: 3,
      label: '3 sao',
      icon: <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />,
      count: summary?.distribution?.[3],
    },
    {
      key: 2,
      label: '2 sao',
      icon: <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />,
      count: summary?.distribution?.[2],
    },
    {
      key: 1,
      label: '1 sao',
      icon: <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />,
      count: summary?.distribution?.[1],
    },
    {
      key: 'WITH_IMAGE',
      label: 'Có hình ảnh',
      icon: <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />,
      count: withImageCount,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Bộ lọc đánh giá"
      className="flex flex-wrap items-center gap-2"
    >
      {options.map((opt) => {
        const isActive = currentFilter === opt.key;
        return (
          <button
            key={String(opt.key)}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onFilterChange(opt.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive
                ? 'bg-green-600 text-white shadow-xs border border-green-600 font-semibold'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300 hover:bg-green-50/40'
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[11px] tabular-nums ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ReviewFilterTabs;

