import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductDetailSkeleton from '../ProductDetailSkeleton';

describe('ProductDetailSkeleton Component', () => {
  it('hiển thị khung skeleton chi tiết sản phẩm với vai trò accessibility', () => {
    render(<ProductDetailSkeleton className="custom-detail-skeleton" />);

    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-label', 'Đang tải chi tiết sản phẩm');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Đang tải thông tin sản phẩm...')).toHaveClass('sr-only');
    expect(skeleton).toHaveClass('custom-detail-skeleton');
  });

  it('chứa các khối placeholder animate-pulse tương ứng với gallery và buy-box', () => {
    const { container } = render(<ProductDetailSkeleton />);

    const pulseElements = container.querySelectorAll('.animate-pulse');
    // Bố cục gồm placeholder ảnh chính, thumbnails, thông số, giá, nút mua hàng,...
    expect(pulseElements.length).toBeGreaterThanOrEqual(10);
  });
});

