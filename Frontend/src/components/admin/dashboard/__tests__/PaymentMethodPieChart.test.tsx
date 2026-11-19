import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PaymentMethodPieChart from '../PaymentMethodPieChart';
import type { PaymentMethodBreakdown } from '@/types/api';

describe('PaymentMethodPieChart', () => {
  it('renders empty state when data is empty', () => {
    render(<PaymentMethodPieChart data={[]} />);
    expect(screen.getByText('Cơ cấu thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Chưa có thanh toán')).toBeInTheDocument();
  });

  it('renders empty state when all revenues are zero', () => {
    const data: PaymentMethodBreakdown[] = [
      { paymentMethod: 'COD', revenue: 0, transactionCount: 0, percentage: 0 },
    ];
    render(<PaymentMethodPieChart data={data} />);
    expect(screen.getByText('Chưa có thanh toán')).toBeInTheDocument();
  });

  it('renders methods with transaction counts, revenue and percentages', () => {
    const data: PaymentMethodBreakdown[] = [
      { paymentMethod: 'VIETQR', revenue: 30000000, transactionCount: 3, percentage: 60 },
      { paymentMethod: 'COD', revenue: 20000000, transactionCount: 2, percentage: 40 },
    ];
    render(<PaymentMethodPieChart data={data} />);
    expect(screen.getByText('Cơ cấu thanh toán')).toBeInTheDocument();
    expect(screen.getByText('VietQR')).toBeInTheDocument();
    expect(screen.getByText('COD')).toBeInTheDocument();
    expect(screen.getByText('(3 GD)')).toBeInTheDocument();
    expect(screen.getByText('(2 GD)')).toBeInTheDocument();
    expect(screen.getByText('60.0%')).toBeInTheDocument();
    expect(screen.getByText('40.0%')).toBeInTheDocument();
  });

  it('renders fallback label and purple dot for custom/unknown payment methods', () => {
    const data: PaymentMethodBreakdown[] = [
      { paymentMethod: 'PAYPAL', revenue: 15000000, transactionCount: 1, percentage: 100 },
    ];
    render(<PaymentMethodPieChart data={data} />);
    expect(screen.getByText('PAYPAL')).toBeInTheDocument();
    expect(screen.getByText('(1 GD)')).toBeInTheDocument();
  });
});
