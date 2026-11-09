import { cn } from '@/utils';

interface ProductCardSkeletonProps {
  className?: string;
}

/**
 * Skeleton loading placeholder cho ProductCard
 * Mô phỏng chính xác layout của ProductCard:
 * - Khung ảnh aspect-square
 * - Nhãn thương hiệu
 * - Tiêu đề 2 dòng
 * - Giá bán
 * - Thông số phụ / nút mua
 * Tôn trọng prefers-reduced-motion (motion-reduce:animate-none)
 */
export default function ProductCardSkeleton({ className }: ProductCardSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Đang tải thông tin sản phẩm"
      aria-busy="true"
      className={cn(
        'group relative block overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm',
        className
      )}
    >
      <span className="sr-only">Đang tải sản phẩm...</span>

      {/* Placeholder khung ảnh vuông */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-200 animate-pulse motion-reduce:animate-none" />

      {/* Nội dung thông tin sản phẩm */}
      <div className="p-3">
        {/* Brand placeholder */}
        <div className="mb-1.5 h-3 w-16 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />

        {/* Title placeholder (2 dòng) */}
        <div className="mb-1 min-h-[2.5rem] space-y-1.5">
          <div className="h-3.5 w-4/5 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          <div className="h-3.5 w-3/5 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        </div>

        {/* Price placeholder */}
        <div className="mb-2 h-4 w-24 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />

        {/* Screen/spec placeholder */}
        <div className="h-3 w-20 rounded bg-gray-100 animate-pulse motion-reduce:animate-none" />
      </div>

      {/* Button placeholder */}
      <div className="px-3 pb-3">
        <div className="h-8 w-full rounded-lg bg-gray-100 animate-pulse motion-reduce:animate-none" />
      </div>
    </div>
  );
}

