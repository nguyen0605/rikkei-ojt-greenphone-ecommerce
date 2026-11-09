import React, { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  RotateCw,
  AlertCircle,
  Package,
} from 'lucide-react';
import { orderService } from '@/services/orderService';
import type { OrderDTO } from '@/types/api';
import OrderCard from '@/components/order/OrderCard';
import OrderCancelModal from '@/components/order/OrderCancelModal';
import { STATUS_TABS, type OrderTabKey } from '@/components/order/orderHelpers';

export const OrderHistoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = (searchParams.get('status') || 'all').toLowerCase();
  const currentTab: OrderTabKey = STATUS_TABS.some((t) => t.key === rawStatus)
    ? (rawStatus as OrderTabKey)
    : 'all';

  const [selectedCancelOrderId, setSelectedCancelOrderId] = useState<number | null>(null);

  // Fetch orders từ backend API
  const {
    data: pageData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.list({ size: 100 }), // Lấy danh sách đủ để lọc client mượt mà
    staleTime: 1000 * 30, // 30s cache
  });

  const orders = useMemo(() => pageData?.content || [], [pageData]);

  // Bộ lọc theo tab
  const filteredOrders = useMemo(() => {
    if (currentTab === 'all') return orders;
    return orders.filter((order) => {
      const status = order.orderStatus;
      switch (currentTab) {
        case 'pending':
          return status === 'PENDING';
        case 'processing':
          return status === 'PROCESSING' || status === 'CONFIRMED';
        case 'shipping':
          return status === 'SHIPPING';
        case 'delivered':
          return status === 'DELIVERED';
        case 'cancelled':
          return status === 'CANCELLED';
        default:
          return true;
      }
    });
  }, [orders, currentTab]);

  // Đếm số lượng theo tab để hiển thị badge số lượng
  const tabCounts = useMemo(() => {
    const counts: Record<OrderTabKey, number> = {
      all: orders.length,
      pending: 0,
      processing: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
    };
    orders.forEach((o) => {
      const s = o.orderStatus;
      if (s === 'PENDING') counts.pending++;
      else if (s === 'PROCESSING' || s === 'CONFIRMED') counts.processing++;
      else if (s === 'SHIPPING') counts.shipping++;
      else if (s === 'DELIVERED') counts.delivered++;
      else if (s === 'CANCELLED') counts.cancelled++;
    });
    return counts;
  }, [orders]);

  const handleTabChange = (key: OrderTabKey) => {
    if (key === 'all') {
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else {
      searchParams.set('status', key);
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Trang */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Đơn mua của tôi</h2>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Theo dõi trạng thái và quản lý các đơn hàng của bạn
        </p>
      </div>

      {/* 2. Thanh Tabs trạng thái (Scrollable ngang mượt mà trên mobile) */}
      <div className="relative border-b border-gray-200">
        <div
          role="tablist"
          aria-label="Bộ lọc trạng thái đơn hàng"
          className="flex space-x-2 overflow-x-auto pb-px scrollbar-none sm:space-x-4"
        >
          {STATUS_TABS.map((tab) => {
            const isActive = currentTab === tab.key;
            const TabIcon = tab.icon;
            const count = tabCounts[tab.key];

            return (
              <button
                key={tab.key}
                role="tab"
                id={`tab-${tab.key}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.key}`}
                onClick={() => handleTabChange(tab.key)}
                className={`group inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs sm:text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <TabIcon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Vùng nội dung danh sách đơn hàng */}
      <div id={`panel-${currentTab}`} role="tabpanel" aria-labelledby={`tab-${currentTab}`}>
        {/* State: Đang tải (Loading Skeleton) */}
        {isLoading && (
          <div data-testid="orders-loading" className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 space-y-4"
              >
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <div className="h-4 w-28 rounded bg-gray-200" />
                  <div className="h-6 w-20 rounded-full bg-gray-200" />
                </div>
                <div className="flex gap-4">
                  <div className="h-16 w-16 rounded-xl bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-3/4 rounded bg-gray-200" />
                    <div className="h-3 w-1/4 rounded bg-gray-200" />
                  </div>
                  <div className="h-5 w-24 rounded bg-gray-200" />
                </div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                  <div className="h-4 w-36 rounded bg-gray-200" />
                  <div className="h-8 w-28 rounded-xl bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* State: Lỗi khi tải dữ liệu */}
        {!isLoading && isError && (
          <div
            data-testid="orders-error"
            role="alert"
            className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Không thể tải danh sách đơn hàng</h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-md">
              {(error as { message?: string })?.message ||
                'Đã xảy ra lỗi khi kết nối tới máy chủ. Vui lòng kiểm tra lại mạng.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              <RotateCw className="h-4 w-4" />
              Thử lại
            </button>
          </div>
        )}

        {/* State: Chưa có đơn hàng nào (Toàn bộ tài khoản chưa có đơn) */}
        {!isLoading && !isError && orders.length === 0 && (
          <div
            data-testid="orders-empty-all"
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 py-16 px-4 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900 sm:text-lg">Chưa có đơn hàng nào</h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-md">
              Bạn chưa mua sắm đơn hàng nào tại GreenPhone. Hãy khám phá ngay các sản phẩm điện thoại mới nhất!
            </p>
            <Link
              to="/san-pham"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all"
            >
              Mua sắm ngay
            </Link>
          </div>
        )}

        {/* State: Tab hiện tại không có đơn nào phù hợp */}
        {!isLoading && !isError && orders.length > 0 && filteredOrders.length === 0 && (
          <div
            data-testid="orders-empty-tab"
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 py-12 px-4 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-3">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">
              Không có đơn hàng nào trong mục "{STATUS_TABS.find((t) => t.key === currentTab)?.label}"
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Bạn không có đơn hàng nào ở trạng thái này.
            </p>
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className="mt-4 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Xem tất cả đơn hàng ({orders.length})
            </button>
          </div>
        )}

        {/* State: Hiển thị danh sách OrderCard thành công */}
        {!isLoading && !isError && filteredOrders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>
                Hiển thị <strong className="font-semibold text-gray-800">{filteredOrders.length}</strong> đơn hàng
              </span>
            </div>

            {filteredOrders.map((order: OrderDTO) => (
              <OrderCard
                key={order.id}
                order={order}
                onCancelRequest={(id) => setSelectedCancelOrderId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 4. Modal Hủy đơn hàng */}
      <OrderCancelModal
        orderId={selectedCancelOrderId}
        open={selectedCancelOrderId !== null}
        onClose={() => setSelectedCancelOrderId(null)}
      />
    </div>
  );
};

export default OrderHistoryPage;
