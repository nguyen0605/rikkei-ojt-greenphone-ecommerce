import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, App, Rate, Progress } from 'antd';
import { ShoppingCart, Star, Zap } from 'lucide-react';
import { Breadcrumb, ProductCard } from '@/components/common';
import { VariantSelector } from '@/components/product-detail';
import { phoneService, reviewService } from '@/services';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addCartItem, addToCart } from '@/store/slices/cartSlice';
import { formatVND } from '@/utils';
import type { PhoneDetailDTO, PhoneVariantDTO, PhoneImageDTO, ReviewDTO, ReviewSummary } from '@/types/api';
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
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { message } = App.useApp();
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset state when product id changes
  const [prevId, setPrevId] = useState(id);
  if (prevId !== id) {
    setPrevId(id);
    setActiveImageIndex(0);
    setSelectedVariantId(null);
  }

  const { data: phone, isLoading } = useQuery<PhoneDetailDTO>({
    queryKey: ['phone', id],
    queryFn: () => phoneService.detail(Number(id)),
    enabled: !!id,
  });

  const { data: reviews } = useQuery<ReviewDTO[]>({
    queryKey: ['reviews', id],
    queryFn: () => reviewService.byPhone(Number(id)).then((r) => (r as { content: ReviewDTO[] }).content || []),
    enabled: !!id,
  });

  const { data: reviewSummary } = useQuery<ReviewSummary>({
    queryKey: ['reviews', 'summary', id],
    queryFn: () => reviewService.summary(Number(id)),
    enabled: !!id,
  });

  const { data: related } = useQuery({
    queryKey: ['phones', 'related', phone?.brandId],
    // Lọc theo brand (backend bind param số nhiều `brandIds`) — cùng hãng là "liên quan" hợp lý nhất
    queryFn: () => phoneService.list({ brandIds: String(phone?.brandId), size: '5' }),
    enabled: !!phone,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Derived selected variant (defaults to in-stock variant or first)
  const variants = phone?.variants;
  let selectedVariant: PhoneVariantDTO | null = null;
  if (variants && variants.length > 0) {
    if (selectedVariantId !== null) {
      selectedVariant = variants.find((v) => v.id === selectedVariantId) || null;
    }
    if (!selectedVariant) {
      selectedVariant = variants.find((v) => v.stockQuantity > 0) || variants[0];
    }
  }

  if (isLoading) return <div className="p-8 text-center text-gray-500">Đang tải...</div>;
  if (!phone) return <div className="p-8 text-center text-gray-500">Không tìm thấy sản phẩm</div>;

  const images = phone.images?.length ? phone.images : phone.mainImageUrl ? [{ id: 0, phoneId: phone.id, imageUrl: phone.mainImageUrl, isMain: true } as PhoneImageDTO] : [];
  const activeImage = images[Math.min(activeImageIndex, images.length - 1)]?.imageUrl || phone.mainImageUrl;

  const handleVariantChange = (variant: PhoneVariantDTO) => {
    setSelectedVariantId(variant.id);
    if (images.length > 1 && phone.variants) {
      // 1. Try matching image by color keyword in URL
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/[^a-z0-9]/g, '');

      const colorNorm = normalize(variant.color || '');
      let foundIndex = -1;

      if (colorNorm) {
        foundIndex = images.findIndex((img) => {
          const urlNorm = normalize(img.imageUrl || '');
          return urlNorm.includes(colorNorm);
        });
      }

      // 2. If not matched by URL slug, fallback to position of color in distinct colors list
      if (foundIndex === -1) {
        const distinctColors: string[] = [];
        phone.variants.forEach((v) => {
          if (v.color && !distinctColors.includes(v.color)) {
            distinctColors.push(v.color);
          }
        });
        const colorIdx = distinctColors.indexOf(variant.color);
        if (colorIdx >= 0 && colorIdx < images.length) {
          foundIndex = colorIdx;
        }
      }

      if (foundIndex >= 0 && foundIndex < images.length) {
        setActiveImageIndex(foundIndex);
      }
    }
  };

  const handleAddToCart = async () => {
    if (!selectedVariant || selectedVariant.stockQuantity <= 0) {
      message.warning('Sản phẩm này đã hết hàng');
      return;
    }
    if (!isAuthenticated) {
      dispatch(addToCart({
        product: toProduct(phone, selectedVariant),
        variantId: selectedVariant.id,
        quantity: 1,
        color: selectedVariant.color,
        storage: selectedVariant.storage,
      }));
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

  const handleBuyNow = async () => {
    if (!selectedVariant || selectedVariant.stockQuantity <= 0) {
      message.warning('Sản phẩm này đã hết hàng');
      return;
    }
    await handleAddToCart();
    navigate('/gio-hang');
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Sản phẩm', href: '/san-pham' }, { label: phone.name }]} className="mb-6" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left — Images */}
          <div>
            {/* Ảnh lớn — cố định khung, không nhảy khi load */}
            <div className="aspect-square w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
              <img
                src={activeImage}
                alt={phone.name}
                width={600}
                height={600}
                loading="eager"
                className="h-full w-full object-cover"
              />
            </div>
            {/* Ảnh nhỏ — bấm để hiện lên ảnh lớn */}
            {images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImageIndex(i)}
                    aria-label={`Xem ảnh ${i + 1}`}
                    className={`overflow-hidden rounded-lg border-2 transition ${
                      i === activeImageIndex ? 'border-green-500' : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <img
                      src={img.imageUrl}
                      alt=""
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="h-16 w-16 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — Info */}
          <div>
            <p className="text-sm text-gray-500">{phone.brandName}</p>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">{phone.name}</h1>

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
              </div>
            )}

            <p className="mb-6 text-sm leading-relaxed text-gray-600">{phone.description}</p>

            {/* Variant selector — 2 nhóm độc lập: Dung lượng & Màu sắc Swatch */}
            {phone.variants && phone.variants.length > 0 && (
              <VariantSelector
                variants={phone.variants}
                selectedVariantId={selectedVariant?.id ?? null}
                onVariantChange={handleVariantChange}
                className="mb-6"
              />
            )}

            {/* Action buttons: Thêm vào giỏ hàng & Mua ngay */}
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button
                type="primary"
                size="large"
                disabled={!selectedVariant || selectedVariant.stockQuantity <= 0}
                onClick={handleAddToCart}
                icon={<ShoppingCart className="h-5 w-5" />}
                className="!h-12 !flex-1 !rounded-full !bg-green-600 !text-base !font-semibold hover:!bg-green-700"
              >
                {selectedVariant && selectedVariant.stockQuantity > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
              </Button>
              <Button
                size="large"
                disabled={!selectedVariant || selectedVariant.stockQuantity <= 0}
                onClick={handleBuyNow}
                icon={<Zap className="h-5 w-5" />}
                className="!h-12 !flex-1 !rounded-full !border-2 !border-green-600 !text-base !font-semibold !text-green-700 hover:!bg-green-50"
              >
                Mua ngay
              </Button>
            </div>
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

        {/* Reviews */}
        <div id="danh-gia" className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Đánh giá ({reviewSummary?.totalReviews ?? reviews?.length ?? 0})</h2>

          {/* Rating summary card */}
          {reviewSummary && reviewSummary.totalReviews > 0 && (
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                {/* Big number + stars */}
                <div className="text-center sm:w-52 sm:shrink-0">
                  <div className="text-5xl font-extrabold text-gray-900">{reviewSummary.averageRating.toFixed(1)}</div>
                  <div className="mt-1 text-sm text-gray-500">trên 5</div>
                  <Rate disabled allowHalf value={reviewSummary.averageRating} className="mt-2 !text-base" />
                  <div className="mt-1 text-sm text-gray-500">{reviewSummary.totalReviews} đánh giá</div>
                </div>

                {/* Distribution bars 5 → 1 */}
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviewSummary.distribution[star] || 0;
                    const pct = reviewSummary.totalReviews > 0 ? (count / reviewSummary.totalReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-sm">
                        <span className="w-8 shrink-0 text-gray-600">{star} ★</span>
                        <Progress percent={Math.round(pct)} size="small" className="!flex-1" strokeColor="#f59e0b" />
                        <span className="w-6 shrink-0 text-right text-gray-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Review list */}
          {reviews && reviews.length > 0 && (
            <div className="space-y-3">
              {reviews.slice(0, 5).map((r) => (
                <div key={r.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{r.userName || `User #${r.userId}`}</span>
                    <Rate disabled value={r.rating} className="!text-sm" />
                  </div>
                  <p className="text-sm text-gray-600">{r.content}</p>
                  <p className="mt-1 text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

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
