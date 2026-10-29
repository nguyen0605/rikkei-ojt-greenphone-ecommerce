import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  CheckoutState,
  CheckoutStep,
  DeliveryMethod,
  PaymentMethod,
  ShippingInfo,
} from '@/types';

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
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setCurrentStep: (state, action: PayloadAction<CheckoutStep>) => {
      state.currentStep = action.payload;
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
    },
    resetCheckout: () => initialState,
  },
});

export const {
  setCurrentStep,
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
