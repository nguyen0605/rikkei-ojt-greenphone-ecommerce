import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShoppingCart,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { App, Popconfirm } from 'antd';
import { Breadcrumb } from '@/components/common';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeFromWishlist, clearWishlist } from '@/store/slices/wishlistSlice';
import { addCartItem, addToCart } from '@/store/slices/cartSlice';
import { phoneService } from '@/services';
import { formatVND, getOptimizedImageUrl, cn } from '@/utils';
import { ROUTES } from '@/routes/routePaths';
import type { PhoneDetailDTO, PhoneVariantDTO } from '@/types/api';
import type { Product } from '@/types';

function toProduct(phone: PhoneDetailDTO, variant: PhoneVariantDTO): Product {
  return {
    id: String(phone.id),
    slug: phone.name.toLowerCase().replace(/\s+/g, '-'),
    name: phone.name,
    brand: (phone.brandName || '').toLowerCase() as Product['brand'],
    category: 'smartphone',
    price: variant.discountPrice ?? variant.price,
    originalPrice: variant.discountPrice ? variant.price : undefined,
    rating: phone.avgRating || 0,
    reviewCount: phone.reviewCount || 0,
    sold: 0,
    images: phone.images?.map((i) => i.imageUrl) || [phone.mainImageUrl || ''],
    thumbnail: phone.images?.[0]?.imageUrl || phone.mainImageUrl || '',
    colors: phone.variants?.map((v) => ({ id: String(v.id), name: v.color, hex: '#000' })) || [],
    storage: phone.variants?.map((v) => ({ id: String(v.id), capacity: v.storage })) || [],
    description: phone.description || '',
    specifications: [],
    features: [],
    inStock: variant.stockQuantity > 0,
  };
}

export default function WishlistPage() {
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const items = useAppSelector((state) => state.wishlist?.items ?? []);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const [addingId, setAddingId] = useState<string | null>(null);

  const handleRemove = (productId: string, name?: string) => {
    dispatch(removeFromWishlist(productId));
    message.info(name ? `Đã xóa ${name} khỏi danh sách yêu thích` : 'Đã xóa khỏi danh sách yêu thích');
  };

  const handleClearAll = () => {
    dispatch(clearWishlist());
    message.info('Đã làm trống danh sách yêu thích');
  };

  const handleAddToCart = async (productId: string, name?: string) => {
    if (addingId) return;

    try {
      setAddingId(productId);
      const phoneIdNum = Number(productId);
      if (isNaN(phoneIdNum)) {
        message.error('Không tìm thấy thông tin sản phẩm');
        return;
      }

      const detail = await phoneService.detail(phoneIdNum);
      const variant = detail.variants?.find((v) => v.stockQuantity > 0);

      if (!variant) {
        message.warning('Sản phẩm này hiện đã hết hàng');
        return;
      }

      if (!isAuthenticated) {
        dispatch(
          addToCart({
            product: toProduct(detail, variant),
            variantId: variant.id,
            quantity: 1,
            color: variant.color,
            storage: variant.storage,
          })
        );
      } else {
        await dispatch(addCartItem({ phoneVariantId: variant.id, quantity: 1 })).unwrap();
      }

      message.success(`Đã thêm ${name || detail.name} vào giỏ hàng`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[{ label: 'Trang chủ', href: '/' }, { label: 'Sản phẩm yêu thích' }]}
          className="mb-6"
        />

        {/* Page Title & Stats */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold text-gray-900 sm:text-3xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 shadow-sm">
                <Heart className="h-6 w-6 fill-red-500 text-red-500" />
              </span>
              Sản phẩm yêu thích
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý danh sách các mẫu điện thoại bạn đang quan tâm tại GreenPhone
            </p>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                {items.length} sản phẩm
              </span>
              <Popconfirm
                title="Xóa tất cả sản phẩm?"
                description="Bạn có chắc chắn muốn xóa toàn bộ danh sách yêu thích?"
                onConfirm={handleClearAll}
                okText="Xóa tất cả"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa tất cả
                </button>
              </Popconfirm>
            </div>
          )}
        </div>

        {/* Content Body */}
        {items.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center sm:p-16 shadow-sm">
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-red-50 text-red-400 shadow-inner">
              <Heart className="h-12 w-12 stroke-[1.5]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Danh sách yêu thích của bạn đang trống
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 sm:text-base">
              Bạn chưa lưu mẫu điện thoại nào. Hãy khám phá ngay các dòng smartphone mới nhất và bấm vào icon trái tim để lưu lại nhé!
            </p>
            <div className="mt-8">
              <Link
                to={ROUTES.PRODUCTS}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-green-600 px-8 py-3 text-base font-semibold text-white shadow-md shadow-green-200 transition-all hover:bg-green-700 hover:shadow-lg hover:shadow-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:scale-95"
              >
                <Sparkles className="h-5 w-5" />
                Khám phá điện thoại ngay
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        ) : (
          /* Product Grid */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
            {items.map((item) => {
              const imgUrl = item.imageUrl
                ? getOptimizedImageUrl(item.imageUrl, { width: 400, height: 400 })
                : 'https://placehold.co/400x400?text=GreenPhone';
              const isAdding = addingId === item.productId;

              return (
                <div
                  key={item.productId}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-green-200 hover:shadow-lg"
                >
                  {/* Top bar: delete button */}
                  <div className="absolute right-3 top-3 z-10">
                    <button
                      type="button"
                      onClick={() => handleRemove(item.productId, item.name)}
                      aria-label="Xóa khỏi danh sách yêu thích"
                      title="Xóa khỏi yêu thích"
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/90 p-2 text-gray-400 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Product Info Link */}
                  <Link
                    to={`/san-pham/${item.productId}`}
                    className="block focus:outline-none"
                  >
                    {/* Image with zero layout shift placeholder */}
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50">
                      <img
                        src={imgUrl}
                        alt={item.name || 'Điện thoại GreenPhone'}
                        width={400}
                        height={400}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                    <div className="mt-3.5">
                      {item.brandName && (
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          {item.brandName}
                        </span>
                      )}
                      <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-gray-900 transition-colors group-hover:text-green-600">
                        {item.name || `Sản phẩm #${item.productId}`}
                      </h3>

                      {/* Pricing */}
                      <div className="mt-2 flex items-baseline gap-2">
                        {item.price != null && item.price > 0 ? (
                          <>
                            <span className="text-base font-bold text-red-600">
                              {formatVND(item.price)}
                            </span>
                            {item.originalPrice != null && item.originalPrice > item.price && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatVND(item.originalPrice)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-sm font-medium text-gray-500">Liên hệ báo giá</span>
                        )}
                      </div>

                      {/* In-Stock Status */}
                      <div className="mt-2">
                        {item.inStock !== false ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Còn hàng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                            <XCircle className="h-3 w-3" />
                            Tạm hết hàng
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Bottom Action: Add to cart */}
                  <div className="mt-4 pt-2">
                    <button
                      type="button"
                      disabled={isAdding || item.inStock === false}
                      onClick={() => handleAddToCart(item.productId, item.name)}
                      className={cn(
                        'flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1',
                        item.inStock === false
                          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                          : isAdding
                            ? 'cursor-wait bg-green-700 text-white'
                            : 'bg-green-600 text-white shadow-sm shadow-green-200 hover:bg-green-700 hover:shadow-md'
                      )}
                    >
                      {isAdding ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Đang thêm...</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          <span>Thêm nhanh vào giỏ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
