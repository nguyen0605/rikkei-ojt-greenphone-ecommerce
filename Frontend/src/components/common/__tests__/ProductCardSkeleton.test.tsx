import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductCardSkeleton from '../ProductCardSkeleton';

describe('ProductCardSkeleton Component', () => {
  it('hiển thị đầy đủ vai trò accessibility và nhãn loading', () => {
    render(<ProductCardSkeleton />);

    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-label', 'Đang tải thông tin sản phẩm');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Đang tải sản phẩm...')).toHaveClass('sr-only');
  });

  it('áp dụng class animate-pulse và tôn trọng prefers-reduced-motion', () => {
    const { container } = render(<ProductCardSkeleton className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
    // Các phần tử placeholder đều có class animate-pulse và motion-reduce:animate-none
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThanOrEqual(4);

    pulseElements.forEach((el) => {
      expect(el.className).toContain('motion-reduce:animate-none');
    });
  });
});

