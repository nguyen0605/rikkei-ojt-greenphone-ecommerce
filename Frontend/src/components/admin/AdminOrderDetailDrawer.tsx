import { Drawer, Space, Button, Descriptions, Tag, Table, Divider, type TableColumnsType } from 'antd';
import {
  CloseCircleOutlined,
  CheckCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { adminOrderService } from '@/services';
import type { OrderDTO, OrderDetailDTO } from '@/types/api';
import { formatVND, formatDate } from '@/utils';
import StatusTag from '@/components/admin/StatusTag';
import { extractCancelReason, extractCustomerNote, isTerminalOrderStatus } from '@/utils/orderStateMachine';

interface AdminOrderDetailDrawerProps {
  open: boolean;
  orderId: number | null;
  onClose: () => void;
  onOpenCancelModal?: (order: OrderDTO) => void;
  onConfirmOrder?: (order: OrderDTO) => void;
  isConfirming?: boolean;
}

export default function AdminOrderDetailDrawer({
  open,
  orderId,
  onClose,
  onOpenCancelModal,
  onConfirmOrder,
  isConfirming = false,
}: AdminOrderDetailDrawerProps) {
  // Query chi tiết đơn hàng
  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order-detail', orderId],
    queryFn: () => adminOrderService.detail(orderId!),
    enabled: !!orderId && open,
  });

  // Bảng chi tiết sản phẩm trong Drawer
  const detailItemColumns: TableColumnsType<OrderDetailDTO> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      render: (name: string, r) => (
        <div>
          <div className="font-semibold text-ink">{name}</div>
          <div className="text-xs text-ink-3">
            {[r.ram, r.storage, r.color].filter(Boolean).join(' • ')}
          </div>
        </div>
      ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      align: 'right',
      width: 130,
      render: (v: number) => formatVND(v),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      align: 'center',
      width: 90,
      render: (q: number) => <span className="font-medium text-ink">x{q}</span>,
    },
    {
      title: 'Thành tiền',
      dataIndex: 'subtotal',
      align: 'right',
      width: 140,
      render: (v: number) => (
        <span className="font-semibold text-primary-600">{formatVND(v)}</span>
      ),
    },
  ];

  const cancelReason = extractCancelReason(order?.note);
  const customerNote = extractCustomerNote(order?.note);
  const isTerminal = isTerminalOrderStatus(order?.orderStatus);

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between pr-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-ink">
              Chi tiết đơn hàng #{order?.id}
            </span>
            {order?.orderStatus && <StatusTag status={order.orderStatus} />}
          </div>
          {order?.createdAt && (
            <span className="text-xs text-ink-3">
              Đặt lúc: {formatDate(order.createdAt)}
            </span>
          )}
        </div>
      }
      width={680}
      open={open}
      onClose={onClose}
      loading={isLoading}
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-3">
            Mã khách hàng: #{order?.userId} ({order?.userName})
          </span>
          <Space>
            {/* Chỉ cho phép hủy khi đơn chưa ở trạng thái kết thúc (DELIVERED, CANCELLED) */}
            {order && !isTerminal && onOpenCancelModal && (
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => onOpenCancelModal(order)}
              >
                Hủy đơn này
              </Button>
            )}

            {/* Chỉ cho phép xác nhận khi đơn đang ở PENDING */}
            {order && order.orderStatus === 'PENDING' && onConfirmOrder && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={isConfirming}
                onClick={() => onConfirmOrder(order)}
              >
                Xác nhận đơn
              </Button>
            )}

            <Button onClick={onClose}>Đóng</Button>
          </Space>
        </div>
      }
    >
      {order && (
        <div className="space-y-6">
          {/* 1. Mục Lý do hủy đơn hàng (hoàn toàn lấy từ API Backend, không qua localStorage) */}
          {order.orderStatus === 'CANCELLED' && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                  <CloseCircleOutlined className="text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                      Thông tin hủy đơn hàng
                    </span>
                    <Tag color="red" className="!m-0 !font-semibold">
                      ĐÃ HỦY
                    </Tag>
                  </div>
                  <div className="mt-2 text-sm text-ink">
                    <span className="font-semibold text-rose-950">Lý do hủy đơn: </span>
                    <span className="inline-block font-semibold text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-md border border-rose-200">
                      {cancelReason || 'Khách hàng yêu cầu hủy'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-rose-600">
                    * Tồn kho các sản phẩm trong đơn và mã giảm giá Voucher (nếu có) đã được hoàn trả tự động vào hệ thống.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Thông tin người nhận */}
          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-2">
              Thông tin người nhận
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2 text-sm text-ink">
                <UserOutlined className="mt-1 text-primary-600" />
                <div>
                  <div className="text-xs text-ink-3">Người nhận</div>
                  <div className="font-semibold">{order.receiverName || 'Chưa cập nhật'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm text-ink">
                <PhoneOutlined className="mt-1 text-primary-600" />
                <div>
                  <div className="text-xs text-ink-3">Số điện thoại</div>
                  <div className="font-semibold">{order.receiverPhone || 'Chưa cập nhật'}</div>
                </div>
              </div>
              <div className="col-span-1 sm:col-span-2 flex items-start gap-2 text-sm text-ink">
                <EnvironmentOutlined className="mt-1 text-primary-600" />
                <div>
                  <div className="text-xs text-ink-3">Địa chỉ giao hàng</div>
                  <div className="font-medium text-ink">{order.shippingAddress || 'Chưa cập nhật'}</div>
                </div>
              </div>
              {customerNote && (
                <div className="col-span-1 sm:col-span-2 flex items-start gap-2 text-sm text-ink">
                  <FileTextOutlined className="mt-1 text-primary-600" />
                  <div>
                    <div className="text-xs text-ink-3">Ghi chú của khách</div>
                    <div className="italic text-ink-2">"{customerNote}"</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Phương thức & Trạng thái thanh toán */}
          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-2">
              Thanh toán & Vận chuyển
            </h4>
            <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Phương thức">
                <Tag color={order.paymentMethod === 'VIETQR' ? 'blue' : 'gold'}>
                  <CreditCardOutlined className="mr-1" />
                  {order.paymentMethod}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái tiền">
                <StatusTag status={order.paymentStatus} />
              </Descriptions.Item>
              {order.promotionCode && (
                <Descriptions.Item label="Mã voucher">
                  <Tag color="cyan">Mã: {order.promotionCode}</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>

          {/* 4. Danh sách sản phẩm đặt mua */}
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-2">
              Sản phẩm trong đơn ({order.orderDetails?.length || 0})
            </h4>
            <Table<OrderDetailDTO>
              columns={detailItemColumns}
              dataSource={order.orderDetails || []}
              rowKey="id"
              pagination={false}
              size="small"
              className="overflow-hidden rounded-lg border border-line"
            />
          </div>

          {/* 5. Tổng kết số tiền */}
          <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-ink-2">
                <span>Tạm tính tiền hàng:</span>
                <span>{formatVND(order.totalAmount)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Chiết khấu Voucher:</span>
                  <span>-{formatVND(order.discountAmount)}</span>
                </div>
              )}
              <Divider className="!my-2" />
              <div className="flex justify-between text-base font-bold text-ink">
                <span>Tổng tiền thanh toán:</span>
                <span className="text-xl text-primary-600">
                  {formatVND(order.finalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

