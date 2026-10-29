/**
 * Category & Brand types
 */

import type { Brand } from './product';

export interface Category {
  id: string;
  name: string;
  slug: string;
  brand: Brand;
  logo: string; // emoji hoặc image URL
  productCount: number;
  href: string;
}

export interface BrandInfo {
  id: string;
  name: string;
  logo: string;
  href: string;
  productCount: number;
}

export interface NavItem {
  key: string;
  label: string;
  href: string;
}
