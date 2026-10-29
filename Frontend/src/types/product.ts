/**
 * Product related types
 */

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: Brand;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  sold: number;
  images: string[];
  thumbnail: string;
  colors: ProductColor[];
  storage: ProductStorage[];
  description: string;
  specifications: ProductSpec[];
  features: ProductFeature[];
  badges?: ProductBadge[];
  isHot?: boolean;
  isNew?: boolean;
  inStock: boolean;
}

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
}

export interface ProductStorage {
  id: string;
  capacity: string; // "256GB", "512GB", "1TB"
  priceModifier?: number; // additional price
}

export interface ProductSpec {
  group: string;
  items: { label: string; value: string }[];
}

export interface ProductFeature {
  icon: string; // icon name from lucide
  title: string;
  description: string;
}

export type ProductBadge = 'hot' | 'new' | 'sale' | 'best-seller';

export type Brand =
  | 'apple'
  | 'samsung'
  | 'xiaomi'
  | 'oppo'
  | 'realme'
  | 'vivo';
