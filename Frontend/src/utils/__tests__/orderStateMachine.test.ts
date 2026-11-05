import { describe, it, expect } from 'vitest';
import {
  ORDER_STATE_TRANSITIONS,
  isTerminalOrderStatus,
  isValidOrderStatusTransition,
  getAvailableNextStatusOptions,
  extractCancelReason,
  extractCustomerNote,
} from '../orderStateMachine';

describe('Order State Machine & Transition Rules', () => {
  describe('Terminal Status (Khóa cứng trạng thái kết thúc)', () => {
    it('should identify DELIVERED as terminal status (khóa cứng)', () => {
      expect(isTerminalOrderStatus('DELIVERED')).toBe(true);
      expect(ORDER_STATE_TRANSITIONS['DELIVERED']).toEqual([]);
    });

    it('should identify CANCELLED as terminal status (khóa cứng)', () => {
      expect(isTerminalOrderStatus('CANCELLED')).toBe(true);
      expect(ORDER_STATE_TRANSITIONS['CANCELLED']).toEqual([]);
    });

    it('should return false for non-terminal statuses', () => {
      expect(isTerminalOrderStatus('PENDING')).toBe(false);
      expect(isTerminalOrderStatus('CONFIRMED')).toBe(false);
      expect(isTerminalOrderStatus('PROCESSING')).toBe(false);
      expect(isTerminalOrderStatus('SHIPPING')).toBe(false);
      expect(isTerminalOrderStatus(null)).toBe(false);
      expect(isTerminalOrderStatus(undefined)).toBe(false);
    });
  });

  describe('Valid State Transitions', () => {
    it('should allow PENDING to transition to CONFIRMED or CANCELLED', () => {
      expect(isValidOrderStatusTransition('PENDING', 'CONFIRMED')).toBe(true);
      expect(isValidOrderStatusTransition('PENDING', 'CANCELLED')).toBe(true);
      expect(isValidOrderStatusTransition('PENDING', 'PENDING')).toBe(true);
    });

    it('should allow CONFIRMED to transition to PROCESSING or CANCELLED', () => {
      expect(isValidOrderStatusTransition('CONFIRMED', 'PROCESSING')).toBe(true);
      expect(isValidOrderStatusTransition('CONFIRMED', 'CANCELLED')).toBe(true);
    });

    it('should allow PROCESSING to transition to SHIPPING or CANCELLED', () => {
      expect(isValidOrderStatusTransition('PROCESSING', 'SHIPPING')).toBe(true);
      expect(isValidOrderStatusTransition('PROCESSING', 'CANCELLED')).toBe(true);
    });

    it('should allow SHIPPING to transition to DELIVERED or CANCELLED', () => {
      expect(isValidOrderStatusTransition('SHIPPING', 'DELIVERED')).toBe(true);
      expect(isValidOrderStatusTransition('SHIPPING', 'CANCELLED')).toBe(true);
    });
  });

  describe('Invalid State Transitions (Chặn nhảy cóc hoặc quay ngược trạng thái)', () => {
    it('should disallow skipping steps from PENDING directly to DELIVERED', () => {
      expect(isValidOrderStatusTransition('PENDING', 'DELIVERED')).toBe(false);
    });

    it('should disallow skipping steps from PENDING directly to SHIPPING', () => {
      expect(isValidOrderStatusTransition('PENDING', 'SHIPPING')).toBe(false);
    });

    it('should disallow moving from DELIVERED to any other status', () => {
      expect(isValidOrderStatusTransition('DELIVERED', 'PENDING')).toBe(false);
      expect(isValidOrderStatusTransition('DELIVERED', 'SHIPPING')).toBe(false);
      expect(isValidOrderStatusTransition('DELIVERED', 'CANCELLED')).toBe(false);
    });

    it('should disallow moving backwards from SHIPPING to CONFIRMED', () => {
      expect(isValidOrderStatusTransition('SHIPPING', 'CONFIRMED')).toBe(false);
    });

    it('should disallow moving from CANCELLED to any other status', () => {
      expect(isValidOrderStatusTransition('CANCELLED', 'PENDING')).toBe(false);
      expect(isValidOrderStatusTransition('CANCELLED', 'CONFIRMED')).toBe(false);
      expect(isValidOrderStatusTransition('CANCELLED', 'DELIVERED')).toBe(false);
    });
  });

  describe('getAvailableNextStatusOptions', () => {
    it('should only return current status and allowed next statuses for PENDING', () => {
      const options = getAvailableNextStatusOptions('PENDING');
      const values = options.map((o) => o.value);
      expect(values).toEqual(['PENDING', 'CONFIRMED', 'CANCELLED']);
    });

    it('should only return current status for terminal DELIVERED status', () => {
      const options = getAvailableNextStatusOptions('DELIVERED');
      const values = options.map((o) => o.value);
      expect(values).toEqual(['DELIVERED']);
    });

    it('should only return current status for terminal CANCELLED status', () => {
      const options = getAvailableNextStatusOptions('CANCELLED');
      const values = options.map((o) => o.value);
      expect(values).toEqual(['CANCELLED']);
    });
  });

  describe('Cancellation Reason Extraction (Không dùng localStorage)', () => {
    it('should extract cancel reason from backend note without touching localStorage', () => {
      const note = '[Lý do hủy: Hết hàng trong kho] Giao giờ hành chính';
      expect(extractCancelReason(note)).toBe('Hết hàng trong kho');
    });

    it('should extract pure customer note after removing cancel reason prefix', () => {
      const note = '[Lý do hủy: Hết hàng trong kho] Giao giờ hành chính';
      expect(extractCustomerNote(note)).toBe('Giao giờ hành chính');
    });

    it('should return null customer note if only cancel reason was recorded', () => {
      const note = '[Lý do hủy: Khách hàng đổi ý]';
      expect(extractCancelReason(note)).toBe('Khách hàng đổi ý');
      expect(extractCustomerNote(note)).toBeNull();
    });

    it('should preserve regular customer note when no cancel reason exists', () => {
      const note = 'Vui lòng gọi trước khi giao';
      expect(extractCancelReason(note)).toBeNull();
      expect(extractCustomerNote(note)).toBe('Vui lòng gọi trước khi giao');
    });
  });
});

