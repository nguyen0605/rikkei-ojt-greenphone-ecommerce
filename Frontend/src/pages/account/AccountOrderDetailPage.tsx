import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Button, Tag, Descriptions, Spin } from 'antd';
import { CreditCard, Clock } from 'lucide-react';
import { orderService, paymentService } from '@/services';
import { usePaymentCountdown, formatCountdown } from '@/hooks/usePaymentCountdown';
import BankTransferPaymentCard from '@/components/checkout/BankTransferPaymentCard';
import { formatVND } from '@/utils';

const statusColor: Record<string, string> = {
  PENDING: 'default', CONFIRMED: 'blue', PROCESSING: 'processing',
  SHIPPING: 'orange', DELIVERED: 'green', CANCELLED: 'red',
};

const paymentStatusLabel: Record<string, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
};

const paymentMethodLabel: Record<string, string> = {
  VIETQR: 'Chuyển khoản ngân hàng (VietQR)',
  SEPA: 'Chuyển khoản ngân hàng (VietQR)',
  COD: 'Thanh toán khi nhận hàng (COD)',
};

export default function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.detail(Number(id)),
    enabled: !!id,
    // Poll while the order is still PENDING+UNPAID so the status
    // flips to CONFIRMED/PAID as soon as the bank webhook lands.
    refetchInterval: (query) => {
      const o = query.state.data;
      if (o && o.orderStatus === 'PENDING' && o.paymentStatus === 'UNPAID') {
        return 5000;
      }
      return false;
    },
  });

  // Fetch QR code if order is PENDING, UNPAID, and uses bank transfer
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

  if (isLoading) return <div className="flex justify-center py-16"><Spin size="large" /></div>;
  if (!order) return <div className="py-16 text-center text-gray-500">Không tìm thấy đơn hàng</div>;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link to="/tai-khoan/don-hang">
          <Button size="small" className="!rounded-full">&larr; Quay lại</Button>
        </Link>
        <h2 className="text-xl font-bold text-gray-900">Đơn hàng #{order.id}</h2>
        <Tag color={statusColor[order.orderStatus] || 'default'} className="!rounded-full !px-3 !py-0.5 !text-xs !font-semibold">
          {order.orderStatus}
        </Tag>
      </div>

      {/* Payment Status Banner */}
      {isPendingBankTransfer && (
        <div className="mb-6 rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <h4 className="text-sm font-bold text-amber-800">Đơn hàng đang chờ thanh toán</h4>
              <p className="mt-1 text-sm text-amber-700">
                Quét mã QR bên dưới để thanh toán qua ngân hàng. Đơn hàng sẽ tự động xác nhận sau khi nhận được tiền.
                Đơn sẽ tự động huỷ sau <strong>10 phút</strong> nếu chưa thanh toán.
              </p>
              <p className="mt-1 text-xs text-amber-600">
                Thời gian còn lại: <strong>{formatCountdown(remainingSeconds)}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {order.orderStatus === 'PENDING' && order.paymentMethod === 'COD' && (
        <div className="mb-6 rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div>
              <h4 className="text-sm font-bold text-blue-800">Đơn hàng đang chờ xác nhận</h4>
              <p className="mt-1 text-sm text-blue-700">Đơn hàng sẽ được xác nhận sớm. Bạn sẽ thanh toán khi nhận hàng.</p>
            </div>
          </div>
        </div>
      )}

      {/* QR Code for bank transfer */}
      {isPendingBankTransfer && (
        <div className="mb-6">
          <BankTransferPaymentCard
            order={order}
            qrData={qrData}
            qrLoading={qrLoading}
            remainingSeconds={remainingSeconds}
          />
        </div>
      )}

      {/* Shipping info */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 bg-gradient-to-r from-green-50 to-white px-5 py-3">
          <h3 className="text-sm font-bold text-green-700">📦 Thông tin nhận hàng</h3>
        </div>
        <div className="p-5">
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Người nhận">{order.receiverName}</Descriptions.Item>
            <Descriptions.Item label="SĐT">{order.receiverPhone}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ" span={2}>{order.shippingAddress}</Descriptions.Item>
            <Descriptions.Item label="Thanh toán">
              {paymentMethodLabel[order.paymentMethod] || order.paymentMethod}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái TT">
              <Tag color={order.paymentStatus === 'PAID' ? 'green' : 'orange'} className="!rounded-full">
                {paymentStatusLabel[order.paymentStatus] || order.paymentStatus}
              </Tag>
            </Descriptions.Item>
            {order.promotionCode && <Descriptions.Item label="Mã KM">{order.promotionCode}</Descriptions.Item>}
            {order.note && <Descriptions.Item label="Ghi chú" span={2}>{order.note}</Descriptions.Item>}
          </Descriptions>
        </div>
      </div>

      {/* Products */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 bg-gradient-to-r from-green-50 to-white px-5 py-3">
          <h3 className="text-sm font-bold text-green-700">🛒 Sản phẩm</h3>
        </div>
        <div className="divide-y">
          {order.orderDetails?.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{d.productName}</p>
                <p className="text-xs text-gray-500">{d.ram}/{d.storage} &mdash; {d.color} &times;{d.quantity}</p>
              </div>
              <span className="font-semibold text-gray-900">{formatVND(d.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between bg-gray-50 px-5 py-3 text-base font-bold">
          <span className="text-gray-900">Tổng cộng</span>
          <span className="text-red-600">{formatVND(order.finalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
