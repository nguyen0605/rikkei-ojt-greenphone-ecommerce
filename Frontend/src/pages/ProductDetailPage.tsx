import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Radio, App } from 'antd';
import { ShoppingCart, CheckCircle, Star, Ticket, AlertCircle } from 'lucide-react';
import { Breadcrumb, ProductCard } from '@/components/common';
import ProductGallery from '@/components/product-detail/ProductGallery';
import ProductDetailSkeleton from '@/components/product-detail/ProductDetailSkeleton';
import { ProductReviewsSection } from '@/components/product/detail';
import { phoneService } from '@/services';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addCartItem, addToCart } from '@/store/slices/cartSlice';
import { formatVND, calculateBestVoucherForPrice } from '@/utils';
import { useMyPromotions } from '@/hooks/useMyPromotions';
import type { PhoneDetailDTO, PhoneVariantDTO, PhoneImageDTO } from '@/types/api';
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
    rating: 0,
    reviewCount: 0,
    sold: 0,
    images: phone.images?.map((i) => i.imageUrl) || [phone.mainImageUrl || ''],
    thumbnail: phone.images?.[0]?.imageUrl || phone.mainImageUrl || '',
    colors: phone.variants?.map((v) => ({ id: String(v.id), name: v.color, hex: '#000' })) || [],
    storage: phone.variants?.map((v) => ({ id: String(v.id), capacity: v.storage })) || [],
    description: phone.description || '',
    specifications: [
      { group: 'Màn hình', items: [{ label: 'Công nghệ', value: phone.screen || '' }] },
      { group: 'Chip', items: [{ label: 'CPU', value: phone.chip || '' }] },
      { group: 'Camera sau', items: [{ label: 'Độ phân giải', value: phone.rearCamera || '' }] },
      { group: 'Camera trước', items: [{ label: 'Độ phân giải', value: phone.frontCamera || '' }] },
      { group: 'Pin', items: [{ label: 'Dung lượng', value: phone.battery || '' }] },
      { group: 'Hệ điều hành', items: [{ label: 'OS', value: phone.os || '' }] },
      { group: 'Bảo hành', items: [{ label: 'Thời gian', value: phone.warranty || '' }] },
    ],
    features: [],
    inStock: variant.stockQuantity > 0,
  };
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const variantIdParam = searchParams.get('variantId') || searchParams.get('variant');
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { data: myPromotions } = useMyPromotions();
  const { message } = App.useApp();
  const [userSelectedVariantId, setUserSelectedVariantId] = useState<number | null>(null);
  const [userSelectedImageIndex, setUserSelectedImageIndex] = useState<number | null>(null);
  const [prevId, setPrevId] = useState(id);

  if (id !== prevId) {
    setPrevId(id);
    setUserSelectedImageIndex(null);
    setUserSelectedVariantId(null);
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const numericId = parseInt(id || '', 10);

  const { data: phone, isLoading } = useQuery<PhoneDetailDTO>({
    queryKey: ['phone', id],
    queryFn: async () => {
      if (Number.isFinite(numericId) && numericId > 0) {
        return phoneService.detail(numericId);
      }
      if (id) {
        const searchRes = await phoneService.search({ q: id });
        const firstMatch = searchRes.content?.[0];
        if (firstMatch) {
          return phoneService.detail(firstMatch.id);
        }
      }
      throw new Error('Không tìm thấy sản phẩm');
    },
    enabled: !!id,
  });

  const { data: related } = useQuery({
    queryKey: ['phones', 'related', phone?.brandId],
    // Lọc theo brand (backend bind param số nhiều `brandIds`) — cùng hãng là "liên quan" hợp lý nhất
    queryFn: () => phoneService.list({ brandIds: String(phone?.brandId), size: '5' }),
    enabled: !!phone,
  });

  const images = phone?.images?.length
    ? phone.images
    : phone?.mainImageUrl
      ? [{ id: 0, phoneId: phone.id, imageUrl: phone.mainImageUrl, isMain: true } as PhoneImageDTO]
      : [];

  // Tự động suy biến thể đã mua từ query parameter `variantId` / `variant`
  const queryVariantId = variantIdParam ? parseInt(variantIdParam, 10) : null;
  const matchedQueryVariant =
    queryVariantId && Number.isFinite(queryVariantId)
      ? phone?.variants?.find((v) => v.id === queryVariantId)
      : undefined;

  const defaultVariantId = matchedQueryVariant?.id ?? phone?.variants?.[0]?.id ?? null;
  const activeVariantId = userSelectedVariantId ?? defaultVariantId;

  const selectedVariant =
    phone?.variants?.find((v) => v.id === activeVariantId) || phone?.variants?.[0];

  const defaultImageIndex =
    matchedQueryVariant && phone?.variants
      ? Math.max(0, phone.variants.findIndex((v) => v.id === matchedQueryVariant.id))
      : 0;

  const activeImageIndex =
    userSelectedImageIndex ??
    (defaultImageIndex >= 0 && defaultImageIndex < images.length ? defaultImageIndex : 0);

  if (isLoading) return <ProductDetailSkeleton />;
  if (!phone) return <div className="p-8 text-center text-gray-500">Không tìm thấy sản phẩm</div>;

  const isProductInactive = phone.status === 'INACTIVE';
  const isVariantInactive = selectedVariant?.status === 'INACTIVE';

  const requestedVariantNotFound =
    Boolean(variantIdParam) &&
    phone.variants &&
    !phone.variants.some((v) => v.id === parseInt(variantIdParam!, 10));

  const currentVariantPrice = selectedVariant?.discountPrice ?? selectedVariant?.price;
  const bestVoucher = calculateBestVoucherForPrice(currentVariantPrice, myPromotions);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    if (isProductInactive) {
      message.warning('Sản phẩm này hiện đã ngừng kinh doanh');
      return;
    }
    if (isVariantInactive) {
      message.warning('Phiên bản này hiện đã ngừng kinh doanh');
      return;
    }
    if (selectedVariant.stockQuantity <= 0) {
      message.warning('Sản phẩm này đã hết hàng');
      return;
    }
    if (!isAuthenticated) {
      dispatch(
        addToCart({
          product: toProduct(phone, selectedVariant),
          variantId: selectedVariant.id,
          quantity: 1,
          color: selectedVariant.color,
          storage: selectedVariant.storage,
        })
      );
      message.success(`Đã thêm ${phone.name} vào giỏ hàng`);
      return;
    }
    try {
      await dispatch(addCartItem({ phoneVariantId: selectedVariant.id, quantity: 1 })).unwrap();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể thêm vào giỏ hàng');
      return;
    }
    message.success(`Đã thêm ${phone.name} vào giỏ hàng`);
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Sản phẩm', href: '/san-pham' }, { label: phone.name }]} className="mb-6" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left — Images (Gallery với Hover Zoom & Lightbox) */}
          <div>
            <ProductGallery
              images={images}
              thumbnail={phone.mainImageUrl}
              productName={phone.name}
              selectedIndex={activeImageIndex}
              onSelectIndex={(index) => {
                setUserSelectedImageIndex(index);
                if (phone.variants && index < phone.variants.length) {
                  setUserSelectedVariantId(phone.variants[index].id);
                }
              }}
            />
          </div>

          {/* Right — Info */}
          <div>
            <p className="text-sm text-gray-500">{phone.brandName}</p>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">{phone.name}</h1>

            {/* Cảnh báo sản phẩm ngừng kinh doanh */}
            {isProductInactive && (
              <div
                data-testid="product-inactive-alert"
                className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                <span className="font-semibold">Sản phẩm hiện đã ngừng kinh doanh.</span>
              </div>
            )}

            {/* Cảnh báo biến thể đã chọn ngừng kinh doanh */}
            {!isProductInactive && isVariantInactive && (
              <div
                data-testid="variant-inactive-alert"
                className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs sm:text-sm text-amber-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Phiên bản ({selectedVariant?.storage} — {selectedVariant?.color}) hiện đã ngừng kinh doanh. Bạn có thể chọn phiên bản khác còn kinh doanh nếu có.
                </span>
              </div>
            )}

            {/* Thông báo nếu query variantId không tìm thấy */}
            {!isProductInactive && requestedVariantNotFound && (
              <div
                data-testid="variant-not-found-alert"
                className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-blue-500" />
                <span>Phiên bản yêu cầu không tồn tại, đã tự động chọn phiên bản có sẵn.</span>
              </div>
            )}

            {/* Rating row — under the name */}
            {phone.reviewCount > 0 && (
              <div className="mb-3 flex items-center gap-2">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.round(phone.avgRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                    />
                  ))}
                </span>
                <span className="text-sm font-semibold text-gray-900">{(phone.avgRating || 0).toFixed(1)}/5</span>
                <a href="#danh-gia" className="text-sm text-green-600 hover:underline">({phone.reviewCount} đánh giá)</a>
              </div>
            )}

            {/* Price */}
            {selectedVariant && (
              <div className="mb-4">
                {selectedVariant.discountPrice ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-red-600">{formatVND(selectedVariant.discountPrice)}</span>
                    <span className="text-lg text-gray-400 line-through">{formatVND(selectedVariant.price)}</span>
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                      -{Math.round((1 - selectedVariant.discountPrice / selectedVariant.price) * 100)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-red-600">{formatVND(selectedVariant.price)}</span>
                )}

                {/* Best Voucher deal badge */}
                {bestVoucher && (
                  <div className="mt-2.5 inline-flex flex-wrap items-center gap-2 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-green-800">
                      <Ticket className="h-4 w-4 text-green-600" />
                      <span>Giá sau voucher tốt nhất:</span>
                      <span className="text-base font-bold text-red-600">{formatVND(bestVoucher.finalPrice)}</span>
                    </div>
                    <span className="rounded-full bg-green-600 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-sm">
                      Mã {bestVoucher.code} (-{formatVND(bestVoucher.discountAmount)})
                    </span>
                  </div>
                )}
              </div>
            )}

            <p className="mb-6 text-sm leading-relaxed text-gray-600">{phone.description}</p>

            {/* Variant selectors */}
            {phone.variants && phone.variants.length > 0 && (
              <div className="mb-6 rounded-xl bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Chọn phiên bản:</h3>
                <div className="flex flex-wrap gap-2.5">
                  {phone.variants.map((v, idx) => {
                    const isVInactive = v.status === 'INACTIVE';
                    const isVOutOfStock = v.stockQuantity <= 0;
                    return (
                      <Radio.Button
                        key={v.id}
                        value={v.id}
                        data-testid={`variant-radio-${v.id}`}
                        checked={activeVariantId === v.id}
                        onClick={() => {
                          setUserSelectedVariantId(v.id);
                          if (idx < images.length) {
                            setUserSelectedImageIndex(idx);
                          }
                        }}
                        disabled={isVInactive || isVOutOfStock}
                        className="!m-0 !rounded-lg !px-3.5 !py-2 !h-auto"
                      >
                        <span className="text-xs">
                          {v.ram}/{v.storage} — {v.color}
                          {isVInactive
                            ? ' (Ngừng kinh doanh)'
                            : isVOutOfStock
                              ? ' (Hết hàng)'
                              : ''}
                        </span>
                      </Radio.Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock info */}
            {selectedVariant && (
              <div className="mb-4">
                {isProductInactive ? (
                  <p className="text-sm font-medium text-red-600">Sản phẩm ngừng kinh doanh</p>
                ) : isVariantInactive ? (
                  <p className="text-sm font-medium text-amber-700">Phiên bản ngừng kinh doanh</p>
                ) : selectedVariant.stockQuantity > 0 ? (
                  <p className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" /> Còn hàng ({selectedVariant.stockQuantity} sản phẩm)
                  </p>
                ) : (
                  <p className="text-sm text-red-500">Tạm hết hàng</p>
                )}
              </div>
            )}

            {/* Add to cart button */}
            <Button
              type="primary"
              size="large"
              disabled={
                !selectedVariant ||
                isProductInactive ||
                isVariantInactive ||
                selectedVariant.stockQuantity <= 0
              }
              onClick={handleAddToCart}
              icon={<ShoppingCart className="h-5 w-5" />}
              className="mb-2 !h-12 !w-full !rounded-full !bg-green-600 !text-base !font-semibold hover:!bg-green-700 disabled:!bg-gray-200 disabled:!text-gray-400"
            >
              {isProductInactive
                ? 'Sản phẩm ngừng kinh doanh'
                : isVariantInactive
                  ? 'Phiên bản ngừng kinh doanh'
                  : selectedVariant && selectedVariant.stockQuantity > 0
                    ? 'Thêm vào giỏ hàng'
                    : 'Hết hàng'}
            </Button>
          </div>
        </div>

        {/* Specs table */}
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Thông số kỹ thuật</h2>
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['Màn hình', phone.screen],
                  ['Chip', phone.chip],
                  ['Hệ điều hành', phone.os],
                  ['Camera sau', phone.rearCamera],
                  ['Camera trước', phone.frontCamera],
                  ['Pin', phone.battery],
                  ['Bảo hành', phone.warranty],
                ].filter(([, val]) => val).map(([label, value]) => (
                  <tr key={label} className="border-b border-gray-100 last:border-0">
                    <td className="w-48 bg-gray-50 px-4 py-3 font-medium text-gray-700">{label}</td>
                    <td className="px-4 py-3 text-gray-600">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reviews Section */}
        <ProductReviewsSection phoneId={phone.id} phoneName={phone.name} />

        {/* Related products */}
        {related?.content && (
          <div className="mt-12">
            <h2 className="mb-4 text-xl font-bold">Sản phẩm liên quan</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {related.content.filter((p) => p.id !== phone.id).slice(0, 5).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
