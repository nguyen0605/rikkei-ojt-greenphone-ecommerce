import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductReviewsSection } from '../ProductReviewsSection';
import { reviewService } from '@/services/reviewService';
import type { ReviewDTO, ReviewSummary, PageResponse } from '@/types/api';

vi.mock('@/services/reviewService', () => ({
  reviewService: {
    summary: vi.fn(),
    byPhone: vi.fn(),
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('ProductReviewsSection', () => {
  const mockSummary: ReviewSummary = {
    averageRating: 4.7,
    totalReviews: 3,
    distribution: { 5: 2, 4: 1, 3: 0, 2: 0, 1: 0 },
  };

  const mockReviews: ReviewDTO[] = [
    {
      id: 1,
      userId: 10,
      userName: 'Nguyễn Văn An',
      phoneId: 1,
      rating: 5,
      content: 'Máy dùng rất mượt và đẹp.',
      status: 'SHOW',
      createdAt: '2026-10-15T10:00:00Z',
      orderDetailId: 101,
      images: ['https://example.com/img1.jpg'],
    },
    {
      id: 2,
      userId: 20,
      userName: 'Trần Thị Bình',
      phoneId: 1,
      rating: 4,
      content: 'Chụp hình đẹp nhưng pin hơi nóng một chút.',
      status: 'SHOW',
      createdAt: '2026-10-16T12:00:00Z',
      orderDetailId: 102,
    },
    {
      id: 3,
      userId: 30,
      userName: 'Lê Hoàng Cường',
      phoneId: 1,
      rating: 5,
      content: 'Tuyệt vời ông mặt trời!',
      status: 'SHOW',
      createdAt: '2026-10-17T14:00:00Z',
      orderDetailId: 103,
    },
  ];

  const mockPageResponse: PageResponse<ReviewDTO> = {
    content: mockReviews,
    page: 0,
    size: 5,
    totalElements: 3,
    totalPages: 1,
    last: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders review summary and review list when data loads successfully', async () => {
    vi.mocked(reviewService.summary).mockResolvedValue(mockSummary);
    vi.mocked(reviewService.byPhone).mockResolvedValue(mockPageResponse);

    renderWithClient(<ProductReviewsSection phoneId={1} phoneName="iPhone 15 Pro Max" />);

    // Chờ dữ liệu load xong
    await waitFor(() => {
      expect(screen.getByText('4.7')).toBeInTheDocument();
      expect(screen.getByText(/Máy dùng rất mượt và đẹp/i)).toBeInTheDocument();
      expect(screen.getByText(/Tuyệt vời ông mặt trời/i)).toBeInTheDocument();
    });

    // Check masked names
    expect(screen.getByText(/Nguyễn/)).toBeInTheDocument();
    expect(screen.getByText(/Trần/)).toBeInTheDocument();
  });

  it('renders empty state when product has zero reviews', async () => {
    vi.mocked(reviewService.summary).mockResolvedValue({
      averageRating: 0,
      totalReviews: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    });
    vi.mocked(reviewService.byPhone).mockResolvedValue({
      content: [],
      page: 0,
      size: 5,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });

    renderWithClient(<ProductReviewsSection phoneId={2} />);

    await waitFor(() => {
      expect(screen.getByText(/Chưa có đánh giá nào/i)).toBeInTheDocument();
      expect(screen.getByText(/Bạn sẽ là một trong những khách hàng đầu tiên/i)).toBeInTheDocument();
    });
  });

  it('renders error state and retry button on fetch failure', async () => {
    vi.mocked(reviewService.summary).mockRejectedValue(new Error('Network error'));
    vi.mocked(reviewService.byPhone).mockRejectedValue(new Error('Network error'));

    renderWithClient(<ProductReviewsSection phoneId={1} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Không thể tải đánh giá/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    expect(retryBtn).toBeInTheDocument();
  });

  it('filters reviews by star rating and shows empty filter state when no reviews match', async () => {
    vi.mocked(reviewService.summary).mockResolvedValue(mockSummary);
    vi.mocked(reviewService.byPhone).mockResolvedValue(mockPageResponse);

    renderWithClient(<ProductReviewsSection phoneId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Máy dùng rất mượt và đẹp/i)).toBeInTheDocument();
    });

    // Lọc theo 4 sao
    const tab4 = screen.getByRole('tab', { name: /4 sao/i });
    fireEvent.click(tab4);

    // Review 4 sao vẫn còn
    expect(screen.getByText(/Chụp hình đẹp nhưng pin hơi nóng/i)).toBeInTheDocument();
    // Review 5 sao bị ẩn đi
    expect(screen.queryByText(/Máy dùng rất mượt và đẹp/i)).not.toBeInTheDocument();

    // Lọc theo 1 sao (không có bài nào)
    const tab1 = screen.getByRole('tab', { name: /1 sao/i });
    fireEvent.click(tab1);

    expect(screen.getByText(/Không tìm thấy đánh giá nào phù hợp với bộ lọc/i)).toBeInTheDocument();

    // Bấm nút "Xem tất cả đánh giá" để reset filter
    const resetBtn = screen.getByRole('button', { name: /Xem tất cả đánh giá/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText(/Máy dùng rất mượt và đẹp/i)).toBeInTheDocument();
  });

  it('filters reviews with images only when "Có hình ảnh" tab is selected', async () => {
    vi.mocked(reviewService.summary).mockResolvedValue(mockSummary);
    vi.mocked(reviewService.byPhone).mockResolvedValue(mockPageResponse);

    renderWithClient(<ProductReviewsSection phoneId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Máy dùng rất mượt và đẹp/i)).toBeInTheDocument();
    });

    const imageTab = screen.getByRole('tab', { name: /Có hình ảnh/i });
    fireEvent.click(imageTab);

    // Review id 1 có ảnh -> hiển thị
    expect(screen.getByText(/Máy dùng rất mượt và đẹp/i)).toBeInTheDocument();
    // Review id 2 không có ảnh -> bị lọc
    expect(screen.queryByText(/Chụp hình đẹp nhưng pin hơi nóng/i)).not.toBeInTheDocument();
  });

  it('renders "Xem thêm đánh giá" button when more reviews are available', async () => {
    vi.mocked(reviewService.summary).mockResolvedValue({
      averageRating: 4.8,
      totalReviews: 12,
      distribution: { 5: 12 },
    });
    vi.mocked(reviewService.byPhone).mockResolvedValue({
      content: mockReviews, // 3 reviews
      page: 0,
      size: 3,
      totalElements: 12,
      totalPages: 4,
      last: false,
    });

    renderWithClient(<ProductReviewsSection phoneId={1} initialSize={3} />);

    await waitFor(() => {
      expect(screen.getByText(/Xem thêm đánh giá/i)).toBeInTheDocument();
      expect(screen.getByText(/Đang hiển thị 3 trên tổng số 12 đánh giá/i)).toBeInTheDocument();
    });

    // Click xem thêm
    const loadMoreBtn = screen.getByRole('button', { name: /Xem thêm đánh giá/i });
    fireEvent.click(loadMoreBtn);

    expect(reviewService.byPhone).toHaveBeenCalledWith(1, { page: 0, size: 6 });
  });
});
