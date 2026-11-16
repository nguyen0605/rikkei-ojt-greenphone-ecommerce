import { QueryClient } from '@tanstack/react-query';
import type { OrderDTO } from '@/types/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes default
    },
  },
});

/**
 * Đồng bộ trước dữ liệu bộ nhớ đệm đơn hàng từ danh sách sang chi tiết
 * Lưu theo cả key ['order', String(id)] và ['order', Number(id)]
 */
export const syncOrderCache = (client: QueryClient, order: OrderDTO) => {
  if (!order || order.id == null) return;
  client.setQueryData(['order', String(order.id)], order);
  client.setQueryData(['order', Number(order.id)], order);
};

/**
 * Đồng bộ danh sách đơn hàng vào cache chi tiết từng đơn
 */
export const syncOrdersCache = (client: QueryClient, orders: OrderDTO[]) => {
  if (!Array.isArray(orders)) return;
  orders.forEach((order) => {
    syncOrderCache(client, order);
  });
};
