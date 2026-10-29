/**
 * Cart & Order types
 */

import type { Product } from './product';

export interface CartItem {
  id: string;
  productId: string;
  /** The concrete PhoneVariant id (price/stock source), distinct from phone.id.
   *  Optional: legacy persisted cart items (before variantId) lack it. */
  variantId?: number;
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedStorage?: string;
  addedAt: string;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  appliedVoucher?: AppliedVoucher;
}

export interface AppliedVoucher {
  code: string;
  discountAmount: number;
  title: string;
}

export interface WishlistItem {
  productId: string;
  addedAt: string;
}
