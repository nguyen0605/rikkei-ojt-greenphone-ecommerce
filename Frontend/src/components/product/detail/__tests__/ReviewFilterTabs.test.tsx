import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ReviewFilterTabs } from '../ReviewFilterTabs';
import type { ReviewSummary } from '@/types/api';

describe('ReviewFilterTabs', () => {
  const mockSummary: ReviewSummary = {
    averageRating: 4.5,
    totalReviews: 12,
    distribution: { 5: 8, 4: 2, 3: 1, 2: 1, 1: 0 },
  };

  it('renders all 7 filter tabs with counts', () => {
    render(
      <ReviewFilterTabs
        currentFilter="ALL"
        onFilterChange={vi.fn()}
        summary={mockSummary}
        withImageCount={3}
      />
    );

    expect(screen.getByRole('tab', { name: /Tất cả/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /5 sao/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /4 sao/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /3 sao/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /2 sao/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /1 sao/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Có hình ảnh/i })).toBeInTheDocument();

    // Verify count badges
    expect(screen.getByText('12')).toBeInTheDocument(); // total
    expect(screen.getByText('8')).toBeInTheDocument();  // 5 star
    expect(screen.getByText('3')).toBeInTheDocument();  // with image
  });

  it('marks the current filter as active', () => {
    const { rerender } = render(
      <ReviewFilterTabs
        currentFilter="ALL"
        onFilterChange={vi.fn()}
        summary={mockSummary}
      />
    );

    const allTab = screen.getByRole('tab', { name: /Tất cả/i });
    expect(allTab).toHaveAttribute('aria-selected', 'true');

    rerender(
      <ReviewFilterTabs
        currentFilter={5}
        onFilterChange={vi.fn()}
        summary={mockSummary}
      />
    );

    expect(allTab).toHaveAttribute('aria-selected', 'false');
    const star5Tab = screen.getByRole('tab', { name: /5 sao/i });
    expect(star5Tab).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onFilterChange when a tab is clicked', () => {
    const onFilterChange = vi.fn();
    render(
      <ReviewFilterTabs
        currentFilter="ALL"
        onFilterChange={onFilterChange}
        summary={mockSummary}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /5 sao/i }));
    expect(onFilterChange).toHaveBeenCalledWith(5);

    fireEvent.click(screen.getByRole('tab', { name: /Có hình ảnh/i }));
    expect(onFilterChange).toHaveBeenCalledWith('WITH_IMAGE');

    fireEvent.click(screen.getByRole('tab', { name: /1 sao/i }));
    expect(onFilterChange).toHaveBeenCalledWith(1);
  });
});

