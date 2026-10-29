/**
 * Voucher & Promotion types
 */

export type VoucherType = 'percentage' | 'fixed' | 'shipping' | 'category';

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  type: VoucherType;
  category: VoucherCategory;
  discountValue: number; // % hoặc VND
  minOrderValue: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usedCount: number;
  remainingUsage: number;
  status: 'active' | 'expired' | 'used';
}

export type VoucherCategory =
  | 'all'
  | 'product-discount'
  | 'percentage'
  | 'fixed-amount'
  | 'shipping';

export interface VoucherTab {
  key: VoucherCategory;
  label: string;
}
