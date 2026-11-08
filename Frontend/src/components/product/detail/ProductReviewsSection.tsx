import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from 'antd';
import {
  MessageSquare,
  AlertCircle,
  RefreshCw,
  FilterX,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { reviewService } from '@/services/reviewService';
import type { ReviewFilterType, ReviewDTO } from '@/types/api';
import { filterReviews } from '@/utils/reviewUtils';
import RatingSummaryCard from './RatingSummaryCard';
import ReviewFilterTabs from './ReviewFilterTabs';
import ReviewItem from './ReviewItem';

export interface ProductReviewsSectionProps {
  phoneId: number;
  phoneName?: string;
  initialSize?: number;
}

const DEFAULT_INITIAL_SIZE = 5;

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  phoneId,
  phoneName,
  initialSize = DEFAULT_INITIAL_SIZE,
}) => {
  const [displayedSize, setDisplayedSize] = useState(initialSize);
  const [selectedFilter, setSelectedFilter] = useState<ReviewFilterType>('ALL');
  const [prevPhoneId, setPrevPhoneId] = useState(phoneId);

  // Reset filter và số lượng hiển thị khi đổi sang sản phẩm khác
  if (phoneId !== prevPhoneId) {
    setPrevPhoneId(phoneId);
    setDisplayedSize(initialSize);
    setSelectedFilter('ALL');
  }

  // Query thống kê đánh giá
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['reviews', 'summary', phoneId],
    queryFn: () => reviewService.summary(phoneId),
    enabled: !!phoneId,
  });

  // Query danh sách đánh giá từ Backend
  const {
    data: reviewsPage,
    isLoading: isReviewsLoading,
    isFetching: isReviewsFetching,
    isError: isReviewsError,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ['reviews', 'list', phoneId, displayedSize],
    queryFn: () =>
      reviewService.byPhone(phoneId, {
        page: 0,
        size: displayedSize,
      }),
    enabled: !!phoneId,
  });

  const rawReviews: ReviewDTO[] = useMemo(
    () => reviewsPage?.content || [],
    [reviewsPage?.content]
  );
  const totalElements = reviewsPage?.totalElements ?? summary?.totalReviews ?? 0;

  // Đếm số review có ảnh trong dữ liệu đã tải để hiển thị badge
  const withImageCount = useMemo(() => {
    return rawReviews.filter((r) => Array.isArray(r.images) && r.images.length > 0).length;
  }, [rawReviews]);

  // Lọc đánh giá theo tab đã chọn (tức thì <10ms)
  const filteredReviews = useMemo(() => {
    return filterReviews(rawReviews, selectedFilter);
  }, [rawReviews, selectedFilter]);

  const handleFilterChange = (filter: ReviewFilterType) => {
    setSelectedFilter(filter);
    setDisplayedSize(initialSize);
  };

  const handleLoadMore = () => {
    setDisplayedSize((prev) => prev + initialSize);
  };

  const handleRetry = () => {
    refetchSummary();
    refetchReviews();
  };

  const isLoading = isSummaryLoading || (isReviewsLoading && rawReviews.length === 0);
  const isError = isSummaryError || isReviewsError;
  const hasNoReviewsAtAll = !isLoading && !isError && totalElements === 0;
  const hasNoFilteredMatches = !isLoading && !isError && !hasNoReviewsAtAll && filteredReviews.length === 0;
  const hasMore = totalElements > rawReviews.length;

  return (
    <section id="danh-gia" aria-label="Khu vực đánh giá sản phẩm" className="mt-12 space-y-6">
      {/* Tiêu đề mục đánh giá */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Đánh giá & Nhận xét
            {phoneName ? (
              <span className="hidden sm:inline font-normal text-gray-500 text-lg ml-2">
                — {phoneName}
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Trải nghiệm thực tế từ những khách hàng đã mua sắm tại GreenPhone
          </p>
        </div>
        {summary && summary.totalReviews > 0 && (
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs sm:text-sm font-semibold text-green-700 border border-green-200 shadow-2xs">
            {summary.totalReviews} đánh giá
          </span>
        )}
      </div>

      {/* 1. RatingSummaryCard: Luôn hiển thị tổng quan sao */}
      <RatingSummaryCard
        summary={summary}
        selectedFilter={selectedFilter}
        onSelectFilter={handleFilterChange}
        isLoading={isSummaryLoading}
      />

      {/* Trạng thái lỗi (Error State) */}
      {isError && (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/50 p-8 text-center"
        >
          <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
          <h3 className="text-base font-semibold text-gray-900">Không thể tải đánh giá</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md">
            Đã có lỗi xảy ra trong quá trình tải dữ liệu nhận xét. Vui lòng kiểm tra kết nối mạng và thử lại.
          </p>
          <Button
            type="primary"
            onClick={handleRetry}
            icon={<RefreshCw className="h-4 w-4" />}
            className="mt-4 !rounded-lg !bg-green-600 hover:!bg-green-700"
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Trạng thái trống (Empty State) - Sản phẩm chưa có review nào */}
      {hasNoReviewsAtAll && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xs text-gray-400 mb-3">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Chưa có đánh giá nào</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-sm">
            Sản phẩm này hiện chưa nhận được nhận xét nào. Bạn sẽ là một trong những khách hàng đầu tiên chia sẻ cảm nhận!
          </p>
        </div>
      )}

      {/* Khi có đánh giá: Hiển thị bộ lọc và danh sách */}
      {!hasNoReviewsAtAll && !isError && (
        <div className="space-y-4">
          {/* 2. ReviewFilterTabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
            <ReviewFilterTabs
              currentFilter={selectedFilter}
              onFilterChange={handleFilterChange}
              summary={summary}
              withImageCount={withImageCount}
              disabled={isLoading}
            />
          </div>

          {/* 3. Danh sách Review Items / Loading / Filter Empty */}
          {isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Đang tải danh sách nhận xét">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-xl border border-gray-100 bg-white p-5 animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-20 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-4 w-1/2 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : hasNoFilteredMatches ? (
            /* Empty state cho bộ lọc */
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-8 text-center">
              <FilterX className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-800">
                Không tìm thấy đánh giá nào phù hợp với bộ lọc{' '}
                <span className="text-green-600 font-semibold">
                  {selectedFilter === 'WITH_IMAGE'
                    ? 'Có hình ảnh'
                    : typeof selectedFilter === 'number'
                      ? `${selectedFilter} sao`
                      : 'đã chọn'}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setSelectedFilter('ALL')}
                className="mt-3 text-xs font-semibold text-green-600 hover:text-green-700 underline focus:outline-none"
              >
                Xem tất cả đánh giá
              </button>
            </div>
          ) : (
            /* Danh sách ReviewItem */
            <div className="space-y-3">
              {filteredReviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </div>
          )}

          {/* 4. Nút Xem thêm nhận xét (CellphoneS / Modern PDP Pattern) */}
          {!isLoading && hasMore && selectedFilter === 'ALL' && (
            <div className="flex flex-col items-center justify-center gap-2 pt-4">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isReviewsFetching}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-7 py-2.5 text-sm font-semibold text-gray-700 shadow-2xs hover:border-green-500 hover:text-green-600 hover:bg-green-50/20 active:scale-98 transition focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60 cursor-pointer"
              >
                {isReviewsFetching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                    <span>Đang tải thêm...</span>
                  </>
                ) : (
                  <>
                    <span>
                      Xem thêm đánh giá ({totalElements - rawReviews.length} còn lại)
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
              <span className="text-xs text-gray-400">
                Đang hiển thị {rawReviews.length} trên tổng số {totalElements} đánh giá
              </span>
            </div>
          )}

          {!isLoading && !hasMore && totalElements > initialSize && selectedFilter === 'ALL' && (
            <p className="text-center text-xs text-gray-400 pt-3">
              Đã hiển thị tất cả {totalElements} đánh giá
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default ProductReviewsSection;
