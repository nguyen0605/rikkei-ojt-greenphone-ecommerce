import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Select,
  Input,
  Button,
  Modal,
  Space,
  Radio,
  Tabs,
  Tooltip,
  message,
  type TableColumnsType,
} from 'antd';
import {
  ShoppingCartOutlined,
  EyeOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { adminOrderService } from '@/services';
import type { OrderDTO } from '@/types/api';
import { formatVND, formatDate } from '@/utils';
import { useState, useEffect } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import StatusTag from '@/components/admin/StatusTag';
import AdminOrderDetailDrawer from '@/components/admin/AdminOrderDetailDrawer';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  isTerminalOrderStatus,
  getAvailableNextStatusOptions,
  PAYMENT_STATUS_LABEL,
  isTerminalPaymentStatus,
  getAvailableNextPaymentStatusOptions,
} from '@/utils/orderStateMachine';

const { TextArea } = Input;

const CANCEL_REASONS = [
  'Khách hàng yêu cầu hủy',
  'Hết hàng trong kho',
  'Không liên lạc được với khách hàng',
  'Thông tin giao hàng không chính xác / Spam',
  'Lý do khác',
];

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Cơ chế debounce 400ms cho ô tìm kiếm đơn hàng
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Drawer xem chi tiết đơn hàng (tách component riêng biệt)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal hủy đơn hàng
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<OrderDTO | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string>(CANCEL_REASONS[0]);
  const [cancelReasonCustom, setCancelReasonCustom] = useState('');

  const params: Record<string, string> = { page: String(page - 1), size: '15' };
  if (debouncedSearch) params.search = debouncedSearch;
  if (statusFilter) params.status = statusFilter;

  // Query danh sách đơn
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => adminOrderService.list(params),
  });

  // Mutation cập nhật trạng thái đơn
  const statusMut = useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: string; reason?: string }) =>
      adminOrderService.updateStatus(id, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-order-detail'] });
      message.success('Cập nhật trạng thái đơn thành công');
    },
    onError: (err: any) => {
      message.error(err?.message || 'Không thể cập nhật trạng thái đơn');
    },
  });

  // Mutation cập nhật trạng thái thanh toán
  const paymentMut = useMutation({
    mutationFn: ({ id, paymentStatus }: { id: number; paymentStatus: string }) =>
      adminOrderService.updatePaymentStatus(id, paymentStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-order-detail'] });
      message.success('Cập nhật thanh toán thành công');
    },
    onError: (err: any) => {
      message.error(err?.message || 'Không thể cập nhật thanh toán');
    },
  });

  // Xác nhận chuyển trạng thái thanh toán
  const handlePaymentStatusChange = (orderId: number, nextStatus: string, currentStatus: string) => {
    if (nextStatus === currentStatus) return;
    Modal.confirm({
      title: 'Xác nhận chuyển trạng thái thanh toán',
      content: `Bạn có chắc chắn muốn chuyển trạng thái thanh toán của đơn #${orderId} từ "${PAYMENT_STATUS_LABEL[currentStatus] || currentStatus}" sang "${PAYMENT_STATUS_LABEL[nextStatus] || nextStatus}"?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: () => {
        paymentMut.mutate({ id: orderId, paymentStatus: nextStatus });
      },
    });
  };

  // Xác nhận chuyển trạng thái đơn hàng
  const handleOrderStatusChange = (orderId: number, nextStatus: string, currentStatus: string) => {
    if (nextStatus === currentStatus) return;

    const order = data?.content?.find((o) => o.id === orderId);
    if (order && isTerminalPaymentStatus(order.paymentStatus)) {
      message.error('Đơn hàng đã hoàn tiền thành công, trạng thái đơn hàng đã bị khóa vĩnh viễn');
      return;
    }

    if (nextStatus === 'CANCELLED') {
      if (order) {
        handleOpenCancelModal(order);
      }
      return;
    }

    const currentLabel = ORDER_STATUS_LABEL[currentStatus] || currentStatus;
    const nextLabel = ORDER_STATUS_LABEL[nextStatus] || nextStatus;

    Modal.confirm({
      title: 'Xác nhận chuyển trạng thái đơn hàng',
      content: `Bạn có chắc chắn muốn chuyển trạng thái đơn hàng #${orderId} từ "${currentLabel}" sang "${nextLabel}"?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy bỏ',
      onOk: () => {
        statusMut.mutate({ id: orderId, status: nextStatus });
      },
    });
  };

  // Xử lý mở Drawer chi tiết
  const handleOpenDetail = (order: OrderDTO) => {
    setSelectedOrderId(order.id);
    setIsDrawerOpen(true);
  };

  // Mở modal hủy đơn
  const handleOpenCancelModal = (order: OrderDTO) => {
    setCancellingOrder(order);
    setCancelReasonPreset(CANCEL_REASONS[0]);
    setCancelReasonCustom('');
    setCancelModalVisible(true);
  };

  // Xác nhận hủy đơn (Gửi lý do trực tiếp lên Backend, tuyệt đối không lưu vào localStorage)
  const handleConfirmCancel = () => {
    if (!cancellingOrder) return;

    const isPaid = cancellingOrder.paymentStatus === 'PAID';
    if (isPaid && cancelReasonPreset === 'Lý do khác' && !cancelReasonCustom.trim()) {
      message.warning('Đối với đơn hàng đã thanh toán, vui lòng nhập chi tiết lý do hủy đơn');
      return;
    }

    const finalReason =
      cancelReasonPreset === 'Lý do khác'
        ? cancelReasonCustom.trim() || 'Lý do khác'
        : cancelReasonPreset;

    statusMut.mutate(
      { id: cancellingOrder.id, status: 'CANCELLED', reason: finalReason },
      {
        onSuccess: () => {
          message.info(`Đơn #${cancellingOrder.id} đã được hủy (${finalReason})`);
          setCancelModalVisible(false);
          setCancellingOrder(null);
        },
      }
    );
  };

  // Cột của bảng danh sách đơn hàng (Cố định chiều rộng, căn chỉnh chuẩn xác và đồng nhất)
  const columns: TableColumnsType<OrderDTO> = [
    {
      title: 'Mã đơn',
      dataIndex: 'id',
      width: 95,
      align: 'center' as const,
      render: (v: number, r) => (
        <div className="flex items-center justify-center">
          <Button
            type="link"
            className="!p-0 font-bold !text-primary-600 hover:underline"
            onClick={() => handleOpenDetail(r)}
          >
            #{v}
          </Button>
        </div>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'userName',
      width: 180,
      align: 'left' as const,
      render: (name: string, r) => (
        <div className="flex flex-col justify-center text-left">
          <div className="font-medium text-ink truncate max-w-[160px]" title={r.receiverName || name}>
            {r.receiverName || name}
          </div>
          <div className="text-xs text-ink-3">{r.receiverPhone}</div>
        </div>
      ),
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'createdAt',
      render: (v: string) => <span className="text-xs text-ink-2 whitespace-nowrap">{formatDate(v)}</span>,
      width: 120,
      align: 'center' as const,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'finalAmount',
      render: (v: number) => (
        <span className="font-semibold text-ink whitespace-nowrap">{formatVND(v)}</span>
      ),
      width: 135,
      align: 'right' as const,
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentStatus',
      width: 280,
      align: 'center' as const,
      render: (s: string, r) => {
        const isTerminalPayment = isTerminalPaymentStatus(s);
        const isCancelledNonRefundable = r.orderStatus === 'CANCELLED' && s !== 'REFUND_PENDING';
        const isLocked = isTerminalPayment || isCancelledNonRefundable;
        const paymentOptions = getAvailableNextPaymentStatusOptions(s);

        return (
          <div className="flex items-center justify-center gap-2">
            {/* Cố định width 110px cho StatusTag */}
            <div className="w-[110px] shrink-0 flex items-center justify-center">
              <StatusTag status={s} className="!w-full !m-0 !h-[28px] !leading-[28px]" />
            </div>
            <Tooltip
              title={
                isLocked
                  ? isTerminalPayment
                    ? 'Đã hoàn tiền thành công (Trạng thái kết thúc)'
                    : 'Đơn đã hủy, không thể thay đổi'
                  : undefined
              }
            >
              <span className="inline-block">
                <Select
                  value={s}
                  style={{ width: 145 }}
                  className="!h-[34px] [&_.ant-select-selector]:!h-[34px] [&_.ant-select-selection-item]:!leading-[32px]"
                  disabled={isLocked}
                  onChange={(v) => handlePaymentStatusChange(r.id, v, s)}
                  options={paymentOptions}
                />
              </span>
            </Tooltip>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái đơn',
      dataIndex: 'orderStatus',
      width: 280,
      align: 'center' as const,
      render: (s: string, r) => {
        // State Machine: Khóa cứng dropdown khi là DELIVERED, CANCELLED hoặc ĐÃ HOÀN TIỀN (REFUNDED)
        const isRefunded = isTerminalPaymentStatus(r.paymentStatus);
        const isTerminal = isTerminalOrderStatus(s) || isRefunded;
        // Chỉ hiển thị các trạng thái kế tiếp hợp lệ
        const options = getAvailableNextStatusOptions(s, r.paymentStatus);

        return (
          <div className="flex items-center justify-center gap-2">
            {/* Cố định width 110px cho StatusTag trạng thái đơn */}
            <div className="w-[110px] shrink-0 flex items-center justify-center">
              <StatusTag status={s} className="!w-full !m-0 !h-[28px] !leading-[28px]" />
            </div>
            <Tooltip
              title={
                isRefunded
                  ? 'Đơn hàng đã hoàn tiền thành công, trạng thái đã bị khóa vĩnh viễn'
                  : isTerminalOrderStatus(s)
                    ? 'Đơn hàng ở trạng thái kết thúc'
                    : undefined
              }
            >
              <span className="inline-block">
                <Select
                  value={s}
                  style={{ width: 145 }}
                  className="!h-[34px] [&_.ant-select-selector]:!h-[34px] [&_.ant-select-selection-item]:!leading-[32px]"
                  disabled={isTerminal}
                  onChange={(v) => handleOrderStatusChange(r.id, v, s)}
                  options={options}
                />
              </span>
            </Tooltip>
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 110,
      align: 'center' as const,
      render: (_, r) => (
        <div className="flex items-center justify-center">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetail(r)}
            title="Xem chi tiết"
            className="!h-[32px] !w-[96px] inline-flex items-center justify-center gap-1 font-medium text-xs"
          >
            Chi tiết
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Quản lý đơn hàng"
        subtitle="Theo dõi toàn bộ đơn đặt hàng và quy trình duyệt giao hàng"
      />

      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Tìm mã đơn, tên, SĐT..."
            allowClear
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="!w-64"
          />
          <Select
            placeholder="Lọc trạng thái đơn"
            allowClear
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            className="!w-44"
            options={ORDER_STATUSES.map((s) => ({
              value: s,
              label: `${s} (${ORDER_STATUS_LABEL[s] || s})`,
            }))}
          />
        </div>

        <Table<OrderDTO>
          columns={columns}
          dataSource={data?.content || []}
          rowKey="id"
          loading={isLoading}
          tableLayout="fixed"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize: 15,
            total: data?.totalElements || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
          className="[&_.ant-table-thead>tr>th]:!bg-bg-soft [&_.ant-table-thead>tr>th]:!text-xs [&_.ant-table-thead>tr>th]:!uppercase [&_.ant-table-thead>tr>th]:!tracking-wide [&_.ant-table-thead>tr>th]:!text-ink-2 [&_.ant-table-thead>tr>th]:!font-semibold [&_.ant-table-tbody>tr]:!h-[56px] [&_.ant-table-tbody>tr>td]:!h-[56px] [&_.ant-table-tbody>tr>td]:!py-1.5 [&_.ant-table-tbody>tr>td]:!align-middle"
        />
      </AdminCard>

      {/* ======================================================== */}
      {/* DRAWER XEM CHI TIẾT ĐƠN HÀNG (TÁCH THÀNH FILE RIÊNG)     */}
      {/* ======================================================== */}
      <AdminOrderDetailDrawer
        open={isDrawerOpen}
        orderId={selectedOrderId}
        onClose={() => setIsDrawerOpen(false)}
        onOpenCancelModal={(order) => handleOpenCancelModal(order)}
        onConfirmOrder={(order) => {
          Modal.confirm({
            title: 'Xác nhận duyệt đơn hàng',
            content: `Bạn có chắc chắn muốn duyệt và chuyển đơn hàng #${order.id} sang trạng thái "Đã xác nhận"?`,
            okText: 'Xác nhận duyệt',
            cancelText: 'Hủy bỏ',
            onOk: () => {
              statusMut.mutate(
                { id: order.id, status: 'CONFIRMED' },
                { onSuccess: () => setIsDrawerOpen(false) }
              );
            },
          });
        }}
        isConfirming={statusMut.isPending}
      />

      {/* ======================================================== */}
      {/* MODAL LÝ DO HỦY ĐƠN HÀNG DÀNH CHO ADMIN                 */}
      {/* ======================================================== */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-rose-600">
            <CloseCircleOutlined className="text-xl" />
            <span className="font-bold">Xác nhận hủy đơn hàng #{cancellingOrder?.id}</span>
          </div>
        }
        open={cancelModalVisible}
        zIndex={1050}
        onCancel={() => {
          setCancelModalVisible(false);
          setCancellingOrder(null);
        }}
        onOk={handleConfirmCancel}
        okText="Xác nhận hủy đơn"
        okButtonProps={{ danger: true, loading: statusMut.isPending }}
        cancelText="Đóng"
        destroyOnClose
      >
        <div className="py-2 space-y-4">
          <p className="text-sm text-ink-2">
            Vui lòng chọn hoặc nhập lý do hủy đơn hàng của khách hàng{' '}
            <strong className="text-ink">
              {cancellingOrder?.receiverName || cancellingOrder?.userName}
            </strong>
            . Khi hủy đơn, hệ thống sẽ tự động hoàn lại số lượng tồn kho và khôi phục Voucher (nếu có).
          </p>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
              Lý do hủy đơn:
            </div>
            <Radio.Group
              value={cancelReasonPreset}
              onChange={(e) => setCancelReasonPreset(e.target.value)}
              className="flex flex-col gap-2"
            >
              {CANCEL_REASONS.map((reason) => (
                <Radio key={reason} value={reason}>
                  <span className="text-sm text-ink">{reason}</span>
                </Radio>
              ))}
            </Radio.Group>
          </div>

          {cancelReasonPreset === 'Lý do khác' && (
            <div>
              <div className="mb-1 text-xs text-ink-3">
                Nhập chi tiết lý do {cancellingOrder?.paymentStatus === 'PAID' && <span className="text-red-500">*</span>}:
              </div>
              <TextArea
                rows={3}
                placeholder={
                  cancellingOrder?.paymentStatus === 'PAID'
                    ? 'Vui lòng nhập chi tiết lý do hủy đơn (bắt buộc đối với đơn đã thanh toán)...'
                    : 'Nhập lý do cụ thể để lưu lại nhật ký...'
                }
                value={cancelReasonCustom}
                onChange={(e) => setCancelReasonCustom(e.target.value)}
                maxLength={200}
                showCount
                status={cancellingOrder?.paymentStatus === 'PAID' && !cancelReasonCustom.trim() ? 'warning' : ''}
              />
              {cancellingOrder?.paymentStatus === 'PAID' && !cancelReasonCustom.trim() && (
                <p className="mt-1 text-[11px] text-amber-600">
                  * Bắt buộc nhập chi tiết lý do đối với đơn hàng đã thanh toán để lưu nhật ký đối soát hoàn tiền.
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
