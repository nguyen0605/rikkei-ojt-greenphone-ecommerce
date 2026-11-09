import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import { cn } from '@/utils';

export interface CategoryImageProps {
  src?: string | null;
  alt: string;
  brandName?: string;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Component hiển thị hình ảnh danh mục/thương hiệu chuẩn GreenPhone:
 * - Tự động bắt lỗi tải ảnh (onError) khi gặp link 404 hoặc mất mạng
 * - Chuyển sang fallback placeholder mềm mại, chuẩn nhận diện thương hiệu
 * - Cố định kích thước khung hình nhằm triệt tiêu hiện tượng giật lag layout (CLS = 0)
 * - Tối ưu tải lười (lazy loading) và giải mã bất đồng bộ (async decoding)
 */
export default function CategoryImage({
  src,
  alt,
  brandName,
  className,
  width = 64,
  height = 64,
}: CategoryImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset trạng thái khi URL ảnh thay đổi
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  const displayName = brandName || alt || 'GreenPhone';
  const initial = displayName.trim().charAt(0).toUpperCase();

  // Hiển thị fallback placeholder khi đường dẫn rỗng, null hoặc bị lỗi tải
  if (!src || hasError) {
    return (
      <div
        data-testid="category-image-fallback"
        role="img"
        aria-label={alt}
        className={cn(
          'relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 text-emerald-700 shadow-sm transition-all duration-300 border border-emerald-100/60 select-none',
          className
        )}
      >
        <span className="text-xl font-bold tracking-tight text-emerald-800">
          {initial}
        </span>
        <Smartphone
          className="absolute -bottom-1 -right-1 h-4 w-4 text-emerald-500/70"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className={cn('relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white', className)}>
      {!isLoaded && (
        <div
          data-testid="category-image-skeleton"
          className="absolute inset-0 animate-pulse rounded-2xl bg-gray-100"
        />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          'h-full w-full object-contain p-2 transition-all duration-300',
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
      />
    </div>
  );
}
