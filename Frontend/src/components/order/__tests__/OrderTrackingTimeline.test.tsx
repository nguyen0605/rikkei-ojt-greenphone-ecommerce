import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import OrderTrackingTimeline from '../OrderTrackingTimeline';
import { getTimelineStep } from '../orderHelpers';

describe('OrderTrackingTimeline', () => {
  describe('getTimelineStep helper', () => {
    it('returns step 1 for PENDING', () => {
      expect(getTimelineStep('PENDING')).toBe(1);
    });

    it('returns step 2 for CONFIRMED and PROCESSING', () => {
      expect(getTimelineStep('CONFIRMED')).toBe(2);
      expect(getTimelineStep('PROCESSING')).toBe(2);
    });

    it('returns step 3 for SHIPPING', () => {
      expect(getTimelineStep('SHIPPING')).toBe(3);
    });

    it('returns step 4 for DELIVERED', () => {
      expect(getTimelineStep('DELIVERED')).toBe(4);
    });

    it('returns 0 for CANCELLED', () => {
      expect(getTimelineStep('CANCELLED')).toBe(0);
    });
  });

  describe('Component Rendering', () => {
    it('renders all 4 milestones for PENDING order', () => {
      render(
        <OrderTrackingTimeline
          order={{
            orderStatus: 'PENDING',
            createdAt: '2026-08-05T02:20:16',
          }}
        />
      );

      expect(screen.getAllByText('Đã đặt hàng').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Đã xác nhận').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Đang vận chuyển').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Giao hàng thành công').length).toBeGreaterThan(0);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders CANCELLED state with alert banner and reason, NEVER as delivered', () => {
      render(
        <OrderTrackingTimeline
          order={{
            orderStatus: 'CANCELLED',
            createdAt: '2026-08-05T02:20:16',
            note: '[Lý do hủy: Tôi muốn đổi màu khác]',
          }}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('Đơn hàng đã được hủy')).toBeInTheDocument();
      expect(screen.getByText('Tôi muốn đổi màu khác')).toBeInTheDocument();
      // Should not show regular timeline list
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('renders CANCELLED state gracefully when reason is not specified', () => {
      render(
        <OrderTrackingTimeline
          order={{
            orderStatus: 'CANCELLED',
            createdAt: '2026-08-05T02:20:16',
          }}
        />
      );

      expect(screen.getByText('Đơn hàng đã được hủy')).toBeInTheDocument();
      expect(
        screen.getByText(/Đơn hàng đã được hủy thành công theo yêu cầu/i)
      ).toBeInTheDocument();
    });

    it('renders safely when createdAt is undefined or null', () => {
      render(
        <OrderTrackingTimeline
          order={{
            orderStatus: 'SHIPPING',
            createdAt: '',
          }}
        />
      );

      expect(screen.getAllByText('Đang vận chuyển').length).toBeGreaterThan(0);
    });
  });
});
