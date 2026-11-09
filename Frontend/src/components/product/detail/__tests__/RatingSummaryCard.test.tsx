import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RatingSummaryCard } from '../RatingSummaryCard';
import type { ReviewSummary } from '@/types/api';

describe('RatingSummaryCard', () => {
  const mockSummary: ReviewSummary = {
    averageRating: 4.8,
    totalReviews: 20,
    distribution: {
      5: 16, // 80%
      4: 2,  // 10%
      3: 1,  // 5%
      2: 1,  // 5%
      1: 0,  // 0%
    },
  };

  it('renders average rating and total reviews correctly', () => {
    render(<RatingSummaryCard summary={mockSummary} />);

    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('trên 5')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText(/lượt đánh giá/i)).toBeInTheDocument();
  });

  it('renders progress bars with correct percentages and counts', () => {
    render(<RatingSummaryCard summary={mockSummary} />);

    // 5 sao: 16 lượt (80%)
    const bar5 = screen.getByRole('progressbar', { name: /5 sao: 16 đánh giá \(80%\)/i });
    expect(bar5).toHaveAttribute('aria-valuenow', '80');

    // 4 sao: 2 lượt (10%)
    const bar4 = screen.getByRole('progressbar', { name: /4 sao: 2 đánh giá \(10%\)/i });
    expect(bar4).toHaveAttribute('aria-valuenow', '10');

    // 1 sao: 0 lượt (0%)
    const bar1 = screen.getByRole('progressbar', { name: /1 sao: 0 đánh giá \(0%\)/i });
    expect(bar1).toHaveAttribute('aria-valuenow', '0');
  });

  it('handles totalReviews = 0 gracefully without division by zero', () => {
    const emptySummary: ReviewSummary = {
      averageRating: 0,
      totalReviews: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };

    render(<RatingSummaryCard summary={emptySummary} />);

    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('Chưa có đánh giá')).toBeInTheDocument();

    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(5);
    progressBars.forEach((bar) => {
      expect(bar).toHaveAttribute('aria-valuenow', '0');
    });
  });

  it('triggers onSelectFilter when a star row is clicked', () => {
    const onSelectFilter = vi.fn();
    render(<RatingSummaryCard summary={mockSummary} onSelectFilter={onSelectFilter} />);

    const row5 = screen.getByTitle(/Lọc theo đánh giá 5 sao/i);
    fireEvent.click(row5);

    expect(onSelectFilter).toHaveBeenCalledWith(5);
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(<RatingSummaryCard isLoading={true} />);
    expect(screen.getByLabelText('Đang tải dữ liệu tổng quan đánh giá')).toBeInTheDocument();
  });
});

