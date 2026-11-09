import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../api';
import { orderService } from '../orderService';

vi.mock('../api', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

describe('orderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get with /orders and pagination params for list()', async () => {
    const mockResponse = { content: [], totalElements: 0, totalPages: 0 };
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    const result = await orderService.list({ page: 0, size: 10 });
    expect(api.get).toHaveBeenCalledWith('/orders', { params: { page: 0, size: 10 } });
    expect(result).toEqual(mockResponse);
  });

  it('calls get with /orders/:id for detail()', async () => {
    const mockOrder = { id: 123, orderStatus: 'PENDING' };
    vi.mocked(api.get).mockResolvedValue(mockOrder);

    const result = await orderService.detail(123);
    expect(api.get).toHaveBeenCalledWith('/orders/123');
    expect(result).toEqual(mockOrder);
  });

  it('calls put with /orders/:id/cancel for cancel()', async () => {
    const mockCancelled = { id: 123, orderStatus: 'CANCELLED' };
    vi.mocked(api.put).mockResolvedValue(mockCancelled);

    const result = await orderService.cancel(123);
    expect(api.put).toHaveBeenCalledWith('/orders/123/cancel');
    expect(result).toEqual(mockCancelled);
  });

  it('calls post with /orders for create()', async () => {
    const requestData = {
      receiverName: 'Nguyễn Văn An',
      receiverPhone: '0912345678',
      shippingAddress: '123 Đường Láng',
      paymentMethod: 'COD',
      note: 'Giao giờ hành chính',
      userPromotionId: null,
      items: [{ phoneVariantId: 1, quantity: 1 }],
    };
    const mockCreated = { id: 456, ...requestData };
    vi.mocked(api.post).mockResolvedValue(mockCreated);

    const result = await orderService.create(requestData);
    expect(api.post).toHaveBeenCalledWith('/orders', requestData);
    expect(result).toEqual(mockCreated);
  });

  it('calls get with /orders/history for history()', async () => {
    const mockHistory = { content: [], totalElements: 0 };
    vi.mocked(api.get).mockResolvedValue(mockHistory);

    const result = await orderService.history({ size: 5 });
    expect(api.get).toHaveBeenCalledWith('/orders/history', { params: { size: 5 } });
    expect(result).toEqual(mockHistory);
  });

  it('calls put with /orders/:id/promotion for applyPromotion()', async () => {
    const mockApplied = { id: 123, promotionCode: 'VOUCHER10' };
    vi.mocked(api.put).mockResolvedValue(mockApplied);

    const result = await orderService.applyPromotion(123, 99);
    expect(api.put).toHaveBeenCalledWith('/orders/123/promotion', { userPromotionId: 99 });
    expect(result).toEqual(mockApplied);
  });
});
