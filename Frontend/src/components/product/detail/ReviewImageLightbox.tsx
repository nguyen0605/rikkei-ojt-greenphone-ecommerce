import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';

export interface ReviewImageLightboxProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  reviewerName?: string;
}

export const ReviewImageLightbox: React.FC<ReviewImageLightboxProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  reviewerName,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [hasError, setHasError] = useState(false);
  const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);

  // Đồng bộ index khi prop initialIndex thay đổi (theo chuẩn React: adjust state on render)
  if (initialIndex !== prevInitialIndex) {
    setPrevInitialIndex(initialIndex);
    setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
    setHasError(false);
  }

  const handlePrev = useCallback(() => {
    setHasError(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setHasError(false);
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Keyboard navigation & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || images.length === 0) return null;

  const currentImageUrl = images[currentIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh đánh giá"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tracking-wide">
            Ảnh {currentIndex + 1} / {images.length}
          </span>
          {reviewerName && (
            <span className="hidden sm:inline-block text-xs text-gray-300 border-l border-gray-600 pl-3">
              Đánh giá của: {reviewerName}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng xem ảnh"
          className="rounded-full p-2 text-white/80 hover:text-white hover:bg-white/20 transition focus:outline-none focus:ring-2 focus:ring-white"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Main Image Container */}
      <div
        className="relative flex items-center justify-center p-4 max-w-5xl max-h-[85vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {hasError ? (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-900/60 rounded-xl text-gray-400 gap-2">
            <ImageOff className="h-12 w-12 text-gray-500" />
            <span className="text-sm">Không thể tải ảnh này</span>
          </div>
        ) : (
          <img
            src={currentImageUrl}
            alt={`Ảnh đánh giá ${currentIndex + 1}`}
            className="max-h-[80vh] max-w-full rounded-lg object-contain select-none shadow-2xl transition-all"
            onError={() => setHasError(true)}
          />
        )}
      </div>

      {/* Prev / Next Buttons */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Ảnh trước"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2.5 bg-black/50 text-white hover:bg-black/75 hover:scale-105 transition focus:outline-none focus:ring-2 focus:ring-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Ảnh tiếp theo"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2.5 bg-black/50 text-white hover:bg-black/75 hover:scale-105 transition focus:outline-none focus:ring-2 focus:ring-white"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
};

export default ReviewImageLightbox;
