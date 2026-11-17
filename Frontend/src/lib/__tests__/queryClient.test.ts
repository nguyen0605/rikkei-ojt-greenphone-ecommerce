import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { syncOrderCache, syncOrdersCache } from '../queryClient';
import type { OrderDTO } from '@/types/api';

describe('queryClient order cache utilities', () => {
  const sampleOrder: OrderDTO = {
    id: 22,
    userId: 2,
    userName: 'Nguyễn Văn An',
    receiverName: 'Nguyễn Văn An',
    receiverPhone: '0912345678',
    shippingAddress: '123 Đường Láng, Hà Nội',
    totalAmount: 30000000,
    discountAmount: 0,
    finalAmount: 30000000,
    orderStatus: 'DELIVERED',
    paymentStatus: 'PAID',
    paymentMethod: 'VIETQR',
    note: '',
    promotionCode: '',
    createdAt: '2026-08-01T10:00:00',
    orderDetails: [],
  };

  it('syncs single order to both string and number keys', () => {
    const client = new QueryClient();
    syncOrderCache(client, sampleOrder);

    expect(client.getQueryData(['order', '22'])).toEqual(sampleOrder);
    expect(client.getQueryData(['order', 22])).toEqual(sampleOrder);
  });

  it('syncs list of orders to each corresponding query key', () => {
    const client = new QueryClient();
    const order2: OrderDTO = { ...sampleOrder, id: 23, orderStatus: 'SHIPPING' };
    syncOrdersCache(client, [sampleOrder, order2]);

    expect(client.getQueryData(['order', '22'])).toEqual(sampleOrder);
    expect(client.getQueryData(['order', '23'])).toEqual(order2);
  });

  it('handles empty or null inputs gracefully without crashing', () => {
    const client = new QueryClient();
    // @ts-expect-error test falsy argument
    syncOrderCache(client, null);
    // @ts-expect-error test non-array argument
    syncOrdersCache(client, null);
    expect(client.getQueryData(['order', '22'])).toBeUndefined();
  });
});
