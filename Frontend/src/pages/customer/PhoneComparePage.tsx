import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Modal } from 'antd';
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Star,
  Smartphone,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { ROUTES } from '@/routes/routePaths';
import { phoneService } from '@/services';
import {
  phoneComparisonService,
  getStoredCompareSlots,
  saveStoredCompareSlots,
  clearStoredCompareSlots,
} from '@/services/phoneComparisonService';
import type { PhoneComparisonResponseDTO, ComparedPhoneDTO, PhoneDTO, PhoneDetailDTO } from '@/types/api';
import CompareSearchBar from '@/components/compare/CompareSearchBar';
import CompareSpecTable from '@/components/compare/CompareSpecTable';
import CompareStickyHeader from '@/components/compare/CompareStickyHeader';

function toComparedPhone(phone: PhoneDetailDTO | PhoneDTO): ComparedPhoneDTO {
  const detail = phone as PhoneDetailDTO;
  const variants = detail.variants || [];
  const minPrice = variants.length > 0
    ? Math.min(...variants.map((v) => v.price).filter(Boolean))
    : (phone as any).lowestPrice || null;
  const minDiscountPrice = variants.filter((v) => v.discountPrice).length > 0
    ? Math.min(...variants.map((v) => v.discountPrice!).filter(Boolean))
    : null;
  const maxPrice = variants.length > 0
    ? Math.max(...variants.map((v) => v.price).filter(Boolean))
    : minPrice;

  const mainImageUrl =
    detail.images?.find((img) => img.isMain)?.imageUrl ||
    detail.images?.[0]?.imageUrl ||
    phone.mainImageUrl ||
    null;

  return {
    id: phone.id,
    name: phone.name,
    brandId: phone.brandId,
    brandName: phone.brandName,
    mainImageUrl,
    minPrice,
    maxPrice,
    minDiscountPrice,
    screen: phone.screen,
    os: phone.os,
    chip: phone.chip,
    rearCamera: phone.rearCamera,
    frontCamera: phone.frontCamera,
    battery: phone.battery,
    warranty: phone.warranty,
    ramOptions: Array.from(new Set(variants.map((v) => v.ram).filter(Boolean))),
    storageOptions: Array.from(new Set(variants.map((v) => v.storage).filter(Boolean))),
    colorOptions: Array.from(new Set(variants.map((v) => v.color).filter(Boolean))),
    avgRating: detail.avgRating || 0,
    reviewCount: detail.reviewCount || 0,
    totalStock: variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0),
  };
}

