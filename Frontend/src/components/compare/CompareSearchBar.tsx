import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Loader2, Smartphone, AlertCircle, Layers, RotateCcw } from 'lucide-react';
import { phoneComparisonService } from '@/services/phoneComparisonService';
import type { PhoneDTO } from '@/types/api';

interface BrandItem {
  id: number;
  name: string;
}

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
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [allPhones, setAllPhones] = useState<PhoneDTO[]>([]);
  const [searchResults, setSearchResults] = useState<PhoneDTO[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Tải danh sách thương hiệu và toàn bộ sản phẩm ban đầu
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      phoneComparisonService.getBrands(),
      phoneComparisonService.getInitialPhones(),
    ])
      .then(([brandList, phoneList]) => {
        if (!isMounted) return;
        setBrands(brandList);
        setAllPhones(phoneList);
      })
      .catch((err) => {
        console.error('Failed to load initial compare search data:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // 2. Tìm kiếm theo từ khóa kết hợp lọc theo hãng
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const phones = await phoneComparisonService.searchPhones(trimmed, selectedBrandId ?? undefined);
        setSearchResults(phones);
      } catch (err) {
        console.error('Failed to search phones for comparison:', err);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, selectedBrandId]);

  // 3. Danh sách hiển thị kết hợp tìm kiếm và lọc hãng
  const displayedList = useMemo(() => {
    let list: PhoneDTO[];
    if (searchResults !== null) {
      list = searchResults;
    } else {
      list = allPhones;
    }

    // Nếu không search qua API searchPhones mà chỉ chọn hãng
    if (selectedBrandId !== null && searchResults === null) {
      list = list.filter((p) => p.brandId === selectedBrandId);
    }

    return list;
  }, [searchResults, allPhones, selectedBrandId]);

  const selectedBrandObj = brands.find((b) => b.id === selectedBrandId);

  const handleResetFilter = () => {
    setQuery('');
    setSelectedBrandId(null);
    setSearchResults(null);
  };

  const formatPrice = (price?: number | null) => {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="w-full flex flex-col" data-testid="compare-search-bar">
      {/* Ô tìm kiếm input */}
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

      {/* Bộ lọc nhanh theo hãng sản xuất */}
      {brands.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap text-[11px] mr-0.5">
            Hãng:
          </span>
          <button
            type="button"
            onClick={() => setSelectedBrandId(null)}
            className={`px-2.5 py-1 rounded-full font-medium transition-all whitespace-nowrap text-xs ${
              selectedBrandId === null
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tất cả ({allPhones.length})
          </button>
          {brands.map((brand) => {
            const isSelected = selectedBrandId === brand.id;
            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => setSelectedBrandId(isSelected ? null : brand.id)}
                className={`px-2.5 py-1 rounded-full font-medium transition-all whitespace-nowrap text-xs ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {brand.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Danh sách kết quả hoặc toàn bộ sản phẩm */}
      <div className="mt-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden flex flex-col">
        {/* Thanh tiêu đề trạng thái danh sách */}
        <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-700/40 border-b border-slate-100 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span className="truncate">
              {query.trim()
                ? `Kết quả cho "${query.trim()}" (${displayedList.length} máy)`
                : selectedBrandObj
                ? `Điện thoại ${selectedBrandObj.name} (${displayedList.length} máy)`
                : `Toàn bộ danh sách điện thoại (${displayedList.length} máy)`}
            </span>
          </div>

          {(query.trim() || selectedBrandId !== null) && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 shrink-0 font-medium ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Hiện tất cả</span>
            </button>
          )}
        </div>

        {/* Nội dung danh sách cuộn dọc mượt mà */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
          {loading && displayedList.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Đang tải danh sách điện thoại...</span>
            </div>
          )}

          {!loading && displayedList.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              <Smartphone className="w-10 h-10 mx-auto mb-2 text-slate-400 opacity-60" />
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Không tìm thấy điện thoại nào phù hợp
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Vui lòng thử đổi từ khóa tìm kiếm hoặc bấm &ldquo;Hiện tất cả&rdquo; để xem toàn bộ danh mục.
              </p>
              <button
                type="button"
                onClick={handleResetFilter}
                className="mt-3 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-medium hover:bg-emerald-100"
              >
                Hiện tất cả sản phẩm
              </button>
            </div>
          )}

          {displayedList.length > 0 && (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60" role="listbox">
              {displayedList.map((phone) => {
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
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {phone.brandName}
                            </span>
                            {phone.screen && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                                • {phone.screen}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
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
                        <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-md border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white transition-all">
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
      </div>

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
