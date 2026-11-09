import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Radio, App } from 'antd';
import { ShoppingCart, CheckCircle, Star } from 'lucide-react';
import { Breadcrumb, ProductCard } from '@/components/common';
import { ProductReviewsSection } from '@/components/product/detail';
import { phoneService } from '@/services';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addCartItem, addToCart } from '@/store/slices/cartSlice';
import { formatVND } from '@/utils';
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
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { message } = App.useApp();
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  // Ảnh lớn đang hiển thị — bấm ảnh nhỏ để đổi
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [prevId, setPrevId] = useState(id);

  if (id !== prevId) {
    setPrevId(id);
    setActiveImageIndex(0);
    setSelectedVariantId(null);
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const { data: phone, isLoading } = useQuery<PhoneDetailDTO>({
    queryKey: ['phone', id],
    queryFn: () => phoneService.detail(Number(id)),
    enabled: !!id,
  });

  const { data: related } = useQuery({
    queryKey: ['phones', 'related', phone?.brandId],
    // Lọc theo brand (backend bind param số nhiều `brandIds`) — cùng hãng là "liên quan" hợp lý nhất
    queryFn: () => phoneService.list({ brandIds: String(phone?.brandId), size: '5' }),
    enabled: !!phone,
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Đang tải...</div>;
  if (!phone) return <div className="p-8 text-center text-gray-500">Không tìm thấy sản phẩm</div>;

  const selectedVariant = phone.variants?.find((v) => v.id === selectedVariantId) || phone.variants?.[0];
  const images = phone.images?.length ? phone.images : phone.mainImageUrl ? [{ id: 0, phoneId: phone.id, imageUrl: phone.mainImageUrl, isMain: true } as PhoneImageDTO] : [];
  const activeImage = images[Math.min(activeImageIndex, images.length - 1)]?.imageUrl || phone.mainImageUrl;

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    if (selectedVariant.stockQuantity <= 0) {
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

            {/* Variant selectors */}
            {phone.variants && phone.variants.length > 0 && (
              <div className="mb-6 rounded-xl bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Chọn phiên bản:</h3>
                <div className="flex flex-wrap gap-2.5">
                  {phone.variants.map((v) => (
                    <Radio.Button
                      key={v.id}
                      value={v.id}
                      checked={selectedVariantId === v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      disabled={v.stockQuantity <= 0}
                      className="!m-0 !rounded-lg !px-3.5 !py-2 !h-auto"
                    >
                      <span className="text-xs">
                        {v.ram}/{v.storage} — {v.color}
                        {v.stockQuantity <= 0 ? ' (Hết hàng)' : ''}
                      </span>
                    </Radio.Button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock info */}
            {selectedVariant && (
              <div className="mb-4">
                {selectedVariant.stockQuantity > 0 ? (
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
              disabled={!selectedVariant || selectedVariant.stockQuantity <= 0}
              onClick={handleAddToCart}
              icon={<ShoppingCart className="h-5 w-5" />}
              className="mb-2 !h-12 !w-full !rounded-full !bg-green-600 !text-base !font-semibold hover:!bg-green-700"
            >
              {selectedVariant && selectedVariant.stockQuantity > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
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
