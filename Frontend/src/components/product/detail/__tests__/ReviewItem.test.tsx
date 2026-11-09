import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ReviewItem } from '../ReviewItem';
import type { ReviewDTO } from '@/types/api';

describe('ReviewItem', () => {
  const baseReview: ReviewDTO = {
    id: 1,
    userId: 10,
    userName: 'Nguyễn Văn An',
    phoneId: 100,
    rating: 5,
    content: 'Sản phẩm dùng rất tốt, pin trâu và màn hình mượt mà.',
    status: 'SHOW',
    createdAt: '2026-10-15T10:00:00Z',
  };

  it('masks customer username for privacy', () => {
    render(<ReviewItem review={baseReview} />);

    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.getByText('Nguyễn V***')).toBeInTheDocument();
  });

  it('displays verified buyer badge ONLY when backend confirms purchase', () => {
    // Không có bằng chứng mua hàng
    const { rerender } = render(<ReviewItem review={baseReview} />);
    expect(
      screen.queryByText(/Đã mua hàng tại GreenPhone/i)
    ).not.toBeInTheDocument();

    // Có orderDetailId từ đơn hàng đã giao
    rerender(<ReviewItem review={{ ...baseReview, orderDetailId: 456 }} />);
    expect(
      screen.getByText(/Đã mua hàng tại GreenPhone/i)
    ).toBeInTheDocument();

    // Hoặc isPurchased = true
    rerender(<ReviewItem review={{ ...baseReview, orderDetailId: undefined, isPurchased: true }} />);
    expect(
      screen.getByText(/Đã mua hàng tại GreenPhone/i)
    ).toBeInTheDocument();
  });

  it('renders image gallery and opens lightbox on click', () => {
    const reviewWithImages: ReviewDTO = {
      ...baseReview,
      images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    };

    render(<ReviewItem review={reviewWithImages} />);

    // Kiểm tra thumbnails xuất hiện
    const openBtns = screen.getAllByRole('button', { name: /Mở xem ảnh lớn/i });
    expect(openBtns).toHaveLength(2);

    // Click vào ảnh thứ nhất
    fireEvent.click(openBtns[0]);

    // Lightbox modal xuất hiện
    const dialog = screen.getByRole('dialog', { name: /Xem ảnh đánh giá/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Ảnh 1 / 2')).toBeInTheDocument();

    // Điều hướng sang ảnh tiếp theo
    const nextBtn = screen.getByRole('button', { name: /Ảnh tiếp theo/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText('Ảnh 2 / 2')).toBeInTheDocument();

    // Đóng bằng nút X
    const closeBtn = screen.getByRole('button', { name: /Đóng xem ảnh/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('supports closing lightbox with Escape key', () => {
    const reviewWithImages: ReviewDTO = {
      ...baseReview,
      images: ['https://example.com/img1.jpg'],
    };

    render(<ReviewItem review={reviewWithImages} />);
    const openBtn = screen.getByRole('button', { name: /Mở xem ảnh lớn 1/i });
    fireEvent.click(openBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Nhấn Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('handles long content with expand/collapse toggle', () => {
    const longText = 'A'.repeat(250);
    const reviewLong: ReviewDTO = {
      ...baseReview,
      content: longText,
    };

    render(<ReviewItem review={reviewLong} />);

    const expandBtn = screen.getByRole('button', { name: /Xem thêm/i });
    expect(expandBtn).toBeInTheDocument();

    fireEvent.click(expandBtn);
    expect(screen.getByRole('button', { name: /Thu gọn/i })).toBeInTheDocument();
  });
});

