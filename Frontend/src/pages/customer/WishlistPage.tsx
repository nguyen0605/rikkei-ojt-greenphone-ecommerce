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
    <div>
      {/* Header section in Account Layout */}
      <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 shadow-sm">
              <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            </span>
            <h2 className="text-xl font-bold text-gray-900">Sản phẩm yêu thích</h2>
            {items.length > 0 && (
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                {items.length} sản phẩm
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Danh sách các mẫu điện thoại bạn đã quan tâm và lưu lại tại GreenPhone
          </p>
        </div>

        {items.length > 0 && (
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
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Xóa tất cả
            </button>
          </Popconfirm>
        )}
      </div>

      {/* Content */}
      {items.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center sm:p-12">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-400 shadow-inner">
            <Heart className="h-10 w-10 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Danh sách yêu thích của bạn đang trống
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Bạn chưa lưu mẫu điện thoại nào. Hãy khám phá ngay các dòng smartphone mới nhất và bấm vào icon trái tim để lưu lại nhé!
          </p>
          <div className="mt-6">
            <Link
              to={ROUTES.PRODUCTS}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-green-200 transition-all hover:bg-green-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              Khám phá điện thoại ngay
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* Product Grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const imgUrl = item.imageUrl
              ? getOptimizedImageUrl(item.imageUrl, { width: 400, height: 400 })
              : 'https://placehold.co/400x400?text=GreenPhone';
            const isAdding = addingId === item.productId;

            return (
              <div
                key={item.productId}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-green-200 hover:shadow-md"
              >
                {/* Delete button */}
                <div className="absolute right-2.5 top-2.5 z-10">
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

                {/* Product link */}
                <Link
                  to={`/san-pham/${item.productId}`}
                  className="block focus:outline-none"
                >
                  {/* Image container */}
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

                  <div className="mt-3">
                    {item.brandName && (
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        {item.brandName}
                      </span>
                    )}
                    <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-gray-900 transition-colors group-hover:text-green-600">
                      {item.name || `Sản phẩm #${item.productId}`}
                    </h3>

                    {/* Price */}
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

                {/* Add to cart */}
                <div className="mt-4 pt-1">
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
  );
}
