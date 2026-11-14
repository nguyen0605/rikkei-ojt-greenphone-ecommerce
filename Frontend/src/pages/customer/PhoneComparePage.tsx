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
} from 'lucide-react';
import { ROUTES } from '@/routes/routePaths';
import { phoneComparisonService } from '@/services/phoneComparisonService';
import type { PhoneComparisonResponseDTO, ComparedPhoneDTO, PhoneDTO } from '@/types/api';
import CompareSearchBar from '@/components/compare/CompareSearchBar';
import CompareSpecTable from '@/components/compare/CompareSpecTable';
import CompareStickyHeader from '@/components/compare/CompareStickyHeader';

export const PhoneComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const id1Param = searchParams.get('id1');
  const id2Param = searchParams.get('id2');

  const id1 = id1Param ? Number(id1Param) : null;
  const id2 = id2Param ? Number(id2Param) : null;

  const [comparisonData, setComparisonData] = useState<PhoneComparisonResponseDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [activeSlotToSelect, setActiveSlotToSelect] = useState<0 | 1>(0);

  const [showStickyHeader, setShowStickyHeader] = useState(false);

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
      setError(null);
      return;
    }

    // Nếu cả 2 ID trùng nhau -> Tự động sửa lỗi loại bỏ ID trùng
    if (id1 && id2 && id1 === id2) {
      setError('Không thể so sánh cùng một sản phẩm ở cả hai vị trí.');
      setComparisonData(null);
      return;
    }

    const fetchComparison = async () => {
      setLoading(true);
      setError(null);
      try {
        const idsToFetch: number[] = [];
        if (id1 && !isNaN(id1)) idsToFetch.push(id1);
        if (id2 && !isNaN(id2)) idsToFetch.push(id2);

        if (idsToFetch.length >= 2) {
          const data = await phoneComparisonService.compare(idsToFetch);
          setComparisonData(data);
        } else {
          // Chỉ chọn 1 máy: không đủ 2 máy để so sánh trọn vẹn nhưng vẫn hiển thị thông tin máy đó
          // Gọi compare với chính nó bị chặn, nên ta chỉ hiển thị placeholder cho máy thứ hai
          setComparisonData(null);
        }
      } catch (err: any) {
        console.error('Failed to load comparison data:', err);
        setError(err.message || 'Không thể tải dữ liệu so sánh. Vui lòng thử lại sau.');
        setComparisonData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [id1, id2]);

  // Handle swapping slot 1 and slot 2
  const handleSwap = () => {
    if (!id1 && !id2) return;
    const nextParams = new URLSearchParams(searchParams);
    if (id2) nextParams.set('id1', String(id2));
    else nextParams.delete('id1');

    if (id1) nextParams.set('id2', String(id1));
    else nextParams.delete('id2');

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
    if (activeSlotToSelect === 0) {
      // Slot 1
      if (id2 === phone.id) {
        alert('Không thể so sánh cùng một sản phẩm ở cả hai vị trí.');
        return;
      }
      nextParams.set('id1', String(phone.id));
    } else {
      // Slot 2
      if (id1 === phone.id) {
        alert('Không thể so sánh cùng một sản phẩm ở cả hai vị trí.');
        return;
      }
      nextParams.set('id2', String(phone.id));
    }
    setSearchParams(nextParams);
    setSearchModalOpen(false);
  };

  const phone1: ComparedPhoneDTO | undefined = comparisonData?.phones?.[0];
  const phone2: ComparedPhoneDTO | undefined = comparisonData?.phones?.[1];

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
                Đặt 2 dòng máy lên bàn cân để chọn ra sản phẩm phù hợp nhất với nhu cầu của bạn
              </p>
            </div>

            {/* Differences Filter Toggle & Swap Button */}
            {comparisonData && comparisonData.phones.length >= 2 && (
              <div className="flex items-center gap-4 flex-wrap">
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

                <button
                  type="button"
                  onClick={handleSwap}
                  data-testid="swap-phones-btn"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 hover:border-emerald-500 transition-colors shadow-sm"
                >
                  <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
                  <span>Đổi vị trí</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-4 text-red-700 dark:text-red-300 text-sm flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.delete('id1');
                nextParams.delete('id2');
                setSearchParams(nextParams);
              }}
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
            <div className="absolute top-3 left-4 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Sản phẩm 1
            </div>

            {phone1 ? (
              <div className="pt-6">
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
            <div className="absolute top-3 left-4 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              Sản phẩm 2
            </div>

            {phone2 ? (
              <div className="pt-6">
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
              Đang tải dữ liệu so sánh thông số kỹ thuật...
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

        {/* Empty state when fewer than 2 phones selected */}
        {!loading && (!comparisonData || comparisonData.phones.length < 2) && !error && (
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
        width={560}
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
