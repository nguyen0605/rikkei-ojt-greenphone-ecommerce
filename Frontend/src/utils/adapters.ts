import type { PhoneDTO, PhoneVariantDTO, BrandDTO } from '@/types/api';
import type { Product, BrandInfo } from '@/types';

export function phoneToProduct(phone: PhoneDTO, variants: PhoneVariantDTO[]): Product {
  const cheapest = variants.reduce((a, b) => (b.discountPrice || b.price) < (a.discountPrice || a.price) ? b : a, variants[0]);
  return {
    id: String(phone.id),
    slug: phone.name.toLowerCase().replace(/\s+/g, '-'),
    name: phone.name,
    brand: (phone.brandName.toLowerCase() as Product['brand']) || 'apple',
    category: 'smartphone',
    price: cheapest.discountPrice || cheapest.price,
    originalPrice: cheapest.discountPrice ? cheapest.price : undefined,
    rating: 0,
    reviewCount: 0,
    sold: 0,
    images: [],
    thumbnail: phone.mainImageUrl || '',
    colors: variants.map(v => ({ id: String(v.id), name: v.color, hex: '#000000' })),
    storage: variants.map(v => ({ id: String(v.id), capacity: v.storage })),
    description: phone.description || '',
    specifications: [
      { group: 'Màn hình', items: [{ label: 'Công nghệ', value: phone.screen || '' }] },
      { group: 'Hiệu năng', items: [{ label: 'Chip', value: phone.chip || '' }] },
      { group: 'Camera', items: [{ label: 'Camera sau', value: phone.rearCamera || '' }, { label: 'Camera trước', value: phone.frontCamera || '' }] },
      { group: 'Pin', items: [{ label: 'Dung lượng', value: phone.battery || '' }] },
      { group: 'HĐH', items: [{ label: 'Hệ điều hành', value: phone.os || '' }] },
    ],
    features: [],
    inStock: variants.some(v => v.stockQuantity > 0),
  };
}

export function brandToBrandInfo(brand: BrandDTO): BrandInfo {
  return {
    id: String(brand.id),
    name: brand.name,
    logo: brand.logoUrl || '',
    href: `/san-pham?brand=${brand.id}`,
    productCount: 0,
  };
}
