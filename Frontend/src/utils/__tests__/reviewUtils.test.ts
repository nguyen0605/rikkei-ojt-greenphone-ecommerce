import { describe, it, expect } from 'vitest';
import {
  maskCustomerName,
  calculateStarPercentage,
  formatReviewDate,
  isVerifiedBuyer,
  filterReviews,
} from '../reviewUtils';
import type { ReviewDTO } from '@/types/api';

describe('reviewUtils', () => {
  describe('maskCustomerName', () => {
    it('returns "Khách hàng" for null, undefined, empty, or whitespace name', () => {
      expect(maskCustomerName(null)).toBe('Khách hàng');
      expect(maskCustomerName(undefined)).toBe('Khách hàng');
      expect(maskCustomerName('')).toBe('Khách hàng');
      expect(maskCustomerName('   ')).toBe('Khách hàng');
    });

    it('masks short names properly', () => {
      expect(maskCustomerName('An')).toBe('A***');
      expect(maskCustomerName('Le')).toBe('L***');
      expect(maskCustomerName('B')).toBe('B***');
    });

    it('masks single-word usernames like "nguyen"', () => {
      const masked = maskCustomerName('nguyen');
      expect(masked).toBe('ngu***');
      expect(masked.endsWith('***')).toBe(true);
    });

    it('masks Vietnamese multi-word names', () => {
      const masked = maskCustomerName('Nguyễn Văn An');
      expect(masked).toBe('Nguyễn V***');
      expect(masked.startsWith('Nguyễn')).toBe(true);
      expect(masked.endsWith('***')).toBe(true);
      expect(masked).not.toContain('An');
    });

    it('masks email addresses without revealing domain', () => {
      const masked = maskCustomerName('thinhtattoo2006@gmail.com');
      expect(masked).not.toContain('@');
      expect(masked).not.toContain('gmail');
      expect(masked.endsWith('***')).toBe(true);
    });

    it('masks phone numbers without exposing full number', () => {
      const masked = maskCustomerName('0827242427');
      expect(masked).not.toContain('0827242427');
      expect(masked.endsWith('***')).toBe(true);
    });
  });

  describe('calculateStarPercentage', () => {
    it('returns 0 when totalReviews is 0 or negative', () => {
      expect(calculateStarPercentage(0, 0)).toBe(0);
      expect(calculateStarPercentage(5, 0)).toBe(0);
      expect(calculateStarPercentage(5, -10)).toBe(0);
    });

    it('returns 0 when count is 0 or negative', () => {
      expect(calculateStarPercentage(0, 100)).toBe(0);
      expect(calculateStarPercentage(-2, 100)).toBe(0);
    });

    it('calculates correct percentages', () => {
      expect(calculateStarPercentage(50, 100)).toBe(50);
      expect(calculateStarPercentage(8, 10)).toBe(80);
      expect(calculateStarPercentage(1, 3)).toBe(33.3);
      expect(calculateStarPercentage(10, 10)).toBe(100);
    });
  });

  describe('formatReviewDate', () => {
    it('returns empty string for invalid or missing date', () => {
      expect(formatReviewDate(null)).toBe('');
      expect(formatReviewDate(undefined)).toBe('');
      expect(formatReviewDate('')).toBe('');
      expect(formatReviewDate('not-a-date')).toBe('');
    });

    it('formats ISO dates correctly into DD/MM/YYYY format', () => {
      const formatted = formatReviewDate('2026-11-05T08:30:00Z');
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('isVerifiedBuyer', () => {
    it('returns true when isPurchased is true', () => {
      expect(isVerifiedBuyer({ isPurchased: true })).toBe(true);
    });

    it('returns true when orderDetailId is a positive number', () => {
      expect(isVerifiedBuyer({ orderDetailId: 101 })).toBe(true);
    });

    it('returns false when no purchase proof exists', () => {
      expect(isVerifiedBuyer({})).toBe(false);
      expect(isVerifiedBuyer({ isPurchased: false })).toBe(false);
      expect(isVerifiedBuyer({ orderDetailId: 0 })).toBe(false);
      expect(isVerifiedBuyer({ orderDetailId: undefined })).toBe(false);
    });
  });

  describe('filterReviews', () => {
    const mockList: ReviewDTO[] = [
      { id: 1, userId: 1, userName: 'User 1', phoneId: 1, rating: 5, content: 'Tốt', status: 'SHOW', createdAt: '2026-10-01', images: ['img1.jpg'] },
      { id: 2, userId: 2, userName: 'User 2', phoneId: 1, rating: 4, content: 'Khá', status: 'SHOW', createdAt: '2026-10-02' },
      { id: 3, userId: 3, userName: 'User 3', phoneId: 1, rating: 5, content: 'Tuyệt', status: 'SHOW', createdAt: '2026-10-03' },
      { id: 4, userId: 4, userName: 'User 4', phoneId: 1, rating: 3, content: 'Bình thường', status: 'SHOW', createdAt: '2026-10-04', images: ['img2.jpg', 'img3.jpg'] },
      { id: 5, userId: 5, userName: 'User 5', phoneId: 1, rating: 1, content: 'Kém', status: 'SHOW', createdAt: '2026-10-05' },
    ];

    it('returns all items when filter is ALL', () => {
      expect(filterReviews(mockList, 'ALL')).toHaveLength(5);
    });

    it('filters by star rating correctly', () => {
      expect(filterReviews(mockList, 5)).toHaveLength(2);
      expect(filterReviews(mockList, 4)).toHaveLength(1);
      expect(filterReviews(mockList, 3)).toHaveLength(1);
      expect(filterReviews(mockList, 2)).toHaveLength(0);
      expect(filterReviews(mockList, 1)).toHaveLength(1);
    });

    it('filters only reviews with images when filter is WITH_IMAGE', () => {
      const withImages = filterReviews(mockList, 'WITH_IMAGE');
      expect(withImages).toHaveLength(2);
      expect(withImages.map((r) => r.id)).toEqual([1, 4]);
    });

    it('handles empty or non-array gracefully', () => {
      expect(filterReviews([], 'ALL')).toEqual([]);
      expect(filterReviews(undefined as unknown as ReviewDTO[], 'ALL')).toEqual([]);
    });
  });
});

