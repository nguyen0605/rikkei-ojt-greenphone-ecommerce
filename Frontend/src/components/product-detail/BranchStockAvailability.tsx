import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, Spin, Empty, Tag } from 'antd';
import { MapPin, Phone, Store, Navigation, CheckCircle2, XCircle } from 'lucide-react';
import { warehouseService, type WarehouseBranchStock } from '@/services/warehouseService';

interface BranchStockAvailabilityProps {
  variantId?: number;
  variantName?: string;
  className?: string;
}

export const BranchStockAvailability: React.FC<BranchStockAvailabilityProps> = ({
  variantId,
  variantName,
  className = '',
}) => {
  const [selectedProvince, setSelectedProvince] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [userCoords, setUserCoords] = useState<{ lat?: number; lng?: number } | undefined>(undefined);

  // Thử lấy tọa độ GPS của người dùng để tính khoảng cách và sắp xếp kho gần nhất
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Người dùng từ chối cấp quyền hoặc không hỗ trợ, bỏ qua
        },
        { timeout: 5000, maximumAge: 600000 }
      );
    }
  }, []);

  const { data: branchStocks = [], isLoading, isError } = useQuery<WarehouseBranchStock[]>({
    queryKey: ['branch-stocks', variantId, userCoords?.lat, userCoords?.lng],
    queryFn: () => {
      if (!variantId) return Promise.resolve([]);
      return warehouseService.getVariantBranchStocks(variantId, userCoords);
    },
    enabled: !!variantId,
    staleTime: 10000,
  });

  // Danh sách các Tỉnh/Thành phố duy nhất từ dữ liệu kho
  const provinces = useMemo(() => {
    const set = new Set<string>();
    branchStocks.forEach((b) => {
      if (b.province && b.province.trim()) {
        set.add(b.province.trim());
      }
    });
    return Array.from(set);
  }, [branchStocks]);

  // Danh sách Quận/Huyện theo Tỉnh/Thành phố đang chọn
  const districts = useMemo(() => {
    const set = new Set<string>();
    branchStocks.forEach((b) => {
      if (selectedProvince === 'ALL' || b.province === selectedProvince) {
        if (b.district && b.district.trim()) {
          set.add(b.district.trim());
        }
      }
    });
    return Array.from(set);
  }, [branchStocks, selectedProvince]);

  // Reset quận huyện khi đổi tỉnh thành
  const handleProvinceChange = (value: string) => {
    setSelectedProvince(value);
    setSelectedDistrict('ALL');
  };

  // Lọc danh sách kho theo bộ lọc
  const filteredBranches = useMemo(() => {
    return branchStocks.filter((b) => {
      if (selectedProvince !== 'ALL' && b.province !== selectedProvince) {
        return false;
      }
      if (selectedDistrict !== 'ALL' && b.district !== selectedDistrict) {
        return false;
      }
      return true;
    });
  }, [branchStocks, selectedProvince, selectedDistrict]);

  const availableCount = useMemo(() => {
    return filteredBranches.filter((b) => b.inStock && b.quantity > 0).length;
  }, [filteredBranches]);

  if (!variantId) {
    return null;
  }

  return (
    <div
      id="branch-stock-section"
      className={`rounded-2xl border border-red-200/80 bg-gradient-to-b from-red-50/40 via-white to-white p-4 shadow-sm transition-all sm:p-5 ${className}`}
    >
      {/* Header CellphoneS Style */}
      <div className="mb-3.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
            <Store className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900 leading-tight">
              Xem chi nhánh có hàng
            </h4>
            {variantName && (
              <p className="text-xs text-gray-500">
                Phiên bản: <span className="font-medium text-gray-700">{variantName}</span>
              </p>
            )}
          </div>
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Có <strong className="text-emerald-800 font-bold">{availableCount}</strong> cửa hàng có sản phẩm
          </span>
        </div>
      </div>

      {/* Bộ lọc Tỉnh/Thành & Quận/Huyện */}
      <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Tỉnh / Thành phố</label>
          <Select
            value={selectedProvince}
            onChange={handleProvinceChange}
            className="w-full"
            size="middle"
            options={[
              { value: 'ALL', label: 'Tất cả Tỉnh / Thành' },
              ...provinces.map((p) => ({ value: p, label: p })),
            ]}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Quận / Huyện</label>
          <Select
            value={selectedDistrict}
            onChange={setSelectedDistrict}
            className="w-full"
            size="middle"
            disabled={districts.length === 0}
            options={[
              { value: 'ALL', label: 'Tất cả Quận / Huyện' },
              ...districts.map((d) => ({ value: d, label: d })),
            ]}
          />
        </div>
      </div>

      {/* Danh sách các chi nhánh */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Spin size="small" />
          <span className="ml-2 text-xs">Đang kiểm tra tồn kho các chi nhánh...</span>
        </div>
      ) : isError ? (
        <div className="py-4 text-center text-xs text-red-500">
          Không thể tải dữ liệu chi nhánh. Vui lòng thử lại sau.
        </div>
      ) : filteredBranches.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span className="text-xs text-gray-500">Không tìm thấy chi nhánh nào tại khu vực này</span>}
          className="my-3"
        />
      ) : (
        <div className="max-h-[300px] space-y-2.5 overflow-y-auto pr-1">
          {filteredBranches.map((branch) => {
            const hasStock = branch.inStock && branch.quantity > 0;
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              branch.name + ' ' + branch.address
            )}`;

            return (
              <div
                key={branch.id}
                className={`relative rounded-xl border p-3 transition-all ${
                  hasStock
                    ? 'border-gray-200 bg-white hover:border-red-300 hover:shadow-xs'
                    : 'border-dashed border-gray-200 bg-gray-50/60 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 truncate">
                        {branch.name}
                      </span>
                      {branch.distanceKm != null && (
                        <Tag color="cyan" className="!mr-0 !text-[11px] !leading-tight">
                          <Navigation className="inline h-3 w-3 mr-0.5" />
                          ~{branch.distanceKm.toFixed(1)} km
                        </Tag>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">
                      <MapPin className="inline h-3.5 w-3.5 text-gray-400 mr-1 shrink-0" />
                      {branch.address}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-xs">
                      {branch.phone && (
                        <a
                          href={`tel:${branch.phone.replace(/\s+/g, '')}`}
                          className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {branch.phone}
                        </a>
                      )}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                      >
                        <MapPin className="h-3 w-3" />
                        Bản đồ
                      </a>
                    </div>
                  </div>

                  {/* Trạng thái tồn kho tại chi nhánh */}
                  <div className="shrink-0 text-right">
                    {hasStock ? (
                      <div className="inline-flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Còn hàng
                        </span>
                        <span className="mt-0.5 text-[11px] font-semibold text-emerald-600">
                          ({branch.quantity} sản phẩm)
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                        <XCircle className="h-3.5 w-3.5 text-gray-400" />
                        Tạm hết hàng
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