export const PhoneComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const id1Param = searchParams.get('id1');
  const id2Param = searchParams.get('id2');

  const id1 = id1Param ? Number(id1Param) : null;
  const id2 = id2Param ? Number(id2Param) : null;

  const [comparisonData, setComparisonData] = useState<PhoneComparisonResponseDTO | null>(null);
  const [singlePhone1, setSinglePhone1] = useState<ComparedPhoneDTO | null>(null);
  const [singlePhone2, setSinglePhone2] = useState<ComparedPhoneDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [activeSlotToSelect, setActiveSlotToSelect] = useState<0 | 1>(0);

  const [showStickyHeader, setShowStickyHeader] = useState(false);

  // Khôi phục tự động từ localStorage khi người dùng chuyển trang quay lại /so-sanh
  useEffect(() => {
    if (!id1Param && !id2Param) {
      const stored = getStoredCompareSlots();
      if (stored.id1 || stored.id2) {
        const next = new URLSearchParams();
        if (stored.id1) next.set('id1', String(stored.id1));
        if (stored.id2) next.set('id2', String(stored.id2));
        setSearchParams(next, { replace: true });
      }
    }
  }, [id1Param, id2Param, setSearchParams]);

  // Lưu bền vững vào localStorage mỗi khi có sản phẩm được chọn
  useEffect(() => {
    if (id1 || id2) {
      saveStoredCompareSlots({ id1, id2 });
    }
  }, [id1, id2]);

  // Monitor scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 380) {
        setShowStickyHeader(true);
      } else {
        setShowStickyHeader(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch comparison data whenever id1 or id2 changes
  useEffect(() => {
    if (!id1 && !id2) {
      setComparisonData(null);
      setSinglePhone1(null);
      setSinglePhone2(null);
      setError(null);
      return;
    }

    // Nếu cả 2 ID trùng nhau -> Tự động báo lỗi chặn trùng
    if (id1 && id2 && id1 === id2) {
      setError('Không thể so sánh cùng một sản phẩm ở cả hai vị trí.');
      setComparisonData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (id1 && id2) {
          // Cả 2 máy được chọn -> Lấy toàn bộ dữ liệu so sánh và đối chiếu thông số
          const data = await phoneComparisonService.compare([id1, id2]);
          setComparisonData(data);
          setSinglePhone1(null);
          setSinglePhone2(null);
        } else if (id1 && !id2) {
          // Chỉ chọn sản phẩm 1 -> nạp chi tiết sản phẩm 1 hiển thị ngay lập tức
          setComparisonData(null);
          setSinglePhone2(null);
          if (!singlePhone1 || singlePhone1.id !== id1) {
            const detail = await phoneService.detail(id1);
            setSinglePhone1(toComparedPhone(detail));
          }
        } else if (!id1 && id2) {
          // Chỉ chọn sản phẩm 2 -> nạp chi tiết sản phẩm 2 hiển thị ngay lập tức
          setComparisonData(null);
          setSinglePhone1(null);
          if (!singlePhone2 || singlePhone2.id !== id2) {
            const detail = await phoneService.detail(id2);
            setSinglePhone2(toComparedPhone(detail));
          }
        }
      } catch (err: any) {
        console.error('Failed to load comparison data:', err);
        setError(err.message || 'Không thể tải dữ liệu so sánh. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id1, id2]);

  // Handle swapping slot 1 and slot 2
  const handleSwap = () => {
    if (!id1 && !id2) return;
    const nextParams = new URLSearchParams(searchParams);
    if (id2) nextParams.set('id1', String(id2));
    else nextParams.delete('id1');

    if (id1) nextParams.set('id2', String(id1));
    else nextParams.delete('id2');

    // Đồng bộ state single phones khi đảo vị trí
    const temp1 = singlePhone1;
    setSinglePhone1(singlePhone2);
    setSinglePhone2(temp1);

    saveStoredCompareSlots({ id1: id2, id2: id1 });
    setSearchParams(nextParams);
  };

  // Xóa một vị trí máy cụ thể
  const handleRemoveSlot = (slot: 0 | 1) => {
    const nextParams = new URLSearchParams(searchParams);
    if (slot === 0) {
      nextParams.delete('id1');
      setSinglePhone1(null);
      saveStoredCompareSlots({ id1: null, id2 });
    } else {
      nextParams.delete('id2');
      setSinglePhone2(null);
      saveStoredCompareSlots({ id1, id2: null });
    }
    setComparisonData(null);
    setSearchParams(nextParams);
  };

  // Đặt lại toàn bộ (Xóa cả 2 máy khỏi danh sách so sánh)
  const handleResetAll = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('id1');
    nextParams.delete('id2');
    setSinglePhone1(null);
    setSinglePhone2(null);
    setComparisonData(null);
    clearStoredCompareSlots();
    setSearchParams(nextParams);
  };

  // Open search modal to change a specific slot
  const handleOpenSearchModal = (slot: number) => {
    setActiveSlotToSelect(slot === 1 ? 1 : 0);
    setSearchModalOpen(true);
  };

  // When a phone is selected in search modal
  const handleSelectPhone = (phone: PhoneDTO) => {
    const nextParams = new URLSearchParams(searchParams);
    const converted = toComparedPhone(phone);

    if (activeSlotToSelect === 0) {
      // Slot 1
      if (id2 === phone.id) {
        alert('Không thể so sánh cùng một sản phẩm ở cả hai vị trí.');
        return;
      }
      setSinglePhone1(converted);
      nextParams.set('id1', String(phone.id));
      saveStoredCompareSlots({ id1: phone.id, id2 });
    } else {
      // Slot 2
      if (id1 === phone.id) {
        alert('Không thể so sánh cùng một sản phẩm ở cả hai vị trí.');
        return;
      }
      setSinglePhone2(converted);
      nextParams.set('id2', String(phone.id));
      saveStoredCompareSlots({ id1, id2: phone.id });
    }
    setSearchParams(nextParams);
    setSearchModalOpen(false);
  };

  const phone1: ComparedPhoneDTO | undefined = comparisonData?.phones?.[0] || singlePhone1 || undefined;
  const phone2: ComparedPhoneDTO | undefined = comparisonData?.phones?.[1] || singlePhone2 || undefined;

  const differencesCount = comparisonData?.differencesKeys?.length ?? 0;

  const disabledIdsForActiveSlot = useMemo(() => {
    const list: number[] = [];
    if (activeSlotToSelect === 0 && id2) list.push(id2);
    if (activeSlotToSelect === 1 && id1) list.push(id1);
    return list;
  }, [activeSlotToSelect, id1, id2]);

  const formatPrice = (price?: number | null) => {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* Sticky Header */}
      {comparisonData && comparisonData.phones.length >= 2 && (
        <CompareStickyHeader
          phones={comparisonData.phones}
          onSwap={handleSwap}
          onChangeSlot={handleOpenSearchModal}
          showDifferencesOnly={showDifferencesOnly}
          onToggleDifferencesOnly={setShowDifferencesOnly}
          differencesCount={differencesCount}
          visible={showStickyHeader}
        />
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-6" aria-label="Breadcrumb">
          <Link to={ROUTES.HOME} className="hover:text-emerald-600 transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to={ROUTES.PRODUCTS} className="hover:text-emerald-600 transition-colors">
            Điện thoại
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">So sánh sản phẩm</span>
        </nav>

        {/* Header Title & Controls */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                <Smartphone className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                So sánh cấu hình &amp; thông số điện thoại
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Đặt 2 dòng máy lên bàn cân để chọn ra sản phẩm phù hợp nhất với nhu cầu của bạn (dữ liệu được tự động lưu khi chuyển trang)
              </p>
            </div>

            {/* Controls Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              {comparisonData && comparisonData.phones.length >= 2 && (
                <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl hover:border-emerald-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={showDifferencesOnly}
                    onChange={(e) => setShowDifferencesOnly(e.target.checked)}
                    className="sr-only peer"
                    data-testid="page-toggle-diff"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Chỉ xem điểm khác biệt ({differencesCount})
                  </span>
                </label>
              )}

              {(phone1 || phone2) && (
                <>
                  <button
                    type="button"
                    onClick={handleSwap}
                    data-testid="swap-phones-btn"
                    title="Đổi vị trí 2 điện thoại"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 hover:border-emerald-500 transition-colors shadow-sm"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
                    <span>Đổi vị trí</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAll}
                    data-testid="reset-all-compare-btn"
                    title="Xóa tất cả sản phẩm khỏi so sánh"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Xóa tất cả</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-4 text-red-700 dark:text-red-300 text-sm flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={handleResetAll}
              className="text-xs font-semibold underline text-red-800 dark:text-red-200"
            >
              Đặt lại
            </button>
          </div>
        )}

        {/* Top Product Cards (Slot 1 & Slot 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative">
          {/* Swap button floating in the middle on desktop */}
          {phone1 && phone2 && (
            <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <button
                type="button"
                onClick={handleSwap}
                title="Đổi vị trí 2 điện thoại"
                className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-emerald-300"
              >
                <ArrowLeftRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Slot 1 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden" data-testid="compare-slot-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Sản phẩm 1
              </span>
              {phone1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(0)}
                  title="Xóa máy này khỏi so sánh"
                  data-testid="remove-slot-1-btn"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {phone1 ? (
              <div className="pt-4">
                <div className="h-52 flex items-center justify-center mb-4">
                  {phone1.mainImageUrl ? (
                    <img
                      src={phone1.mainImageUrl}
                      alt={phone1.name}
                      className="max-h-full max-w-full object-contain drop-shadow-md hover:scale-105 transition-transform"
                    />
                  ) : (
                    <Smartphone className="w-24 h-24 text-slate-300" />
                  )}
                </div>

                <div className="text-center">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {phone1.brandName}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 line-clamp-2">
                    {phone1.name}
                  </h3>

                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(phone1.minDiscountPrice || phone1.minPrice)}
                    </span>
                    {phone1.minDiscountPrice && phone1.minPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatPrice(phone1.minPrice)}
                      </span>
                    )}
                  </div>

                  {/* Rating & Stock */}
                  <div className="mt-3 flex items-center justify-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {phone1.avgRating?.toFixed(1) || '5.0'}
                    </span>
                    <span>&bull;</span>
                    <span>{phone1.reviewCount || 0} đánh giá</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Còn hàng
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenSearchModal(0)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                    >
                      Đổi điện thoại
                    </button>
                    <Link
                      to={ROUTES.PRODUCT_DETAIL(String(phone1.id))}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Xem chi tiết</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-8 pb-4 text-center my-auto flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-3">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  Chưa chọn điện thoại thứ nhất
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Chọn máy đầu tiên để bắt đầu đối chiếu thông số kỹ thuật chi tiết
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenSearchModal(0)}
                  className="mt-5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Chọn điện thoại</span>
                </button>
              </div>
            )}
          </div>

          {/* Slot 2 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden" data-testid="compare-slot-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                Sản phẩm 2
              </span>
              {phone2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(1)}
                  title="Xóa máy này khỏi so sánh"
                  data-testid="remove-slot-2-btn"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {phone2 ? (
              <div className="pt-4">
                <div className="h-52 flex items-center justify-center mb-4">
                  {phone2.mainImageUrl ? (
                    <img
                      src={phone2.mainImageUrl}
                      alt={phone2.name}
                      className="max-h-full max-w-full object-contain drop-shadow-md hover:scale-105 transition-transform"
                    />
                  ) : (
                    <Smartphone className="w-24 h-24 text-slate-300" />
                  )}
                </div>

                <div className="text-center">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {phone2.brandName}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 line-clamp-2">
                    {phone2.name}
                  </h3>

                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                      {formatPrice(phone2.minDiscountPrice || phone2.minPrice)}
                    </span>
                    {phone2.minDiscountPrice && phone2.minPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatPrice(phone2.minPrice)}
                      </span>
                    )}
                  </div>

                  {/* Rating & Stock */}
                  <div className="mt-3 flex items-center justify-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {phone2.avgRating?.toFixed(1) || '5.0'}
                    </span>
                    <span>&bull;</span>
                    <span>{phone2.reviewCount || 0} đánh giá</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Còn hàng
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenSearchModal(1)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      Đổi điện thoại
                    </button>
                    <Link
                      to={ROUTES.PRODUCT_DETAIL(String(phone2.id))}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Xem chi tiết</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-8 pb-4 text-center my-auto flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-3">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  Chưa chọn điện thoại thứ hai
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Chọn máy thứ hai để so sánh trực tiếp bảng thông số kỹ thuật song song
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenSearchModal(1)}
                  className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Chọn điện thoại</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 mb-8">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Đang tải dữ liệu thông số kỹ thuật...
            </p>
          </div>
        )}

        {/* Comparison Spec Table */}
        {!loading && comparisonData && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Bảng đối chiếu thông số chi tiết
              </h2>
              {showDifferencesOnly && (
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                  Đang lọc: {differencesCount} điểm khác biệt
                </span>
              )}
            </div>

            <CompareSpecTable
              phones={comparisonData.phones}
              specGroups={comparisonData.specGroups}
              showDifferencesOnly={showDifferencesOnly}
            />
          </div>
        )}

        {/* Prompt banner when only 1 phone is selected */}
        {!loading && !comparisonData && (phone1 || phone2) && !error && (
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl p-8 text-center border border-emerald-200/60 dark:border-slate-700 mb-8 shadow-sm">
            <Smartphone className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2.5" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {phone1 ? `Bạn đã chọn "${phone1.name}"` : `Bạn đã chọn "${phone2?.name}"`}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
              Vui lòng chọn thêm sản phẩm ở ô còn lại để mở khóa toàn bộ bảng đối chiếu thông số kỹ thuật song song!
            </p>
            <button
              type="button"
              onClick={() => handleOpenSearchModal(phone1 ? 1 : 0)}
              className="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 shadow transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>{phone1 ? 'Chọn Sản phẩm 2 ngay' : 'Chọn Sản phẩm 1 ngay'}</span>
            </button>
          </div>
        )}

        {/* Empty state when 0 phones selected */}
        {!loading && !comparisonData && !phone1 && !phone2 && !error && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 mb-8">
            <Smartphone className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Vui lòng chọn đủ 2 điện thoại để bắt đầu so sánh
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Bạn có thể nhấn vào nút &ldquo;Chọn điện thoại&rdquo; ở từng ô phía trên hoặc chọn từ trang danh sách sản phẩm.
            </p>
          </div>
        )}
      </div>

      {/* Modal Chọn / Đổi điện thoại */}
      <Modal
        title={`Chọn điện thoại cho ${activeSlotToSelect === 0 ? 'Sản phẩm 1' : 'Sản phẩm 2'}`}
        open={searchModalOpen}
        onCancel={() => setSearchModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={620}
      >
        <div className="py-2">
          <p className="text-xs text-slate-500 mb-3">
            Gõ tên điện thoại hoặc hãng để tìm kiếm (sản phẩm đã chọn ở vị trí kia sẽ tự động bị vô hiệu hóa):
          </p>
          <CompareSearchBar
            onSelectPhone={handleSelectPhone}
            disabledPhoneIds={disabledIdsForActiveSlot}
            placeholder="Nhập tên điện thoại (ví dụ: iPhone 15, S24 Ultra, Reno...)"
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default PhoneComparePage;
