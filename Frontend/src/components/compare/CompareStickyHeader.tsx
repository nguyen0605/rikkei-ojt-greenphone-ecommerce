import React from 'react';
import { ArrowLeftRight, Smartphone } from 'lucide-react';
import type { ComparedPhoneDTO } from '@/types/api';

interface CompareStickyHeaderProps {
  phones: ComparedPhoneDTO[];
  onSwap: () => void;
  onChangeSlot: (slotIndex: number) => void;
  showDifferencesOnly: boolean;
  onToggleDifferencesOnly: (value: boolean) => void;
  differencesCount: number;
  visible: boolean;
}

export const CompareStickyHeader: React.FC<CompareStickyHeaderProps> = ({
  phones,
  onSwap,
  onChangeSlot,
  showDifferencesOnly,
  onToggleDifferencesOnly,
  differencesCount,
  visible,
}) => {
  if (!visible || phones.length < 2) return null;

  const phone1 = phones[0];
  const phone2 = phones[1];

  const formatPrice = (price?: number | null) => {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div
      data-testid="compare-sticky-header"
      className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-md transition-all duration-200 animate-in fade-in slide-in-from-top-4"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Controls: toggle differences */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDifferencesOnly}
                onChange={(e) => onToggleDifferencesOnly(e.target.checked)}
                className="sr-only peer"
                data-testid="sticky-toggle-diff"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
              <span className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300">
                Chỉ xem khác biệt ({differencesCount})
              </span>
            </label>
          </div>

          {/* Side by side mini phone headers */}
          <div className="flex items-center justify-center gap-2 md:gap-6 w-full md:w-auto">
            {/* Phone 1 */}
            <div className="flex items-center gap-2 min-w-0 max-w-[140px] sm:max-w-[200px] md:max-w-[240px]">
              {phone1.mainImageUrl ? (
                <img
                  src={phone1.mainImageUrl}
                  alt={phone1.name}
                  className="w-8 h-8 object-contain rounded bg-white border border-slate-200 dark:border-slate-700 p-0.5 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {phone1.name}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {formatPrice(phone1.minDiscountPrice || phone1.minPrice)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChangeSlot(0)}
                className="hidden sm:inline-block ml-1 text-[11px] text-slate-500 hover:text-emerald-600 underline shrink-0"
              >
                Đổi
              </button>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={onSwap}
              title="Đổi vị trí 2 điện thoại"
              aria-label="Đổi vị trí"
              className="p-1.5 rounded-full border border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>

            {/* Phone 2 */}
            <div className="flex items-center gap-2 min-w-0 max-w-[140px] sm:max-w-[200px] md:max-w-[240px]">
              {phone2.mainImageUrl ? (
                <img
                  src={phone2.mainImageUrl}
                  alt={phone2.name}
                  className="w-8 h-8 object-contain rounded bg-white border border-slate-200 dark:border-slate-700 p-0.5 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {phone2.name}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {formatPrice(phone2.minDiscountPrice || phone2.minPrice)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChangeSlot(1)}
                className="hidden sm:inline-block ml-1 text-[11px] text-slate-500 hover:text-emerald-600 underline shrink-0"
              >
                Đổi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareStickyHeader;

