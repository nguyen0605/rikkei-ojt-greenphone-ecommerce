import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Smartphone,
  ChevronRight,
  Clock,
  CreditCard,
  RotateCcw,
  Star,
  XCircle,
  Eye,
} from 'lucide-react';
import { message } from 'antd';
import type { OrderDTO, OrderDetailDTO } from '@/types/api';
import { formatVND, formatDate } from '@/utils';
import { useAppDispatch } from '@/store/hooks';
import { addCartItem } from '@/store/slices/cartSlice';
import { getStatusBadgeConfig, formatPaymentMethod } from './orderHelpers';

export interface OrderCardProps {
  order: OrderDTO;
  onCancelRequest?: (orderId: number) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onCancelRequest }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [isReordering, setIsReordering] = useState(false);

  const statusConfig = getStatusBadgeConfig(order.orderStatus, order.paymentStatus);

  // Điều kiện nút hành động theo nghiệp vụ chặt chẽ
  const canCancel = order.orderStatus === 'PENDING';
  const canPayNow =
    order.orderStatus === 'PENDING' &&
    order.paymentStatus === 'UNPAID' &&
    (order.paymentMethod === 'VIETQR' || order.paymentMethod === 'SEPAY');
  const canReview = order.orderStatus === 'DELIVERED';
  const canReorder = order.orderDetails && order.orderDetails.length > 0;

  // Xử lý Mua lại: thêm sản phẩm của đơn vào giỏ hàng và chuyển hướng
  const handleBuyAgain = async () => {
    if (!order.orderDetails || order.orderDetails.length === 0 || isReordering) return;
    setIsReordering(true);
    try {
      let addedCount = 0;
      for (const item of order.orderDetails) {
        if (item.phoneVariantId) {
          await dispatch(
            addCartItem({
              phoneVariantId: item.phoneVariantId,
              quantity: item.quantity || 1,
            })
          ).unwrap();
          addedCount += 1;
        }
      }
      if (addedCount > 0) {
        message.success(`Đã thêm ${addedCount} sản phẩm vào giỏ hàng`);
        navigate('/gio-hang');
      } else {
        message.warning('Không tìm thấy thông tin biến thể để thêm vào giỏ');
      }
    } catch (err: unknown) {
      const errMsg = (err as { message?: string })?.message || 'Có lỗi khi thêm vào giỏ hàng';
      message.error(errMsg);
    } finally {
      setIsReordering(false);
    }
  };

  // Điều hướng viết đánh giá
  const handleWriteReview = () => {
    navigate('/tai-khoan/danh-gia');
  };

  // Điều hướng thanh toán ngay
  const handlePayNow = () => {
    navigate(`/thanh-toan/${order.id}`);
  };

  return (
    <article
      data-testid="order-card"
      className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-md"
    >
      {/* 1. Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-bold text-gray-900">
            #{order.id}
          </span>
          <span className="text-gray-300" aria-hidden="true">•</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            {formatDate(order.createdAt)}
          </span>
        </div>

        {/* Badge trạng thái đơn */}
        <div
          data-testid="status-badge"
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig.className}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColor}`} />
          {statusConfig.label}
        </div>
      </div>

      {/* 2. Danh sách sản phẩm trong đơn */}
      <div className="divide-y divide-gray-100 px-5 sm:px-6">
        {order.orderDetails?.map((item: OrderDetailDTO) => {
          const variantSpecs = [item.ram, item.storage, item.color].filter(Boolean).join(' • ');

          return (
            <div
              key={item.id || item.phoneVariantId}
              className="flex items-start gap-4 py-4"
            >
              {/* Ảnh điện thoại thumbnail có fallback */}
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-1">
                {(item as { imageUrl?: string }).imageUrl ? (
                  <img
                    src={(item as { imageUrl?: string }).imageUrl}
                    alt={item.productName}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback khi ảnh lỗi
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.classList.add('flex', 'items-center', 'justify-center');
                        parent.innerHTML = '<svg class="w-8 h-8 text-emerald-600/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg>';
                      }
                    }}
                  />
                ) : (
                  <Smartphone className="h-8 w-8 text-emerald-600/50" />
                )}
              </div>

              {/* Tên & biến thể */}
              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-2 text-sm font-semibold text-gray-900 leading-snug">
                  {item.productName}
                </h4>
                {variantSpecs && (
                  <div className="mt-1 inline-flex items-center rounded-md bg-gray-100/80 px-2 py-0.5 text-xs text-gray-600 font-medium">
                    {variantSpecs}
                  </div>
                )}
                <div className="mt-1 text-xs text-gray-500">
                  Số lượng: <span className="font-semibold text-gray-700">x{item.quantity}</span>
                </div>
              </div>

              {/* Đơn giá & Thành tiền */}
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-gray-900">
                  {formatVND(item.subtotal || item.unitPrice * item.quantity)}
                </div>
                {item.quantity > 1 && (
                  <div className="text-[11px] text-gray-400">
                    {formatVND(item.unitPrice)} / máy
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Footer Card: Phương thức thanh toán, Tổng tiền & Nút hành động */}
      <div className="border-t border-gray-100 bg-gray-50/40 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Thông tin thanh toán */}
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-gray-400" />
              <span>{formatPaymentMethod(order.paymentMethod)}</span>
              {order.paymentStatus === 'PAID' ? (
                <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Đã thanh toán
                </span>
              ) : order.paymentStatus === 'UNPAID' ? (
                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                  Chưa thanh toán
                </span>
              ) : null}
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-xs text-gray-500">Tổng thanh toán:</span>
              <span className="text-base sm:text-lg font-bold text-red-600">
                {formatVND(order.finalAmount)}
              </span>
            </div>
          </div>

          {/* Cụm nút hành động theo trạng thái */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 sm:pt-0">
            {/* Nút Hủy đơn - CHỈ hiển thị khi PENDING */}
            {canCancel && onCancelRequest && (
              <button
                type="button"
                onClick={() => onCancelRequest(order.id)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 shadow-2xs hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Hủy đơn
              </button>
            )}

            {/* Nút Thanh toán ngay - CHỈ khi PENDING, UNPAID & VietQR */}
            {canPayNow && (
              <button
                type="button"
                onClick={handlePayNow}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 transition-colors"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Thanh toán ngay
              </button>
            )}

            {/* Nút Viết đánh giá - CHỈ khi DELIVERED */}
            {canReview && (
              <button
                type="button"
                onClick={handleWriteReview}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/70 px-3.5 py-1.5 text-xs font-semibold text-amber-800 shadow-2xs hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 transition-colors"
              >
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                Viết đánh giá
              </button>
            )}

            {/* Nút Mua lại */}
            {canReorder && (
              <button
                type="button"
                onClick={handleBuyAgain}
                disabled={isReordering}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 transition-colors"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isReordering ? 'animate-spin' : ''}`} />
                {isReordering ? 'Đang thêm...' : 'Mua lại'}
              </button>
            )}

            {/* Nút Xem chi tiết - Luôn có */}
            <Link
              to={`/tai-khoan/don-hang/${order.id}`}
              state={{ fromSearch: location.search }}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Xem chi tiết
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export default OrderCard;
