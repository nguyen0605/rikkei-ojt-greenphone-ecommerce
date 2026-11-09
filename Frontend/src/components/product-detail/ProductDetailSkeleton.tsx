import { cn } from '@/utils';

interface ProductDetailSkeletonProps {
  className?: string;
}

/**
 * Skeleton loading placeholder cho trang ProductDetailPage
 * Mô phỏng bố cục 2 cột (Gallery bên trái, Buy Box bên phải) và bảng thông số kỹ thuật
 */
export default function ProductDetailSkeleton({ className }: ProductDetailSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Đang tải chi tiết sản phẩm"
      aria-busy="true"
      className={cn('mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8', className)}
    >
      <span className="sr-only">Đang tải thông tin sản phẩm...</span>

      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-4 w-16 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        <div className="h-4 w-4 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        <div className="h-4 w-20 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        <div className="h-4 w-4 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        <div className="h-4 w-32 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Gallery Skeleton */}
        <div>
          {/* Main image placeholder */}
          <div className="aspect-square w-full rounded-2xl border border-gray-100 bg-gray-200 animate-pulse motion-reduce:animate-none" />

          {/* Thumbnails row */}
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-16 rounded-lg border border-gray-100 bg-gray-200 animate-pulse motion-reduce:animate-none"
              />
            ))}
          </div>
        </div>

        {/* Right: Info / Buy Box Skeleton */}
        <div className="space-y-4">
          {/* Brand */}
          <div className="h-4 w-20 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />

          {/* Title */}
          <div className="space-y-2">
            <div className="h-7 w-3/4 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
            <div className="h-7 w-1/2 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
            <div className="h-4 w-16 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <div className="h-8 w-36 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
            <div className="h-5 w-24 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          </div>

          {/* Short description */}
          <div className="space-y-2 pt-2">
            <div className="h-3.5 w-full rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
            <div className="h-3.5 w-5/6 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
            <div className="h-3.5 w-2/3 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          </div>

          {/* Variant Selector box placeholder */}
          <div className="rounded-xl bg-gray-50 p-4 space-y-3">
            <div className="h-4 w-28 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
            <div className="flex flex-wrap gap-2.5">
              <div className="h-10 w-32 rounded-lg bg-gray-200 animate-pulse motion-reduce:animate-none" />
              <div className="h-10 w-32 rounded-lg bg-gray-200 animate-pulse motion-reduce:animate-none" />
              <div className="h-10 w-32 rounded-lg bg-gray-200 animate-pulse motion-reduce:animate-none" />
            </div>
          </div>

          {/* Stock info */}
          <div className="h-4 w-36 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />

          {/* Add to Cart button */}
          <div className="h-12 w-full rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
        </div>
      </div>

      {/* Specs table skeleton */}
      <div className="mt-12 space-y-4">
        <div className="h-6 w-44 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        <div className="overflow-hidden rounded-xl border border-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex border-b border-gray-100 last:border-0">
              <div className="w-48 bg-gray-50 px-4 py-3">
                <div className="h-4 w-24 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="flex-1 px-4 py-3">
                <div className="h-4 w-48 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

