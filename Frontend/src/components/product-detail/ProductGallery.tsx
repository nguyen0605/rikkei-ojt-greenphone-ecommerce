import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, ImageOff } from 'lucide-react';
import type { PhoneImageDTO } from '@/types/api';
import { cn } from '@/utils';

export interface ProductGalleryProps {
  images: (string | PhoneImageDTO | { id?: number | string; imageUrl: string })[];
  thumbnail?: string;
  productName: string;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  className?: string;
}

interface NormalizedImage {
  id: string | number;
  url: string;
}

/**
 * Component hiển thị bộ sưu tập ảnh sản phẩm với:
 * 1. Image Zoom on Hover (kính lúp tỉ lệ nội tại mượt mà, giới hạn trong khung hình, vô hiệu trên thiết bị cảm ứng)
 * 2. Lightbox Modal toàn màn hình (Next/Prev, phím mũi tên, phím Escape, vuốt cảm ứng trên di động, khóa cuộn trang, phục hồi focus)
 * 3. Hỗ trợ responsive, đồng bộ hai chiều với Variant Selector qua selectedIndex / onSelectIndex
 */
export default function ProductGallery({
  images,
  thumbnail,
  productName,
  selectedIndex,
  onSelectIndex,
  className,
}: ProductGalleryProps) {
  // ── Chuẩn hóa danh sách ảnh (string hoặc PhoneImageDTO) ──
  const normalizedImages: NormalizedImage[] = useMemo(() => {
    const list: NormalizedImage[] = [];
    if (images && images.length > 0) {
      images.forEach((img, idx) => {
        if (typeof img === 'string' && img.trim()) {
          list.push({ id: idx, url: img });
        } else if (typeof img === 'object' && img?.imageUrl) {
          list.push({ id: img.id ?? idx, url: img.imageUrl });
        }
      });
    }
    if (list.length === 0 && thumbnail) {
      list.push({ id: 'thumb', url: thumbnail });
    }
    if (list.length === 0) {
      list.push({ id: 'placeholder', url: '' });
    }
    return list;
  }, [images, thumbnail]);

  // ── Quản lý active index ──
  const [internalActive, setInternalActive] = useState(0);
  const active = typeof selectedIndex === 'number' && selectedIndex >= 0 && selectedIndex < normalizedImages.length
    ? selectedIndex
    : Math.min(internalActive, Math.max(0, normalizedImages.length - 1));

  const setActiveImage = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, normalizedImages.length - 1));
      setInternalActive(clamped);
      onSelectIndex?.(clamped);
    },
    [normalizedImages.length, onSelectIndex]
  );

  // ── Zoom on Hover State ──
  const [isHovered, setIsHovered] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [supportsHover, setSupportsHover] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    }
    return false;
  });
  const [imageErrorMap, setImageErrorMap] = useState<Record<string | number, boolean>>({});

  useEffect(() => {
    // Lắng nghe thay đổi thiết bị / media query
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
      const listener = (e: MediaQueryListEvent) => setSupportsHover(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!supportsHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Tính phần trăm vị trí chuột trong khung ảnh (0 - 100%)
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const handleMouseEnter = () => {
    if (supportsHover) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setZoomPos({ x: 50, y: 50 });
  };

  // ── Lightbox Modal State ──
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const openLightbox = useCallback((e?: React.SyntheticEvent<HTMLElement>) => {
    if (e) {
      e.stopPropagation();
      triggerRef.current = e.currentTarget;
    }
    setIsLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    // Khôi phục focus cho trigger element
    if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
      triggerRef.current.focus();
    }
  }, []);

  const goToPrev = useCallback(() => {
    setActiveImage(active === 0 ? normalizedImages.length - 1 : active - 1);
  }, [active, normalizedImages.length, setActiveImage]);

  const goToNext = useCallback(() => {
    setActiveImage(active === normalizedImages.length - 1 ? 0 : active + 1);
  }, [active, normalizedImages.length, setActiveImage]);

  // Khóa cuộn trang khi Lightbox mở và hỗ trợ phím điều hướng
  useEffect(() => {
    if (!isLightboxOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, closeLightbox, goToPrev, goToNext]);

  // Xử lý vuốt màn hình cảm ứng trong Lightbox
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const distance = touchStartXRef.current - touchEndXRef.current;
      const minSwipeDistance = 50;
      if (distance > minSwipeDistance) {
        goToNext(); // Vuốt sang trái -> chuyển ảnh tiếp
      } else if (distance < -minSwipeDistance) {
        goToPrev(); // Vuốt sang phải -> quay lại ảnh trước
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  const currentImage = normalizedImages[active] || { id: '0', url: '' };
  const hasMultipleImages = normalizedImages.length > 1;
  const isCurrentImgError = !currentImage.url || imageErrorMap[currentImage.id];

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Khung ảnh chính với Zoom Hover & Nút mở Lightbox */}
      <div
        data-testid="main-image-container"
        className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 cursor-zoom-in"
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={openLightbox}
        role="button"
        tabIndex={0}
        aria-label={`Xem ảnh lớn: ${productName}. Nhấn để mở toàn màn hình.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox(e);
          }
        }}
      >
        {isCurrentImgError ? (
          <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
            <ImageOff className="h-12 w-12 stroke-1 mb-2" />
            <span className="text-sm">Hình ảnh không khả dụng</span>
          </div>
        ) : (
          <img
            data-testid="main-product-image"
            src={currentImage.url}
            alt={`${productName} - Ảnh ${active + 1}`}
            width={600}
            height={600}
            loading="eager"
            onError={() => setImageErrorMap((prev) => ({ ...prev, [currentImage.id]: true }))}
            className={cn(
              'h-full w-full object-contain select-none transition-transform duration-200 ease-out will-change-transform',
              isHovered && supportsHover ? 'scale-[2.2]' : 'scale-100'
            )}
            style={{
              transformOrigin: isHovered && supportsHover ? `${zoomPos.x}% ${zoomPos.y}%` : 'center center',
            }}
          />
        )}

        {/* Nút phóng to Lightbox ở góc trên bên phải */}
        <button
          type="button"
          onClick={openLightbox}
          aria-label="Phóng to ảnh toàn màn hình"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {/* Gợi ý phóng to ở chân ảnh trên desktop */}
        {supportsHover && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Rê chuột để soi chi tiết • Nhấp để phóng to
          </div>
        )}
      </div>

      {/* Dải ảnh nhỏ thu nhỏ (Thumbnails) */}
      {hasMultipleImages && (
        <div
          data-testid="thumbnail-strip"
          className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1 no-scrollbar"
        >
          {normalizedImages.map((img, i) => {
            const isError = !img.url || imageErrorMap[img.id];
            const isActive = i === active;
            return (
              <button
                key={img.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImage(i);
                }}
                aria-label={`Xem ảnh ${i + 1} của ${productName}`}
                className={cn(
                  'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-green-500',
                  isActive
                    ? 'border-green-500 shadow-sm ring-2 ring-green-500/20'
                    : 'border-gray-200 hover:border-green-300 opacity-70 hover:opacity-100'
                )}
              >
                {isError ? (
                  <div className="flex h-full w-full items-center justify-center text-gray-400 bg-gray-100">
                    <ImageOff className="h-5 w-5" />
                  </div>
                ) : (
                  <img
                    src={img.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setImageErrorMap((prev) => ({ ...prev, [img.id]: true }))}
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── LIGHTBOX MODAL ── */}
      {isLightboxOpen && (
        <div
          data-testid="lightbox-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Xem ảnh lớn: ${productName}`}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 p-4 sm:p-6 backdrop-blur-md"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header Lightbox */}
          <div
            className="flex w-full max-w-6xl items-center justify-between text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-300">
                {active + 1} / {normalizedImages.length}
              </span>
              <span className="hidden text-sm text-gray-400 sm:inline">•</span>
              <span className="hidden truncate text-sm font-medium text-gray-200 sm:inline max-w-md">
                {productName}
              </span>
            </div>

            <button
              data-testid="lightbox-close-button"
              type="button"
              onClick={closeLightbox}
              aria-label="Đóng xem ảnh"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Vùng hiển thị ảnh chính lớn */}
          <div
            className="relative flex flex-1 w-full max-w-5xl items-center justify-center overflow-hidden my-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút Prev */}
            {hasMultipleImages && (
              <button
                data-testid="lightbox-prev-button"
                type="button"
                onClick={goToPrev}
                aria-label="Ảnh trước"
                className="absolute left-2 sm:left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Ảnh lớn trong Lightbox */}
            {isCurrentImgError ? (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <ImageOff className="h-16 w-16 stroke-1 mb-3" />
                <p className="text-sm">Hình ảnh không tải được</p>
              </div>
            ) : (
              <img
                data-testid="lightbox-current-image"
                src={currentImage.url}
                alt={`${productName} - Ảnh phóng to ${active + 1}`}
                className="max-h-[75vh] max-w-[90vw] object-contain transition-all duration-200 select-none"
              />
            )}

            {/* Nút Next */}
            {hasMultipleImages && (
              <button
                data-testid="lightbox-next-button"
                type="button"
                onClick={goToNext}
                aria-label="Ảnh tiếp theo"
                className="absolute right-2 sm:right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Dải thumbnail thu nhỏ trong Lightbox */}
          {hasMultipleImages && (
            <div
              className="flex max-w-3xl items-center gap-2 overflow-x-auto py-2 px-4 no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {normalizedImages.map((img, i) => {
                const isError = !img.url || imageErrorMap[img.id];
                const isActive = i === active;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`Chuyển tới ảnh ${i + 1}`}
                    className={cn(
                      'relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-green-400',
                      isActive
                        ? 'border-green-500 scale-105 ring-2 ring-green-500/50'
                        : 'border-white/20 opacity-50 hover:opacity-100'
                    )}
                  >
                    {isError ? (
                      <div className="flex h-full w-full items-center justify-center bg-gray-800 text-gray-500">
                        <ImageOff className="h-4 w-4" />
                      </div>
                    ) : (
                      <img
                        src={img.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
