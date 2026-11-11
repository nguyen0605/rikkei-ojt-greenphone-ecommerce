import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  CartItem,
  CheckoutState,
  CheckoutStep,
  DeliveryMethod,
  PaymentMethod,
  ShippingInfo,
} from '@/types';

const BUY_NOW_STORAGE_KEY = 'greenphone_buy_now_item';

function readBuyNowItem(): CartItem | undefined {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return undefined;
  }
  try {
    const raw = window.sessionStorage.getItem(BUY_NOW_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem) : undefined;
  } catch {
    return undefined;
  }
}

function persistBuyNowItem(item: CartItem | undefined): void {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return;
  }
  try {
    if (item) {
      window.sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify(item));
    } else {
      window.sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or serialization errors
  }
}

const initialBuyNowItem = readBuyNowItem();

const initialState: CheckoutState = {
  currentStep: 1,
  shipping: {
    fullName: '',
    phone: '',
    email: '',
    province: '',
    district: '',
    ward: '',
    address: '',
    shipToDifferentAddress: false,
  },
  delivery: 'standard',
  payment: 'cod',
  voucherCode: undefined,
  voucherDiscount: 0,
  userPromotionId: undefined,
  ...(initialBuyNowItem ? { buyNowItem: initialBuyNowItem } : {}),
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setCurrentStep: (state, action: PayloadAction<CheckoutStep>) => {
      state.currentStep = action.payload;
    },
    startBuyNow: (state, action: PayloadAction<CartItem>) => {
      state.buyNowItem = action.payload;
      state.currentStep = 1;
      state.userPromotionId = undefined;
      state.voucherCode = undefined;
      state.voucherDiscount = 0;
      persistBuyNowItem(action.payload);
    },
    clearBuyNow: (state) => {
      state.buyNowItem = undefined;
      persistBuyNowItem(undefined);
    },
    updateBuyNowQuantity: (state, action: PayloadAction<number>) => {
      if (!state.buyNowItem) return;
      const requested = Number.isFinite(action.payload) ? Math.floor(action.payload) : 1;
      const maxStock = state.buyNowItem.maxStock;
      const clamped =
        maxStock !== undefined && maxStock > 0
          ? Math.min(Math.max(1, requested), maxStock)
          : Math.max(1, requested);
      state.buyNowItem = {
        ...state.buyNowItem,
        quantity: clamped,
      };
      persistBuyNowItem(state.buyNowItem);
    },
    nextStep: (state) => {
      if (state.currentStep < 3) state.currentStep += 1;
    },
    prevStep: (state) => {
      if (state.currentStep > 1) state.currentStep -= 1;
    },
    updateShipping: (state, action: PayloadAction<Partial<ShippingInfo>>) => {
      state.shipping = { ...state.shipping, ...action.payload };
    },
    setDelivery: (state, action: PayloadAction<DeliveryMethod>) => {
      state.delivery = action.payload;
    },
    setPayment: (state, action: PayloadAction<PaymentMethod>) => {
      state.payment = action.payload;
    },
    applyCheckoutVoucher: (
      state,
      action: PayloadAction<{ userPromotionId: number; code: string; discount: number }>,
    ) => {
      state.userPromotionId = action.payload.userPromotionId;
      state.voucherCode = action.payload.code;
      state.voucherDiscount = action.payload.discount;
    },
    removeCheckoutVoucher: (state) => {
      state.userPromotionId = undefined;
      state.voucherCode = undefined;
      state.voucherDiscount = 0;
    },
    completeOrder: (
      state,
      action: PayloadAction<{ orderId: string }>,
    ) => {
      state.currentStep = 3;
      state.orderId = action.payload.orderId;
      state.completedAt = new Date().toISOString();
      state.buyNowItem = undefined;
      persistBuyNowItem(undefined);
    },
    resetCheckout: () => {
      persistBuyNowItem(undefined);
      return {
        ...initialState,
        buyNowItem: undefined,
      };
    },
  },
});

export const {
  setCurrentStep,
  startBuyNow,
  clearBuyNow,
  updateBuyNowQuantity,
  nextStep,
  prevStep,
  updateShipping,
  setDelivery,
  setPayment,
  applyCheckoutVoucher,
  removeCheckoutVoucher,
  completeOrder,
  resetCheckout,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;
