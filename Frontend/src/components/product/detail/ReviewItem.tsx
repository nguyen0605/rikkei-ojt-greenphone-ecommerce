import React, { useState } from 'react';
import { Star, CheckCircle, User } from 'lucide-react';
import type { ReviewDTO } from '@/types/api';
import {
  maskCustomerName,
  formatReviewDate,
  isVerifiedBuyer,
} from '@/utils/reviewUtils';
import ReviewImageLightbox from './ReviewImageLightbox';

export interface ReviewItemProps {
  review: ReviewDTO;
}

export const ReviewItem: React.FC<ReviewItemProps> = ({ review }) => {
  const [avatarError, setAvatarError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [brokenThumbnails, setBrokenThumbnails] = useState<Record<number, boolean>>({});

  const maskedName = maskCustomerName(review.userName);
  const isVerified = isVerifiedBuyer(review);
  const formattedDate = formatReviewDate(review.createdAt);

  const images = Array.isArray(review.images) ? review.images : [];
  const content = review.content || '';
  const isLongContent = content.length > 200;
  const displayContent =
    isLongContent && !isExpanded ? `${content.slice(0, 200)}...` : content;

  // Ký tự đầu của tên cho avatar mặc định
  const initialChar = maskedName.charAt(0).toUpperCase() || 'U';

  const handleOpenLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
  };

  const handleThumbnailError = (index: number) => {
    setBrokenThumbnails((prev) => ({ ...prev, [index]: true }));
  };

  return (
    <article
      className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5 shadow-2xs hover:border-gray-200 transition"
      aria-label={`Đánh giá của ${maskedName}`}
    >
      {/* Header: Avatar + Tên + Huy hiệu đã mua + Thời gian */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {review.userAvatar && !avatarError ? (
            <img
              src={review.userAvatar}
              alt={maskedName}
              className="h-10 w-10 rounded-full object-cover border border-gray-100 shrink-0"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 font-semibold text-sm border border-emerald-100 shrink-0 select-none"
              aria-hidden="true"
            >
              {initialChar !== 'U' ? initialChar : <User className="h-5 w-5" />}
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{maskedName}</span>

              {/* Huy hiệu chỉ hiển thị khi Backend xác nhận đã mua */}
              {isVerified && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200"
                  title="Khách hàng đã mua sản phẩm này tại GreenPhone"
                >
                  <CheckCircle className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                  <span>Đã mua hàng tại GreenPhone</span>
                </span>
              )}
            </div>

            {/* Số sao & thời gian */}
            <div className="mt-1 flex items-center gap-2.5">
              <div
                className="flex items-center gap-0.5"
                aria-label={`Đánh giá ${review.rating} sao`}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < review.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-gray-100 text-gray-200'
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              {formattedDate && (
                <span className="text-xs text-gray-400">{formattedDate}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nội dung đánh giá */}
      {content && (
        <div className="mt-3">
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line break-words">
            {displayContent}
          </p>
          {isLongContent && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 text-xs font-semibold text-green-600 hover:text-green-700 focus:outline-none"
            >
              {isExpanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
        </div>
      )}

      {/* Danh sách ảnh thực tế của sản phẩm */}
      {images.length > 0 && (
        <div className="mt-3.5">
          <p className="text-xs font-medium text-gray-500 mb-2">Hình ảnh từ người mua:</p>
          <div className="flex flex-wrap gap-2.5">
            {images.map((imgUrl, idx) => {
              if (brokenThumbnails[idx]) {
                return (
                  <div
                    key={idx}
                    className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-[10px] text-gray-400 text-center p-1"
                  >
                    Ảnh lỗi
                  </div>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleOpenLightbox(idx)}
                  className="group relative h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition hover:border-green-500"
                  aria-label={`Mở xem ảnh lớn ${idx + 1}`}
                >
                  <img
                    src={imgUrl}
                    alt={`Ảnh đính kèm ${idx + 1} của ${maskedName}`}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={() => handleThumbnailError(idx)}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox xem ảnh toàn màn hình */}
      {images.length > 0 && (
        <ReviewImageLightbox
          images={images}
          initialIndex={selectedImageIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          reviewerName={maskedName}
        />
      )}
    </article>
  );
};

export default ReviewItem;

