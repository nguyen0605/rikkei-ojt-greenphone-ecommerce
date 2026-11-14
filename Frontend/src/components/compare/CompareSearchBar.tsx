import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Smartphone, AlertCircle } from 'lucide-react';
import { phoneComparisonService } from '@/services/phoneComparisonService';
import type { PhoneDTO } from '@/types/api';

interface CompareSearchBarProps {
  onSelectPhone: (phone: PhoneDTO) => void;
  disabledPhoneIds?: number[];
  placeholder?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}

export const CompareSearchBar: React.FC<CompareSearchBarProps> = ({
  onSelectPhone,
  disabledPhoneIds = [],
  placeholder = 'Tìm kiếm tên điện thoại để so sánh...',
  autoFocus = true,
  onCancel,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PhoneDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const phones = await phoneComparisonService.searchPhones(query);
        setResults(phones);
        setHasSearched(true);
      } catch (err) {
        console.error('Failed to search phones for comparison:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const formatPrice = (price?: number | null) => {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="w-full relative" data-testid="compare-search-bar">
      <div className="relative flex items-center">
        <Search className="w-5 h-5 absolute left-3 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
        />
        {loading ? (
          <Loader2 className="w-4 h-4 absolute right-3 text-emerald-500 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Kết quả tìm kiếm */}
      {query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-80 overflow-y-auto z-50">
          {loading && (
            <div className="p-4 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Đang tìm kiếm điện thoại...</span>
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-sm">
              <Smartphone className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
              <p>Không tìm thấy điện thoại nào khớp với &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng thử từ khóa khác (ví dụ: iPhone, Galaxy, Xiaomi...)</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60" role="listbox">
              {results.map((phone) => {
                const isAlreadySelected = disabledPhoneIds.includes(phone.id);
                return (
                  <li key={phone.id}>
                    <button
                      type="button"
                      disabled={isAlreadySelected}
                      onClick={() => {
                        if (!isAlreadySelected) {
                          onSelectPhone(phone);
                          setQuery('');
                          setResults([]);
                        }
                      }}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors ${
                        isAlreadySelected
                          ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50'
                          : 'hover:bg-emerald-50/70 dark:hover:bg-slate-700/50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {phone.mainImageUrl ? (
                          <img
                            src={phone.mainImageUrl}
                            alt={phone.name}
                            className="w-12 h-12 object-contain rounded border border-slate-200 dark:border-slate-700 p-0.5 bg-white shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                            <Smartphone className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                            {phone.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {phone.brandName} &bull; {phone.screen || 'Màn hình chuẩn'}
                          </p>
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {formatPrice(phone.lowestPrice)}
                          </p>
                        </div>
                      </div>

                      {isAlreadySelected ? (
                        <span className="shrink-0 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Đang chọn
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                          Chọn
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
        >
          Hủy bỏ
        </button>
      )}
    </div>
  );
};

export default CompareSearchBar;

