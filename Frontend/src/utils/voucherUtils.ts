import type { UserPromotionDTO } from '@/types/api';

export interface BestVoucherForProduct {
  voucherId: number;
  code: string;
  name: string;
  discountAmount: number;
  finalPrice: number;
  discountType: string;
  discountValue: number;
}

/**
 * Tính voucher mang lại mức giảm giá cao nhất cho một mức giá sản phẩm.
 * Lọc các voucher hợp lệ: AVAILABLE, chưa hết hạn, và đạt giá trị tối thiểu (minOrderAmount <= price).
 */
export function calculateBestVoucherForPrice(
  price: number | undefined | null,
  promotions: UserPromotionDTO[] | undefined | null,
): BestVoucherForProduct | null {
  if (price == null || price <= 0 || !promotions || promotions.length === 0) {
    return null;
  }

  const now = Date.now();
  let best: BestVoucherForProduct | null = null;
  let maxDiscount = 0;

  for (const promo of promotions) {
    // 1. Phải có trạng thái AVAILABLE
    if (promo.status !== 'AVAILABLE') continue;

    // 2. Không được hết hạn
    if (promo.endDate) {
      const endTimestamp = new Date(String(promo.endDate)).getTime();
      if (!isNaN(endTimestamp) && endTimestamp < now) continue;
    }

    // 3. Kiểm tra ngày bắt đầu (nếu có)
    if (promo.startDate) {
      const startTimestamp = new Date(String(promo.startDate)).getTime();
      if (!isNaN(startTimestamp) && startTimestamp > now) continue;
    }

    // 4. Kiểm tra giá trị tối thiểu
    const minOrder = Number(promo.minOrderAmount ?? 0);
    if (price < minOrder) continue;

    // 5. Tính số tiền giảm giá
    let discount = 0;
    const discountValue = Number(promo.discountValue ?? 0);
    const maxDiscountAmount = promo.maxDiscountAmount != null ? Number(promo.maxDiscountAmount) : null;

    if (promo.discountType === 'PERCENT') {
      discount = (price * discountValue) / 100;
      if (maxDiscountAmount != null && maxDiscountAmount > 0) {
        discount = Math.min(discount, maxDiscountAmount);
      }
    } else {
      // FIXED
      discount = Math.min(price, discountValue);
    }

    if (discount > maxDiscount) {
      maxDiscount = discount;
      best = {
        voucherId: promo.id,
        code: promo.code,
        name: promo.name || promo.code,
        discountAmount: Math.round(discount),
        finalPrice: Math.max(0, Math.round(price - discount)),
        discountType: promo.discountType,
        discountValue,
      };
    }
  }

  return best;
}
