import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import { Breadcrumb } from '@/components/common';
import BankTransferPaymentCard from '@/components/checkout/BankTransferPaymentCard';
import { usePaymentCountdown } from '@/hooks/usePaymentCountdown';
import { orderService, paymentService } from '@/services';

/**
 * Dedicated bank-transfer payment page — keyed by orderId in the URL so a
 * refresh keeps the QR + countdown (the order was already created server-side).
 */
export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', 'payment', orderId],
    queryFn: () => orderService.detail(Number(orderId)),
    enabled: !!orderId,
    // Poll while still PENDING+UNPAID so the status flips once the webhook lands
    refetchInterval: (query) => {
      const o = query.state.data;
      if (o && o.orderStatus === 'PENDING' && o.paymentStatus === 'UNPAID') {
        return 5000;
      }
      return false;
    },
  });

  const isPendingBankTransfer =
    order?.orderStatus === 'PENDING' &&
    order?.paymentStatus === 'UNPAID' &&
    (order?.paymentMethod === 'VIETQR' || order?.paymentMethod === 'SEPAY');

  const { data: qrData, isLoading: qrLoading, refetch: refetchQr } = useQuery({
    queryKey: ['payment', 'qr', orderId],
    queryFn: () => paymentService.qrCode(Number(orderId)),
    enabled: isPendingBankTransfer,
  });

  const remainingSeconds = usePaymentCountdown(qrData?.expiresAt);

  // When the countdown hits 0 the server scheduler flips the order to CANCELLED
  // within ~60s — refetch so the UI shows the cancelled state.
  if (remainingSeconds === 0 && order?.orderStatus === 'PENDING') {
    refetch();
  }

  if (isLoading || !order) {
    return <div className="flex justify-center py-16"><Spin size="large" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Giỏ hàng', href: '/gio-hang' },
          { label: 'Thanh toán' },
        ]}
        className="mb-6"
      />

      {order.orderStatus === 'CANCELLED' ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-red-600">Đơn hàng đã bị hủy</h1>
          <p className="mb-6 text-sm text-red-500">
            Đơn #{order.id} quá hạn thanh toán 10 phút nên đã tự động bị hủy.
          </p>
          <Link to="/san-pham" className="inline-block rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
            Mua sắm tiếp
          </Link>
        </div>
      ) : order.orderStatus === 'CONFIRMED' ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-green-700">Thanh toán thành công!</h1>
          <p className="mb-6 text-sm text-green-600">
            Đơn hàng #{order.id} đã được xác nhận. Cảm ơn bạn!
          </p>
          <Link to={`/tai-khoan/don-hang/${order.id}`} className="inline-block rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
            Xem đơn hàng của tôi
          </Link>
        </div>
      ) : (
        <BankTransferPaymentCard
          order={order}
          qrData={qrData}
          qrLoading={qrLoading}
          remainingSeconds={remainingSeconds}
        />
      )}
    </div>
  );
}
