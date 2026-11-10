import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ImageOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
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

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.2;

/**
 * Component hiển thị bộ sưu tập ảnh sản phẩm:
 * 1. Ảnh chính trên trang PDP: KHÔNG tự động phóng to khi hover chuột.
 * 2. Click vào ảnh mở Lightbox modal toàn màn hình.
 * 3. Trong Lightbox:
 *    - Sử dụng con lăn chuột (Mouse Wheel) để phóng to/thu nhỏ (100% - 400%, bước 20%).
 *    - Khi zoom > 100%, cho phép giữ chuột trái kéo ảnh (Pan/Drag) với con trỏ grab/grabbing.
 *    - Có thanh điều khiển zoom (+, -, reset) cho accessibility & thao tác tiện lợi.
 *    - Chuyển ảnh hoặc đóng modal tự động reset zoom về 100% và căn giữa ảnh.
 *    - Hỗ trợ phím mũi tên, Escape, vuốt cảm ứng trên di động và khóa cuộn trang.
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

  // ── Lightbox Zoom & Pan State ──
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string | number, boolean>>({});

  const resetZoom = useCallback(() => {
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const setActiveImage = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, normalizedImages.length - 1));
      setInternalActive(clamped);
      resetZoom();
      onSelectIndex?.(clamped);
    },
    [normalizedImages.length, onSelectIndex, resetZoom]
  );

  // ── Lightbox Modal State ──
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchStartDistanceRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef(1.0);

  const openLightbox = useCallback((e?: React.SyntheticEvent<HTMLElement>) => {
    if (e) {
      e.stopPropagation();
      triggerRef.current = e.currentTarget;
    }
    resetZoom();
    setIsLightboxOpen(true);
  }, [resetZoom]);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    resetZoom();
    // Khôi phục focus cho trigger element
    if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
      triggerRef.current.focus();
    }
  }, [resetZoom]);

  const goToPrev = useCallback(() => {
    resetZoom();
    setActiveImage(active === 0 ? normalizedImages.length - 1 : active - 1);
  }, [active, normalizedImages.length, resetZoom, setActiveImage]);

  const goToNext = useCallback(() => {
    resetZoom();
    setActiveImage(active === normalizedImages.length - 1 ? 0 : active + 1);
  }, [active, normalizedImages.length, resetZoom, setActiveImage]);

  // Điều chỉnh mức zoom qua nút bấm
  const handleZoomIn = useCallback(() => {
    setZoomScale((prev) => {
      const next = Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2)));
      return next;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomScale((prev) => {
      const next = Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2)));
      if (next === MIN_ZOOM) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

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
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, closeLightbox, goToPrev, goToNext, handleZoomIn, handleZoomOut, resetZoom]);

  // ── Xử lý con lăn chuột (Mouse Wheel Zoom) chống cuộn trang nền ──
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement> | WheelEvent) => {
    if (typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }

    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoomScale((prevScale) => {
      const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number((prevScale + delta).toFixed(2))));
      if (nextScale === MIN_ZOOM) {
        setPanOffset({ x: 0, y: 0 });
        return MIN_ZOOM;
      }

      // Căn chỉnh vị trí pan tương ứng với chuột
      const container = imageContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const maxPanX = (rect.width * (nextScale - 1)) / 2;
        const maxPanY = (rect.height * (nextScale - 1)) / 2;

        setPanOffset((prevPan) => ({
          x: Math.max(-maxPanX, Math.min(maxPanX, prevPan.x)),
          y: Math.max(-maxPanY, Math.min(maxPanY, prevPan.y)),
        }));
      }

      return nextScale;
    });
  }, []);

  useEffect(() => {
    const container = imageContainerRef.current;
    if (!isLightboxOpen || !container) return;

    const onWheelHandler = (e: WheelEvent) => {
      handleWheel(e);
    };

    container.addEventListener('wheel', onWheelHandler, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheelHandler);
    };
  }, [isLightboxOpen, handleWheel]);

  // ── Xử lý kéo ảnh khi zoom > 100% (Pan / Drag) ──
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomScale <= MIN_ZOOM) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || zoomScale <= MIN_ZOOM) return;
    e.preventDefault();

    const container = imageContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const maxPanX = (rect.width * (zoomScale - 1)) / 2;
    const maxPanY = (rect.height * (zoomScale - 1)) / 2;

    const rawX = e.clientX - dragStartRef.current.x;
    const rawY = e.clientY - dragStartRef.current.y;

    setPanOffset({
      x: Math.max(-maxPanX, Math.min(maxPanX, rawX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, rawY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ── Xử lý cảm ứng trên thiết bị di động (Pinch Zoom & Drag / Swipe) ──
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // 2 ngón tay -> Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchStartDistanceRef.current = dist;
      touchStartScaleRef.current = zoomScale;
    } else if (e.touches.length === 1) {
      if (zoomScale > MIN_ZOOM) {
        // 1 ngón tay khi đã zoom -> Kéo ảnh (Pan)
        dragStartRef.current = {
          x: e.touches[0].clientX - panOffset.x,
          y: e.touches[0].clientY - panOffset.y,
        };
        setIsDragging(true);
      } else {
        // 1 ngón tay khi zoom 100% -> Chuẩn bị vuốt chuyển ảnh (Swipe)
        touchStartXRef.current = e.touches[0].clientX;
        touchEndXRef.current = null;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartDistanceRef.current !== null) {
      // Pinch to zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const factor = dist / touchStartDistanceRef.current;
      const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number((touchStartScaleRef.current * factor).toFixed(2))));
      setZoomScale(nextScale);
      if (nextScale === MIN_ZOOM) {
        setPanOffset({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1) {
      if (zoomScale > MIN_ZOOM && isDragging) {
        const container = imageContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const maxPanX = (rect.width * (zoomScale - 1)) / 2;
        const maxPanY = (rect.height * (zoomScale - 1)) / 2;
        const rawX = e.touches[0].clientX - dragStartRef.current.x;
        const rawY = e.touches[0].clientY - dragStartRef.current.y;
        setPanOffset({
          x: Math.max(-maxPanX, Math.min(maxPanX, rawX)),
          y: Math.max(-maxPanY, Math.min(maxPanY, rawY)),
        });
      } else if (zoomScale <= MIN_ZOOM) {
        touchEndXRef.current = e.touches[0].clientX;
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartDistanceRef.current = null;
    setIsDragging(false);

    if (zoomScale <= MIN_ZOOM && touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const distance = touchStartXRef.current - touchEndXRef.current;
      const minSwipeDistance = 50;
      if (distance > minSwipeDistance) {
        goToNext();
      } else if (distance < -minSwipeDistance) {
        goToPrev();
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
      {/* Khung ảnh chính trên PDP: Không zoom tự động khi rê chuột */}
      <div
        data-testid="main-image-container"
        className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 cursor-pointer"
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
            className="h-full w-full object-contain select-none transition-transform duration-200"
          />
        )}

        {/* Nút phóng to mở Lightbox ở góc trên bên phải */}
        <button
          type="button"
          onClick={openLightbox}
          aria-label="Phóng to ảnh toàn màn hình"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {/* Gợi ý click mở Lightbox */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Nhấp để mở toàn màn hình & cuộn chuột để zoom
        </div>
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

      {/* ── LIGHTBOX MODAL TOÀN MÀN HÌNH VỚI MOUSE WHEEL ZOOM & PAN ── */}
      {isLightboxOpen && (
        <div
          data-testid="lightbox-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Xem ảnh lớn: ${productName}`}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 p-4 sm:p-6 backdrop-blur-md"
          onClick={closeLightbox}
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

            {/* Thanh công cụ Zoom trong Lightbox */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 backdrop-blur-sm">
                <button
                  data-testid="zoom-out-button"
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomScale <= MIN_ZOOM}
                  aria-label="Thu nhỏ ảnh"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white transition hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span data-testid="zoom-level-indicator" className="min-w-[3rem] text-center text-xs font-medium text-gray-200">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  data-testid="zoom-in-button"
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomScale >= MAX_ZOOM}
                  aria-label="Phóng to ảnh"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white transition hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                {zoomScale > MIN_ZOOM && (
                  <button
                    data-testid="reset-zoom-button"
                    type="button"
                    onClick={resetZoom}
                    aria-label="Đặt lại mức zoom 100%"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white transition hover:bg-white/20 ml-1"
                    title="Đặt lại mức zoom (100%)"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Nút đóng modal */}
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
          </div>

          {/* Vùng hiển thị ảnh chính lớn với Mouse Wheel Zoom & Drag/Pan */}
          <div
            ref={imageContainerRef}
            data-testid="lightbox-viewport"
            className={cn(
              'relative flex flex-1 w-full max-w-5xl items-center justify-center overflow-hidden my-2 select-none touch-none',
              zoomScale > MIN_ZOOM
                ? isDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-default'
            )}
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
                draggable={false}
                className="max-h-[72vh] max-w-[90vw] object-contain transition-transform duration-100 select-none will-change-transform"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                }}
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

            {/* Gợi ý điều khiển zoom ở góc dưới ảnh */}
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-gray-300 backdrop-blur-sm">
              {zoomScale > MIN_ZOOM
                ? 'Giữ chuột trái để kéo ảnh • Cuộn chuột để chỉnh mức zoom'
                : 'Cuộn chuột hoặc dùng +/- để phóng to (100% – 400%)'}
            </div>
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
