import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reviewService } from '../reviewService';
import * as api from '../api';

vi.mock('../api', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

describe('reviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls GET /reviews/phone/:id with clean params', async () => {
    vi.mocked(api.get).mockResolvedValue({ content: [], totalElements: 0 });

    await reviewService.byPhone(10, { page: 0, size: 5, rating: 5, hasImage: true });

    expect(api.get).toHaveBeenCalledWith('/reviews/phone/10', {
      params: { page: '0', size: '5', rating: '5', hasImage: 'true' },
    });
  });

  it('filters out undefined and empty params when calling byPhone', async () => {
    vi.mocked(api.get).mockResolvedValue({ content: [], totalElements: 0 });

    await reviewService.byPhone(10, { page: 0, size: 5, rating: undefined, sortBy: '' });

    expect(api.get).toHaveBeenCalledWith('/reviews/phone/10', {
      params: { page: '0', size: '5' },
    });
  });

  it('calls GET /reviews/phone/:id/summary', async () => {
    const mockSummary = { averageRating: 4.8, totalReviews: 10, distribution: {} };
    vi.mocked(api.get).mockResolvedValue(mockSummary);

    const result = await reviewService.summary(15);

    expect(api.get).toHaveBeenCalledWith('/reviews/phone/15/summary');
    expect(result).toEqual(mockSummary);
  });

  it('calls POST /reviews to create a new review', async () => {
    const payload = { orderDetailId: 12, rating: 5, content: 'Tốt' };
    vi.mocked(api.post).mockResolvedValue({ id: 1, ...payload });

    const result = await reviewService.create(payload);

    expect(api.post).toHaveBeenCalledWith('/reviews', payload);
    expect(result).toEqual({ id: 1, ...payload });
  });

  it('calls PUT /reviews/:id to update review', async () => {
    const payload = { rating: 4, content: 'Đã sửa' };
    vi.mocked(api.put).mockResolvedValue({ id: 5, ...payload });

    const result = await reviewService.update(5, payload);

    expect(api.put).toHaveBeenCalledWith('/reviews/5', payload);
    expect(result).toEqual({ id: 5, ...payload });
  });

  it('calls DELETE /reviews/:id to delete review', async () => {
    vi.mocked(api.del).mockResolvedValue(undefined);

    await reviewService.remove(7);

    expect(api.del).toHaveBeenCalledWith('/reviews/7');
  });

  it('calls GET /reviews/me for myReviews', async () => {
    vi.mocked(api.get).mockResolvedValue({ content: [] });

    await reviewService.myReviews({ page: '1' });

    expect(api.get).toHaveBeenCalledWith('/reviews/me', { params: { page: '1' } });
  });

  it('calls GET /reviews/eligible for eligible orders', async () => {
    vi.mocked(api.get).mockResolvedValue({ content: [] });

    await reviewService.eligible({ page: '0' });

    expect(api.get).toHaveBeenCalledWith('/reviews/eligible', { params: { page: '0' } });
  });
});

