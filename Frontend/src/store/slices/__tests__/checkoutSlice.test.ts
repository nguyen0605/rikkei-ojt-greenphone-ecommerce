import { describe, it, expect } from 'vitest';
import checkoutReducer, {
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
} from '../checkoutSlice';
import type { CheckoutState } from '@/types';

describe('checkoutSlice', () => {
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
  };

  it('should return initial state', () => {
    expect(checkoutReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('should set current step', () => {
    const state = checkoutReducer(initialState, setCurrentStep(2));
    expect(state.currentStep).toBe(2);
  });

  it('should go to next step', () => {
    const state = checkoutReducer(initialState, nextStep());
    expect(state.currentStep).toBe(2);
  });

  it('should not exceed max step (3)', () => {
    const state1 = checkoutReducer(initialState, setCurrentStep(3));
    const state2 = checkoutReducer(state1, nextStep());
    expect(state2.currentStep).toBe(3);
  });

  it('should go to previous step', () => {
    const state1 = checkoutReducer(initialState, setCurrentStep(3));
    const state2 = checkoutReducer(state1, prevStep());
    expect(state2.currentStep).toBe(2);
  });

  it('should not go below step 1', () => {
    const state = checkoutReducer(initialState, prevStep());
    expect(state.currentStep).toBe(1);
  });

  it('should update shipping info', () => {
    const state = checkoutReducer(
      initialState,
      updateShipping({ fullName: 'John Doe', phone: '0987654321' }),
    );
    expect(state.shipping.fullName).toBe('John Doe');
    expect(state.shipping.phone).toBe('0987654321');
    // Other fields should remain
    expect(state.shipping.email).toBe('');
  });

  it('should set delivery method', () => {
    const state = checkoutReducer(initialState, setDelivery('express'));
    expect(state.delivery).toBe('express');
  });

  it('should set payment method', () => {
    const state = checkoutReducer(initialState, setPayment('bank-transfer'));
    expect(state.payment).toBe('bank-transfer');
  });

  it('should apply voucher', () => {
    const state = checkoutReducer(
      initialState,
      applyCheckoutVoucher({ userPromotionId: 7, code: 'SUMMER2026', discount: 500000 }),
    );
    expect(state.voucherCode).toBe('SUMMER2026');
    expect(state.voucherDiscount).toBe(500000);
  });

  it('should remove voucher', () => {
    const state1 = checkoutReducer(
      initialState,
      applyCheckoutVoucher({ userPromotionId: 7, code: 'SUMMER2026', discount: 500000 }),
    );
    const state2 = checkoutReducer(state1, removeCheckoutVoucher());
    expect(state2.voucherCode).toBeUndefined();
    expect(state2.voucherDiscount).toBe(0);
  });

  it('should complete order', () => {
    const state = checkoutReducer(
      initialState,
      completeOrder({ orderId: '100' }),
    );
    expect(state.currentStep).toBe(3);
    expect(state.orderId).toBe('100');
    expect(state.completedAt).toBeDefined();
  });

  it('should reset checkout state', () => {
    const state1 = checkoutReducer(initialState, setCurrentStep(3));
    const state2 = checkoutReducer(state1, resetCheckout());
    expect(state2).toEqual(initialState);
  });
});
