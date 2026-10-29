/**
 * Checkout types
 */

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
  orderId?: string;
  completedAt?: string;
}
