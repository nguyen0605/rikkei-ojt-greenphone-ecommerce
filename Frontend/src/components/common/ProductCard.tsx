import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { App } from 'antd';
import type { PhoneDTO, PhoneDetailDTO, PhoneVariantDTO } from '@/types/api';
import type { Product } from '@/types';
import { cn, getOptimizedImageUrl, formatVND, calculateBestVoucherForPrice } from '@/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addCartItem, addToCart } from '@/store/slices/cartSlice';
import { startBuyNow } from '@/store/slices/checkoutSlice';
import { ROUTES } from '@/routes/routePaths';
import { createBuyNowCartItem } from '@/utils/buyNow';
import { phoneService } from '@/services';
import { useMyPromotions } from '@/hooks/useMyPromotions';
import WishlistButton from '@/components/common/WishlistButton';

interface Props { product: PhoneDTO; className?: string; }

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

export default function ProductCard({ product, className }: Props) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { data: myPromotions } = useMyPromotions();
  const { message } = App.useApp();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const isSubmitting = isAddingToCart || isBuyingNow;
  const imgUrl = getOptimizedImageUrl(product.mainImageUrl || '', { width: 400, height: 400 });

  const bestVoucher = calculateBestVoucherForPrice(product.lowestPrice, myPromotions);
  const discountPercent =
    bestVoucher && product.lowestPrice && product.lowestPrice > 0
      ? Math.max(1, Math.round((bestVoucher.discountAmount / product.lowestPrice) * 100))
      : 0;

  const findFirstAvailableVariant = async (): Promise<{
    detail: PhoneDetailDTO;
    variant: PhoneVariantDTO;
  } | null> => {
    const detail = await phoneService.detail(product.id);
    if (detail.status === 'INACTIVE') {
      message.warning('Sản phẩm này hiện đã ngừng kinh doanh');
      return null;
    }

    const variant = detail.variants?.find((item) => item.status !== 'INACTIVE' && item.stockQuantity > 0);
    if (!variant) {
      message.warning('Sản phẩm này hiện đã hết hàng');
      return null;
    }

    return { detail, variant };
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;

    try {
      setIsAddingToCart(true);
      const found = await findFirstAvailableVariant();
      if (!found) return;

      const { detail, variant } = found;
      if (!isAuthenticated) {
        dispatch(
          addToCart({
            product: toProduct(detail, variant),
            variantId: variant.id,
            quantity: 1,
            color: variant.color,
            storage: variant.storage,
          }),
        );
      } else {
        await dispatch(addCartItem({ phoneVariantId: variant.id, quantity: 1 })).unwrap();
      }
      message.success(`Đã thêm ${product.name} vào giỏ hàng`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;

    try {
      setIsBuyingNow(true);
      const found = await findFirstAvailableVariant();
      if (!found) return;

      const { detail, variant } = found;
      dispatch(startBuyNow(createBuyNowCartItem(toProduct(detail, variant), variant, 1)));
      navigate(ROUTES.CHECKOUT);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể thực hiện mua ngay');
    } finally {
      setIsBuyingNow(false);
    }
  };

  return (
    <div className={cn('group relative block overflow-hidden rounded-xl border border-gray-100 bg-white transition-all hover:-translate-y-1 hover:border-green-200 hover:shadow-lg', className)}>
      <Link to={`/san-pham/${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          {discountPercent > 0 && (
            <div className="absolute left-2 top-2 z-10 rounded bg-green-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
              Giảm {discountPercent}%
            </div>
          )}
          <div className="absolute right-2 top-2 z-10">
            <WishlistButton
              productId={String(product.id)}
              name={product.name}
              price={bestVoucher ? bestVoucher.finalPrice : (product.lowestPrice ?? undefined)}
              originalPrice={product.lowestPrice ?? undefined}
              imageUrl={imgUrl}
              brandName={product.brandName}
              inStock={true}
              className="min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-[36px] sm:min-w-[36px] border border-gray-100 bg-white/90 shadow-sm"
              iconSize={18}
            />
          </div>
          <img
            src={imgUrl}
            alt={product.name}
            width={400}
            height={400}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-3">
          <div className="mb-1 text-xs text-gray-500">{product.brandName}</div>
          <h3 className="mb-1 line-clamp-2 min-h-[2.5rem] text-sm font-medium text-gray-900 group-hover:text-green-600">{product.name}</h3>
          {product.lowestPrice != null && (
            <div className="mb-1">
              {bestVoucher ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-red-600">
                    {formatVND(bestVoucher.finalPrice)}
                  </span>
                  <span className="text-[11px] text-gray-400 line-through">
                    {formatVND(product.lowestPrice)}
                  </span>
                </div>
              ) : (
                <div className="text-sm font-bold text-red-600">{formatVND(product.lowestPrice)}</div>
              )}
            </div>
          )}
          <div className="text-xs text-gray-400">{product.screen || ''}</div>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <div
          className={cn(
            'flex items-center gap-2 transition-all',
            isSubmitting
              ? 'opacity-100'
              : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100'
          )}
        >
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isSubmitting}
            data-testid={`product-card-buy-now-${product.id}`}
            className={cn(
              'flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-green-600 px-3 text-xs font-semibold text-white transition-colors sm:text-sm',
              isSubmitting ? 'cursor-not-allowed opacity-75' : 'hover:bg-green-700'
            )}
          >
            {isBuyingNow ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              'Mua ngay'
            )}
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isSubmitting}
            aria-label="Thêm vào giỏ"
            title="Thêm vào giỏ"
            data-testid={`product-card-add-to-cart-${product.id}`}
            className={cn(
              'flex h-9 w-10 shrink-0 items-center justify-center rounded-lg border border-green-600 bg-white text-green-700 transition-colors',
              isSubmitting ? 'cursor-not-allowed opacity-75' : 'hover:bg-green-50'
            )}
          >
            {isAddingToCart ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
