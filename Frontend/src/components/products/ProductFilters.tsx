import { useQuery } from '@tanstack/react-query';
import { Slider, Checkbox, Button, Spin } from 'antd';
import { RotateCcw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { brandService, optionService } from '@/services';
import type { OptionTreeDTO, OptionItemDTO } from '@/types/api';
import {
  toggleBrand,
  toggleRam,
  toggleStorage,
  toggleColor,
  toggleFeature,
  setPriceRange,
  clearAllFilters,
} from '@/store/slices/filterSlice';
import { RAM_OPTIONS, STORAGE_OPTIONS, PRODUCT_FEATURES_FILTERS } from '@/utils/constants';

// Fallback colors (hex) if the OPTION table is empty — value → hex
const FALLBACK_COLORS: Record<string, string> = {
  black: '#1F1F1F',
  white: '#F8F8F8',
  blue: '#5DADE2',
  pink: '#FFB6C1',
  green: '#22C55E',
  yellow: '#E8C547',
};

const FILTER_SECTION_LABELS: Record<string, string> = {
  RAM: 'RAM',
  STORAGE: 'Dung lượng bộ nhớ',
  COLOR: 'Màu sắc',
  FEATURE: 'Tính năng nổi bật',
};

const { Group: CheckboxGroup } = Checkbox;

export default function ProductFilters() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.filter);

  // Load brands từ API
  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandService.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Load option tree từ bảng OPTION/OPTION_ITEM (quản lý trong admin/tuy-chon)
  // Category có enabled/maxItems/sortOrder; items đã slice theo maxItems ở backend.
  const { data: catalog } = useQuery({
    queryKey: ['options'],
    queryFn: () => optionService.list(),
    staleTime: 5 * 60 * 1000,
  });

  const itemsByType = (type: string): OptionItemDTO[] =>
    (catalog || []).find((c) => c.type === type)?.items || [];

  const formatPrice = (val?: number) =>
    val !== undefined ? `${(val / 1_000_000).toFixed(0)} triệu` : '';

  const renderCheckboxSection = (
    label: string,
    items: OptionItemDTO[],
    fallbackValues: string[],
    selected: string[],
    onToggle: (v: string) => void,
  ) => {
    const values = items.length > 0 ? items.map((i) => i.value) : fallbackValues;
    return (
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-900">{label}</h4>
        <CheckboxGroup className="!flex !flex-col gap-2">
          {values.map((v) => (
            <Checkbox
              key={v}
              value={v}
              checked={selected.includes(v)}
              onChange={() => onToggle(v)}
            >
              <span className="text-sm">{v}</span>
            </Checkbox>
          ))}
        </CheckboxGroup>
      </div>
    );
  };

  return (
    <aside className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h3 className="text-sm font-bold text-green-600 uppercase tracking-wide">
          Bộ lọc sản phẩm
        </h3>
        <Button
          type="text"
          size="small"
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          onClick={() => dispatch(clearAllFilters())}
          className="!text-gray-500"
        >
          Xóa lọc
        </Button>
      </div>

      {/* Hãng — brands từ API */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-900">Hãng</h4>
        <div className="space-y-2">
          <Checkbox
            checked={filters.brandIds.length === 0}
            onChange={() => dispatch(clearAllFilters())}
          >
            <span className="text-sm">Tất cả sản phẩm</span>
          </Checkbox>
          {brandsLoading ? (
            <Spin size="small" />
          ) : (
            (brands || []).map((brand) => (
              <Checkbox
                key={brand.id}
                checked={filters.brandIds.includes(brand.id)}
                onChange={() => dispatch(toggleBrand(brand.id))}
              >
                <span className="text-sm">{brand.name}</span>
              </Checkbox>
            ))
          )}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-900">Khoảng giá</h4>
        <Slider
          range
          min={0}
          max={50_000_000}
          step={1_000_000}
          value={filters.priceRange}
          onChange={(val) => dispatch(setPriceRange(val as [number, number]))}
          tooltip={{ formatter: formatPrice }}
        />
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>{formatPrice(filters.priceRange[0])}</span>
          <span>{formatPrice(filters.priceRange[1])}</span>
        </div>
      </div>

      {/* Categories từ OPTION (enabled, theo sortOrder) */}
      {(catalog as OptionTreeDTO[] | undefined)?.map((category) => {
        const label = FILTER_SECTION_LABELS[category.type] || category.label || category.type;

        // COLOR renders as swatches with hex
        if (category.type === 'COLOR') {
          return (
            <div key={category.type}>
              <h4 className="mb-3 text-sm font-semibold text-gray-900">{label}</h4>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const colorItems = itemsByType('COLOR');
                  const colors = colorItems.length > 0
                    ? colorItems.map((i) => ({ value: i.value, hex: i.hexColor || FALLBACK_COLORS[i.value] || '#CCCCCC' }))
                    : Object.entries(FALLBACK_COLORS).map(([value, hex]) => ({ value, hex }));
                  return colors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => dispatch(toggleColor(color.value))}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        filters.colors.includes(color.value)
                          ? 'scale-110 border-green-500'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      aria-label={color.value}
                      title={color.value}
                    />
                  ));
                })()}
              </div>
            </div>
          );
        }

        // Known types keep their dedicated toggle + fallback constants
        const known: Record<string, { fallback: string[]; selected: string[]; toggle: (v: string) => void }> = {
          RAM: { fallback: RAM_OPTIONS, selected: filters.rams, toggle: (v) => dispatch(toggleRam(v)) },
          STORAGE: { fallback: STORAGE_OPTIONS, selected: filters.storages, toggle: (v) => dispatch(toggleStorage(v)) },
          FEATURE: { fallback: PRODUCT_FEATURES_FILTERS, selected: filters.features, toggle: (v) => dispatch(toggleFeature(v)) },
        };
        const cfg = known[category.type];
        if (cfg) {
          return renderCheckboxSection(label, itemsByType(category.type), cfg.fallback, cfg.selected, cfg.toggle);
        }

        // Unknown category → generic checkbox (features-style)
        return renderCheckboxSection(label, itemsByType(category.type), [], filters.features, (v) => dispatch(toggleFeature(v)));
      })}

      {/* Fallback nếu catalog rỗng (chưa seed) */}
      {(!catalog || catalog.length === 0) && (
        <>
          {renderCheckboxSection('RAM', [], RAM_OPTIONS, filters.rams, (v) => dispatch(toggleRam(v)))}
          {renderCheckboxSection('Dung lượng bộ nhớ', [], STORAGE_OPTIONS, filters.storages, (v) => dispatch(toggleStorage(v)))}
          {renderCheckboxSection('Tính năng nổi bật', [], PRODUCT_FEATURES_FILTERS, filters.features, (v) => dispatch(toggleFeature(v)))}
        </>
      )}

      <Button
        type="default"
        block
        size="large"
        onClick={() => dispatch(clearAllFilters())}
        className="!rounded-full !border-green-600 !text-green-600 hover:!bg-green-50"
      >
        Xóa bộ lọc
      </Button>
    </aside>
  );
}
