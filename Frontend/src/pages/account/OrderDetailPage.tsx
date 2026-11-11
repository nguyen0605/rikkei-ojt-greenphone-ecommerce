import React, { useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  ShoppingBag,
  AlertCircle,
  XCircle,
  RotateCcw,
  Star,
  Clock,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { message, Tooltip } from 'antd';
import { orderService } from '@/services/orderService';
import { paymentService } from '@/services';
import type { OrderDetailDTO } from '@/types/api';
import { formatVND } from '@/utils';
import { extractCustomerNote } from '@/utils/orderStateMachine';
import { getStatusBadgeConfig, formatPaymentMethod } from '@/components/order/orderHelpers';
import OrderTrackingTimeline from '@/components/order/OrderTrackingTimeline';
import OrderCancelModal from '@/components/order/OrderCancelModal';
import ShipmentTrackingCard from '@/components/order/ShipmentTrackingCard';
import BankTransferPaymentCard from '@/components/checkout/BankTransferPaymentCard';
import { usePaymentCountdown } from '@/hooks/usePaymentCountdown';
import { useOrderProductLookup } from '@/hooks/useOrderProductLookup';
import OrderItemThumbnail from '@/components/order/OrderItemThumbnail';
import { useAppDispatch } from '@/store/hooks';
import { addCartItem } from '@/store/slices/cartSlice';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { resolveItem } = useOrderProductLookup();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // Lấy đường dẫn quay lại danh sách từ state (nếu có giữ filter)
  const backUrl = `/tai-khoan/don-hang${(location.state as { fromSearch?: string })?.fromSearch || ''}`;

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.detail(Number(id)),
    enabled: !!id,
    refetchInterval: (query) => {
      const o = query.state.data;
      // Tự động polling 5s khi đơn PENDING chờ thanh toán ngân hàng
      if (o && o.orderStatus === 'PENDING' && o.paymentStatus === 'UNPAID') {
        return 5000;
      }
      return false;
    },
  });

  // Thông tin mã QR nếu thanh toán ngân hàng đang chờ
  const isPendingBankTransfer =
    order?.orderStatus === 'PENDING' &&
    order?.paymentStatus === 'UNPAID' &&
    (order?.paymentMethod === 'VIETQR' || order?.paymentMethod === 'SEPAY');

  const { data: qrData, isLoading: qrLoading } = useQuery({
    queryKey: ['payment', 'qr', id],
    queryFn: () => paymentService.qrCode(Number(id)),
    enabled: isPendingBankTransfer,
  });

  const remainingSeconds = usePaymentCountdown(qrData?.expiresAt);

  // Điều kiện nút hành động: PENDING hoặc CONFIRMED đều có thể gửi yêu cầu hủy đơn
  const canCancel = order?.orderStatus === 'PENDING' || order?.orderStatus === 'CONFIRMED';
  const canReview = order?.orderStatus === 'DELIVERED';
  const canReorder = order?.orderDetails && order.orderDetails.length > 0;

  // Tính toán thời gian 7 ngày kể từ khi hoàn tất giao hàng (COMPLETED)
  const isCompletedOrder = order?.orderStatus === 'COMPLETED';
  const orderCompletedTime = order?.createdAt;
  const isWithin7Days = (() => {
    if (!orderCompletedTime) return true;
    const completedDate = new Date(orderCompletedTime).getTime();
    const now = new Date().getTime();
    const diffDays = (now - completedDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  })();

  // Xử lý Mua lại
  const handleBuyAgain = async () => {
    if (!order?.orderDetails || order.orderDetails.length === 0 || isReordering) return;
    setIsReordering(true);
    try {
      let addedCount = 0;
      let failedCount = 0;
      for (const item of order.orderDetails) {
        if (item.phoneVariantId) {
          try {
            await dispatch(
              addCartItem({
                phoneVariantId: item.phoneVariantId,
                quantity: item.quantity || 1,
              })
            ).unwrap();
            addedCount += 1;
          } catch {
            failedCount += 1;
          }
        }
      }
      if (addedCount > 0) {
        if (failedCount > 0) {
          message.warning(
            `Đã thêm ${addedCount} sản phẩm vào giỏ. ${failedCount} sản phẩm đã hết hàng hoặc ngừng kinh doanh đã được bỏ qua.`
          );
        } else {
          message.success(`Đã thêm ${addedCount} sản phẩm vào giỏ hàng`);
        }
        navigate('/gio-hang');
      } else {
        message.error('Các sản phẩm trong đơn hàng này hiện đã hết hàng hoặc không còn khả dụng');
      }
    } catch (err: unknown) {
      const errMsg = (err as { message?: string })?.message || 'Có lỗi khi thêm vào giỏ hàng';
      message.error(errMsg);
    } finally {
      setIsReordering(false);
    }
  };

  if (isLoading) {
    return (
      <div data-testid="order-detail-loading" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="h-44 rounded-2xl bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 rounded-2xl bg-gray-200 animate-pulse" />
          <div className="h-48 rounded-2xl bg-gray-200 animate-pulse" />
        </div>
        <div className="h-64 rounded-2xl bg-gray-200 animate-pulse" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div
        data-testid="order-detail-error"
        role="alert"
        className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-12 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Không tìm thấy thông tin đơn hàng</h3>
        <p className="mt-1 text-sm text-gray-500 max-w-md">
          {(error as { message?: string })?.message ||
            'Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.'}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Thử lại
          </button>
          <Link
            to="/tai-khoan/don-hang"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusBadgeConfig(order.orderStatus, order.paymentStatus);
  const customerNote = extractCustomerNote(order.note);

  return (
    <div className="space-y-6">
      {/* 1. Header Trang chi tiết & Nút Quay lại */}
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={backUrl}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-600 shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại</span>
          </Link>

          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Chi tiết đơn hàng #{order.id}
          </h2>

          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig.className}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColor}`} />
            {statusConfig.label}
          </div>
        </div>

        {/* Cụm nút hành động trên Header */}
        <div className="flex flex-wrap items-center gap-2">
          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              Hủy đơn hàng
            </button>
          )}

          {canReview && (
            <button
              type="button"
              onClick={() => navigate('/tai-khoan/danh-gia')}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/70 px-3.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              Viết đánh giá
            </button>
          )}

          {canReorder && (
            <button
              type="button"
              onClick={handleBuyAgain}
              disabled={isReordering}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isReordering ? 'animate-spin' : ''}`} />
              {isReordering ? 'Đang thêm...' : 'Mua lại đơn này'}
            </button>
          )}
        </div>
      </div>

      {/* 2. OrderTrackingTimeline Stepper 4 bước */}
      <OrderTrackingTimeline
        order={{
          orderStatus: order.orderStatus,
          createdAt: order.createdAt,
          note: order.note,
        }}
      />

      {/* 2.5. Banner Chờ hoàn tiền nếu đã hủy và thanh toán online */}
      {order.paymentStatus === 'REFUND_PENDING' && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50/80 p-4 sm:p-5 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-orange-900">Yêu cầu hoàn tiền đang được xử lý</h4>
            <p className="mt-1 text-xs text-orange-800 leading-relaxed">
              Đơn hàng của bạn đã được hủy. Yêu cầu hoàn tiền đã được chuyển đến bộ phận kế toán để chuyển khoản trả lại theo thông tin tài khoản bạn đã cung cấp (thường trong vòng 24h làm việc).
            </p>
          </div>
        </div>
      )}

      {order.paymentStatus === 'REFUNDED' && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/80 p-4 sm:p-5 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-purple-900">Đã hoàn tiền thành công</h4>
            <p className="mt-1 text-xs text-purple-800 leading-relaxed">
              Số tiền đơn hàng đã được GreenPhone hoàn trả vào tài khoản ngân hàng của bạn. Xin vui lòng kiểm tra biến động số dư tài khoản.
            </p>
          </div>
        </div>
      )}

      {/* 3. Banner Thanh toán chuyển khoản ngân hàng nếu đang chờ */}
      {isPendingBankTransfer && qrData && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4 sm:p-5">
          <BankTransferPaymentCard
            order={order}
            qrData={qrData}
            qrLoading={qrLoading}
            remainingSeconds={remainingSeconds}
          />
        </div>
      )}

      {/* 3.5. Thông tin kiện hàng & Hành trình vận đơn */}
      <ShipmentTrackingCard
        orderId={order.id}
        orderStatus={order.orderStatus}
      />

      {/* 4. Thông tin giao hàng & Thanh toán (2 Cột trên màn hình lớn) */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Địa chỉ nhận hàng */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <MapPin className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Địa chỉ nhận hàng</h3>
          </div>

          <div className="mt-4 space-y-2 text-xs sm:text-sm text-gray-600">
            <div className="font-semibold text-gray-900">{order.receiverName}</div>
            <div className="text-gray-500">Số điện thoại: {order.receiverPhone}</div>
            <div className="leading-relaxed text-gray-700">{order.shippingAddress}</div>
            {customerNote && (
              <div className="mt-3 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600">
                <span className="font-semibold text-gray-700">Ghi chú giao hàng: </span>
                {customerNote}
              </div>
            )}
          </div>
        </div>

        {/* Thông tin thanh toán */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CreditCard className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Thông tin thanh toán</h3>
          </div>

          <div className="mt-4 space-y-3 text-xs sm:text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Hình thức thanh toán:</span>
              <span className="font-semibold text-gray-900">
                {formatPaymentMethod(order.paymentMethod)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Trạng thái thanh toán:</span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : order.paymentStatus === 'UNPAID'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-purple-100 text-purple-800'
                }`}
              >
                {order.paymentStatus === 'PAID'
                  ? 'Đã thanh toán'
                  : order.paymentStatus === 'UNPAID'
                    ? 'Chưa thanh toán'
                    : 'Đã hoàn tiền'}
              </span>
            </div>

            {order.promotionCode && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Mã voucher giảm giá:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {order.promotionCode}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Danh sách sản phẩm chi tiết */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-5 py-3.5">
          <ShoppingBag className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-bold text-gray-900">
            Sản phẩm đã đặt ({order.orderDetails?.length || 0})
          </h3>
        </div>

        <div className="divide-y divide-gray-100 px-5">
          {order.orderDetails?.map((item: OrderDetailDTO) => {
            const variantSpecs = [item.ram, item.storage, item.color].filter(Boolean).join(' • ');
            const resolved = resolveItem(item);

            return (
              <div
                key={item.id || item.phoneVariantId}
                className="flex items-center gap-4 py-4"
              >
                {/* Thumbnail với ảnh thực tế hoặc fallback */}
                <OrderItemThumbnail
                  imageUrl={resolved.imageUrl}
                  productName={item.productName}
                  navUrl={resolved.navUrl}
                  size="md"
                />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  {resolved.navUrl ? (
                    <Link
                      to={resolved.navUrl}
                      data-testid="order-item-name-link"
                      className="group inline-block focus:outline-none"
                    >
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                        {item.productName}
                      </h4>
                    </Link>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">
                        {item.productName}
                      </h4>
                      {resolved.isInactive && (
                        <span
                          data-testid="product-inactive-badge"
                          className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600"
                        >
                          Sản phẩm hiện đã ngừng kinh doanh
                        </span>
                      )}
                    </div>
                  )}

                  {variantSpecs && (
                    <div className="mt-1 text-xs text-gray-500">{variantSpecs}</div>
                  )}
                  <div className="mt-1 text-xs text-gray-500">
                    Đơn giá: {formatVND(item.unitPrice)} &times; {item.quantity}
                  </div>
                </div>

                {/* Subtotal & Nút Đổi trả */}
                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {formatVND(item.subtotal || item.unitPrice * item.quantity)}
                  </span>

                  {/* Nút Yêu cầu Đổi trả / Bảo hành (Kiểm tra 7 ngày) */}
                  {isCompletedOrder && (
                    <Tooltip
                      title={
                        !isWithin7Days
                          ? 'Đơn hàng đã hoàn tất quá 7 ngày, chính sách đổi trả máy mới đã hết hiệu lực.'
                          : 'Gửi yêu cầu đổi mới 1-1 hoặc hoàn tiền khi sản phẩm phát sinh lỗi phần cứng.'
                      }
                    >
                      <button
                        type="button"
                        disabled={!isWithin7Days}
                        onClick={() =>
                          navigate('/tai-khoan/doi-tra', {
                            state: {
                              orderId: order.id,
                              phoneVariantId: item.phoneVariantId,
                              productName: item.productName,
                              variantSpecs,
                              price: item.unitPrice,
                              imageUrl: resolved.imageUrl,
                            },
                          })
                        }
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                          isWithin7Days
                            ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <ShieldAlert className="h-3 w-3" />
                        Đổi trả / Bảo hành
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tổng kết tiền */}
        <div className="border-t border-gray-100 bg-gray-50/60 p-5 space-y-2.5 text-xs sm:text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Tiền hàng:</span>
            <span>{formatVND(order.totalAmount)}</span>
          </div>

          <div className="flex justify-between text-gray-600">
            <span>Phí vận chuyển:</span>
            <span>
              {(order.shippingFee ?? 0) > 0 ? formatVND(order.shippingFee ?? 0) : 'Miễn phí'}
            </span>
          </div>

          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Giảm giá khuyến mãi:</span>
              <span>-{formatVND(order.discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-gray-200/80 pt-3 text-base font-bold">
            <span className="text-gray-900">Tổng thanh toán:</span>
            <span className="text-red-600">{formatVND(order.finalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Modal Hủy đơn */}
      <OrderCancelModal
        orderId={order.id}
        paymentStatus={order.paymentStatus}
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
      />
    </div>
  );
};

export default OrderDetailPage;
