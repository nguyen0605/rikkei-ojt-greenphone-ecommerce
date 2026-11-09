import { describe, it, expect } from 'vitest';
import { calculateBestVoucherForPrice } from '../voucherUtils';
import type { UserPromotionDTO } from '@/types/api';

describe('calculateBestVoucherForPrice', () => {
  const mockPromos: UserPromotionDTO[] = [
    {
      id: 1,
      userId: 1,
      promotionId: 101,
      code: 'GIAM10K',
      name: 'Giảm 10K',
      discountType: 'FIXED',
      discountValue: 10000,
      maxDiscountAmount: 10000,
      minOrderAmount: 50000,
      startDate: '2026-01-01T00:00:00',
      endDate: '2026-12-31T23:59:59',
      status: 'AVAILABLE',
      receivedAt: '2026-02-01T00:00:00',
      usedAt: null,
    },
    {
      id: 2,
      userId: 1,
      promotionId: 102,
      code: 'GIAM10PT',
      name: 'Giảm 10% tối đa 100K',
      discountType: 'PERCENT',
      discountValue: 10,
      maxDiscountAmount: 100000,
      minOrderAmount: 100000,
      startDate: '2026-01-01T00:00:00',
      endDate: '2026-12-31T23:59:59',
      status: 'AVAILABLE',
      receivedAt: '2026-02-01T00:00:00',
      usedAt: null,
    },
    {
      id: 3,
      userId: 1,
      promotionId: 103,
      code: 'EXPIRED200K',
      name: 'Giảm 200K đã hết hạn',
      discountType: 'FIXED',
      discountValue: 200000,
      maxDiscountAmount: 200000,
      minOrderAmount: 0,
      startDate: '2026-01-01T00:00:00',
      endDate: '2026-08-01T00:00:00', // expired
      status: 'AVAILABLE',
      receivedAt: '2026-02-01T00:00:00',
      usedAt: null,
    },
    {
      id: 4,
      userId: 1,
      promotionId: 104,
      code: 'USED50K',
      name: 'Giảm 50K đã dùng',
      discountType: 'FIXED',
      discountValue: 50000,
      maxDiscountAmount: 50000,
      minOrderAmount: 0,
      startDate: '2026-01-01T00:00:00',
      endDate: '2026-12-31T23:59:59',
      status: 'USED',
      receivedAt: '2026-02-01T00:00:00',
      usedAt: '2026-03-01T00:00:00',
    },
  ];

  it('trả về null nếu không có giá hoặc không có voucher', () => {
    expect(calculateBestVoucherForPrice(0, mockPromos)).toBeNull();
    expect(calculateBestVoucherForPrice(100000, null)).toBeNull();
    expect(calculateBestVoucherForPrice(100000, [])).toBeNull();
  });

  it('bỏ qua voucher đã hết hạn hoặc đã sử dụng', () => {
    // Giá 40.000: không đủ điều kiện cho GIAM10K (min 50k) và GIAM10PT (min 100k)
    // EXPIRED200K và USED50K bị loại
    const result = calculateBestVoucherForPrice(40000, mockPromos);
    expect(result).toBeNull();
  });

  it('chọn voucher mang lại mức giảm cao nhất cho sản phẩm', () => {
    // Giá 500.000:
    // GIAM10K: giảm 10.000
    // GIAM10PT: 10% của 500k = 50.000 (< max 100k) -> 50.000 > 10.000 -> chọn GIAM10PT
    const result = calculateBestVoucherForPrice(500000, mockPromos);
    expect(result).not.toBeNull();
    expect(result?.code).toBe('GIAM10PT');
    expect(result?.discountAmount).toBe(50000);
    expect(result?.finalPrice).toBe(450000);
  });

  it('tôn trọng maxDiscountAmount của voucher phần trăm', () => {
    // Giá 2.000.000: 10% = 200.000, nhưng maxDiscountAmount = 100.000
    const result = calculateBestVoucherForPrice(2000000, mockPromos);
    expect(result).not.toBeNull();
    expect(result?.code).toBe('GIAM10PT');
    expect(result?.discountAmount).toBe(100000);
    expect(result?.finalPrice).toBe(1900000);
  });
});

