import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LowStockAlertBadge from '../LowStockAlertBadge';

afterEach(cleanup);

describe('LowStockAlertBadge', () => {
  it.each([0, 3, 5])('shows an animated warning for stock %i', (stockQuantity) => {
    render(<LowStockAlertBadge stockQuantity={stockQuantity} />);
    expect(screen.getByText(stockQuantity === 0 ? 'Hết hàng' : 'Sắp hết').closest('.ant-tag'))
      .toHaveClass('motion-safe:animate-pulse');
  });

  it('hides the warning above the low-stock threshold', () => {
    const { container } = render(<LowStockAlertBadge stockQuantity={6} />);
    expect(container).toBeEmptyDOMElement();
  });
});
