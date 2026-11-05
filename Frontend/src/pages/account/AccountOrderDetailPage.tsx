import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Button, Tag, Descriptions, Spin, Steps, Modal, message } from 'antd';
import { CreditCard, Clock, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { orderService, paymentService } from '@/services';
import { usePaymentCountdown, formatCountdown } from '@/hooks/usePaymentCountdown';
import BankTransferPaymentCard from '@/components/checkout/BankTransferPaymentCard';
import { formatVND, formatDate } from '@/utils';
import { extractCancelReason, extractCustomerNote } from '@/utils/orderStateMachine';

const statusColor: Record<string, string> = {
  PENDING: 'default',
  CONFIRMED: 'blue',
  PROCESSING: 'processing',
  SHIPPING: 'orange',
  DELIVERED: 'green',
  CANCELLED: 'red',
};

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

const paymentStatusLabel: Record<string, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
};

const paymentMethodLabel: Record<string, string> = {
  VIETQR: 'Chuyển khoản ngân hàng (VietQR)',
  SEPA: 'Chuyển khoản ngân hàng (VietQR)',
  COD: 'Thanh toán khi nhận hàng (COD)',
};

export default function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.detail(Number(id)),
    enabled: !!id,
    refetchInterval: (query) => {
      const o = query.state.data;
      if (o && o.orderStatus === 'PENDING' && o.paymentStatus === 'UNPAID') {
        return 5000;
      }
      return false;
    },
  });

  // Mutation hủy đơn hàng phía khách hàng
  const cancelMutation = useMutation({
    mutationFn: () => orderService.cancel(Number(id)),
    onSuccess: () => {
      message.success('Đã hủy đơn hàng thành công');
      setCancelModalOpen(false);
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => {
      message.error(err?.message || 'Không thể hủy đơn hàng');
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

  // Khách hàng được phép hủy khi đơn còn ở PENDING hoặc CONFIRMED
  const canCustomerCancel = order.orderStatus === 'PENDING' || order.orderStatus === 'CONFIRMED';
  const cancelReason = extractCancelReason(order.note);
  const customerNote = extractCustomerNote(order.note);

  // Chỉ số bước trong Stepper
  const getStepIndex = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'PROCESSING':
        return 2;
      case 'SHIPPING':
        return 3;
      case 'DELIVERED':
        return 4;
      default:
        return 0;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/tai-khoan/don-hang">
            <Button size="small" className="!rounded-full">&larr; Quay lại danh sách</Button>
          </Link>
          <h2 className="text-xl font-bold text-gray-900">Đơn hàng #{order.id}</h2>
          <Tag color={statusColor[order.orderStatus] || 'default'} className="!rounded-full !px-3 !py-0.5 !text-xs !font-semibold">
            {statusLabel[order.orderStatus] || order.orderStatus}
          </Tag>
        </div>

        {/* Nút Hủy đơn phía khách hàng */}
        {canCustomerCancel && (
          <Button
            danger
            onClick={() => setCancelModalOpen(true)}
            className="!rounded-full font-medium"
          >
            Hủy đơn hàng
          </Button>
        )}
      </div>

      {/* Stepper Timeline Tiến trình xử lý đơn hàng */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">
            📍 Tiến trình đơn hàng
          </h3>
          <span className="text-xs text-gray-400">
            Ngày đặt: {formatDate(order.createdAt)}
          </span>
        </div>

        {order.orderStatus === 'CANCELLED' ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-800">Đơn hàng đã bị hủy</h4>
                <p className="mt-1 text-sm text-rose-700">
                  {cancelReason ? (
                    <>Lý do: <strong>{cancelReason}</strong></>
                  ) : (
                    'Đơn hàng đã được hủy theo yêu cầu. Số lượng tồn kho và voucher đã được khôi phục.'
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Steps
            current={getStepIndex(order.orderStatus)}
            items={[
              { title: 'Chờ xác nhận', description: 'Tiếp nhận đơn' },
              { title: 'Đã xác nhận', description: 'Đã duyệt' },
              { title: 'Đang xử lý', description: 'Đóng gói máy' },
              { title: 'Đang giao', description: 'Vận chuyển' },
              { title: 'Hoàn tất', description: 'Đã nhận hàng' },
            ]}
          />
        )}
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
            {customerNote && <Descriptions.Item label="Ghi chú" span={2}>{customerNote}</Descriptions.Item>}
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

      {/* Modal xác nhận hủy đơn phía khách hàng */}
      <Modal
        title="Xác nhận hủy đơn hàng"
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        onOk={() => cancelMutation.mutate()}
        okText="Xác nhận hủy"
        okButtonProps={{ danger: true, loading: cancelMutation.isPending }}
        cancelText="Giữ lại đơn"
        destroyOnClose
      >
        <div className="py-2 space-y-3">
          <p className="text-sm text-gray-700">
            Bạn có chắc chắn muốn hủy đơn hàng <strong>#{order.id}</strong> không?
          </p>
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            ⚠️ Lưu ý: Khi hủy đơn hàng, số lượng tồn kho của sản phẩm và mã giảm giá Voucher đã dùng (nếu có) sẽ được khôi phục tự động.
          </div>
        </div>
      </Modal>
    </div>
  );
}
