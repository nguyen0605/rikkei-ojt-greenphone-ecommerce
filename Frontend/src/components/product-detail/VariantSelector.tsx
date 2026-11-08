import React, { useMemo } from 'react';
import { CheckCircle2, AlertCircle, Ban } from 'lucide-react';
import type { PhoneVariantDTO } from '@/types/api';
import { formatVND } from '@/utils';
import ColorSwatch from './ColorSwatch';

export interface VariantSelectorProps {
  variants: PhoneVariantDTO[];
  selectedVariantId: number | null;
  onVariantChange: (variant: PhoneVariantDTO) => void;
  className?: string;
}

export default function VariantSelector({
  variants,
  selectedVariantId,
  onVariantChange,
  className = '',
}: VariantSelectorProps) {
  // Active selected variant (or fallback to first)
  const currentVariant = useMemo(() => {
    if (!variants || variants.length === 0) return null;
    return variants.find((v) => v.id === selectedVariantId) || variants[0];
  }, [variants, selectedVariantId]);

  // Extract unique storage capacities in order of appearance
  const storages = useMemo(() => {
    if (!variants) return [];
    const list: string[] = [];
    variants.forEach((v) => {
      if (v.storage && !list.includes(v.storage)) {
        list.push(v.storage);
      }
    });
    return list;
  }, [variants]);

  // Extract unique colors in order of appearance
  const colors = useMemo(() => {
    if (!variants) return [];
    const list: string[] = [];
    variants.forEach((v) => {
      if (v.color && !list.includes(v.color)) {
        list.push(v.color);
      }
    });
    return list;
  }, [variants]);

  // Check if ALL variants in this phone are out of stock
  const isEntirelyOutOfStock = useMemo(() => {
    if (!variants || variants.length === 0) return false;
    return variants.every((v) => v.stockQuantity <= 0);
  }, [variants]);

  // If no variants exist
  if (!variants || variants.length === 0 || !currentVariant) {
    return (
      <div className={`rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500 ${className}`}>
        Sản phẩm chưa có biến thể cấu hình.
      </div>
    );
  }

  // Current selections
  const currentStorage = currentVariant.storage;
  const currentColor = currentVariant.color;

  // Handler when user selects a storage
  const handleStorageSelect = (storage: string) => {
    // 1. Try finding a variant with same storage + current color + in stock
    let target = variants.find(
      (v) => v.storage === storage && v.color === currentColor && v.stockQuantity > 0
    );

    // 2. If not found, find any in-stock variant with this storage
    if (!target) {
      target = variants.find((v) => v.storage === storage && v.stockQuantity > 0);
    }

    // 3. If all out of stock for this storage, find matching color anyway
    if (!target) {
      target = variants.find((v) => v.storage === storage && v.color === currentColor);
    }

    // 4. Fallback to first variant of this storage
    if (!target) {
      target = variants.find((v) => v.storage === storage);
    }

    if (target) {
      onVariantChange(target);
    }
  };

  // Handler when user selects a color
  const handleColorSelect = (color: string) => {
    // Find variant with currentStorage + selected color
    let target = variants.find(
      (v) => v.storage === currentStorage && v.color === color
    );

    // If not found in current storage (edge case), find any variant with this color
    if (!target) {
      target = variants.find((v) => v.color === color && v.stockQuantity > 0);
    }
    if (!target) {
      target = variants.find((v) => v.color === color);
    }

    if (target) {
      onVariantChange(target);
    }
  };

  return (
    <div className={`space-y-5 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 sm:p-5 ${className}`}>
      {/* Alert if all variants are out of stock */}
      {isEntirelyOutOfStock && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
        >
          <Ban className="h-4 w-4 shrink-0 text-red-500" />
          <span>Sản phẩm tạm thời hết hàng toàn bộ phiên bản</span>
        </div>
      )}

      {/* ── Group 1: Storage Capacity ── */}
      {storages.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">
              Dung lượng:{' '}
              <span className="font-bold text-green-700">{currentStorage}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {storages.map((storage) => {
              const isSelected = storage === currentStorage;

              // Check if ANY variant with this storage is in stock
              const variantsForStorage = variants.filter((v) => v.storage === storage);
              const isStorageOutOfStock = variantsForStorage.every((v) => v.stockQuantity <= 0);

              // Find variant to display price hint (prefer current color, else lowest price)
              const matchingVariant =
                variantsForStorage.find((v) => v.color === currentColor) ||
                variantsForStorage[0];
              const priceToDisplay = matchingVariant
                ? matchingVariant.discountPrice ?? matchingVariant.price
                : null;

              return (
                <button
                  key={storage}
                  type="button"
                  role="button"
                  aria-pressed={isSelected}
                  aria-disabled={isStorageOutOfStock}
                  disabled={isStorageOutOfStock}
                  onClick={() => handleStorageSelect(storage)}
                  onKeyDown={(e) => {
                    if (isStorageOutOfStock) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStorageSelect(storage);
                    }
                  }}
                  className={`group relative flex flex-col items-start rounded-xl border p-3 text-left transition-all duration-150 select-none ${
                    isStorageOutOfStock
                      ? 'cursor-not-allowed border-gray-200 bg-gray-100/70 text-gray-400 opacity-60'
                      : isSelected
                        ? 'border-green-600 bg-white text-gray-900 shadow-sm ring-2 ring-green-600'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-gray-50/80 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-bold">{storage}</span>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-green-600" />
                    )}
                  </div>

                  {priceToDisplay !== null && (
                    <span
                      className={`mt-1 text-xs font-semibold ${
                        isStorageOutOfStock
                          ? 'text-gray-400'
                          : isSelected
                            ? 'text-red-600'
                            : 'text-gray-600'
                      }`}
                    >
                      {formatVND(priceToDisplay)}
                    </span>
                  )}

                  {isStorageOutOfStock && (
                    <span className="mt-0.5 text-[11px] font-normal text-red-500">
                      Hết hàng
                    </span>
                  )}

                  {/* Diagonal Strikethrough for Out-of-Stock Storage */}
                  {isStorageOutOfStock && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl"
                    >
                      <span className="h-[1.5px] w-[140%] rotate-[-15deg] bg-red-400/80" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Group 2: Color Swatch ── */}
      {colors.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">
              Màu sắc:{' '}
              <span className="font-bold text-green-700">{currentColor}</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {colors.map((color) => {
              const isSelected = color === currentColor;

              // Check combination: currentStorage + this color
              const combinationVariant = variants.find(
                (v) => v.storage === currentStorage && v.color === color
              );

              // Doesn't exist for this storage OR stock <= 0
              const exists = !!combinationVariant;
              const isOutOfStock = !exists || combinationVariant.stockQuantity <= 0;

              return (
                <ColorSwatch
                  key={color}
                  color={color}
                  selected={isSelected}
                  outOfStock={isOutOfStock}
                  disabled={isOutOfStock}
                  onClick={() => handleColorSelect(color)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Inventory Stock Status Indicator ── */}
      <div className="border-t border-gray-200/70 pt-3">
        {currentVariant.stockQuantity > 0 ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Còn hàng ({currentVariant.stockQuantity} sản phẩm sẵn có)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>Phiên bản này tạm thời hết hàng</span>
          </div>
        )}
      </div>
    </div>
  );
}
