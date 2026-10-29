import { createSelector } from 'reselect';
import type { RootState } from '../index';

const selectCartItems = (state: RootState) => state.cart.items;
const selectAppliedVoucher = (state: RootState) => state.cart.appliedVoucher;
const selectCheckoutVoucherDiscount = (state: RootState) => state.checkout.voucherDiscount;
const selectSettings = (state: RootState) => state.settings;

export const selectCartItemsList = createSelector(
  [selectCartItems],
  (items) => items,
);

export const selectCartTotalItems = createSelector([selectCartItems], (items) =>
  items.reduce((sum, item) => sum + item.quantity, 0),
);

export const selectCartSubtotal = createSelector([selectCartItems], (items) =>
  items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
);

const DEFAULT_SHIPPING_FEE = 29_000;
const DEFAULT_FREE_SHIPPING_THRESHOLD = 5_000_000;

const toNumber = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const selectCartSummary = createSelector(
  [selectCartItems, selectAppliedVoucher, selectCheckoutVoucherDiscount, selectSettings],
  (items, voucher, checkoutDiscount, settings) => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const shippingFeeRaw = settings?.shippingFee !== undefined
      ? settings.shippingFee
      : toNumber(settings?.values?.SHIPPING_FEE, DEFAULT_SHIPPING_FEE);
    const freeThreshold = toNumber(settings?.values?.FREE_SHIPPING_THRESHOLD, DEFAULT_FREE_SHIPPING_THRESHOLD);
    const shippingFee = subtotal === 0 || subtotal >= freeThreshold ? 0 : shippingFeeRaw;
    // Use checkout voucher discount if present, otherwise fall back to cart voucher
    const discount = checkoutDiscount || voucher?.discountAmount || 0;
    const total = Math.max(0, subtotal + shippingFee - discount);

    return { subtotal, totalItems, shippingFee, discount, total };
  },
);

export const selectIsInCart = (productId: string) =>
  createSelector([selectCartItems], (items) =>
    items.some((i) => i.productId === productId),
  );
