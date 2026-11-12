/**
 * Checkout types
 */

import type { CartItem } from './cart';

export type CheckoutStep = 1 | 2 | 3;
export type DeliveryMethod = 'standard' | 'express';
export type PaymentMethod =
  | 'cod'
  | 'bank-transfer'
  | 'atm'
  | 'e-wallet'
  | 'credit-card';

export interface ShippingInfo {
  fullName: string;
  phone: string;
  email: string;
  province: string;
  district: string;
  ward: string;
  address: string;
  note?: string;
  shipToDifferentAddress: boolean;
}

export interface CheckoutState {
  currentStep: CheckoutStep;
  shipping: ShippingInfo;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  voucherCode?: string;
  voucherDiscount: number;
  /** The UserPromotion row id, sent to the backend when placing the order */
  userPromotionId?: number;
  /** Isolated single item when checking out via "Mua ngay" (does not alter or clear cart) */
  buyNowItem?: CartItem;
  orderId?: string;
  completedAt?: string;
}
