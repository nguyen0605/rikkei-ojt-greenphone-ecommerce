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
} from '@/utils/orderStateMachine';

const { TextArea } = Input;

const paymentStatusOpts = ['UNPAID', 'PAID', 'REFUND_PENDING', 'REFUNDED'];

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

  // Cột của bảng danh sách đơn hàng
  const columns: TableColumnsType<OrderDTO> = [
    {
      title: 'Đơn',
      dataIndex: 'id',
      width: 80,
      render: (v: number, r) => (
        <Button
          type="link"
          className="!p-0 font-bold !text-primary-600 hover:underline"
          onClick={() => handleOpenDetail(r)}
        >
          #{v}
        </Button>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'userName',
      width: 160,
      render: (name: string, r) => (
        <div>
          <div className="font-medium text-ink">{r.receiverName || name}</div>
          <div className="text-xs text-ink-3">{r.receiverPhone}</div>
        </div>
      ),
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'createdAt',
      render: (v: string) => formatDate(v),
      width: 110,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'finalAmount',
      render: (v: number) => (
        <span className="font-semibold text-ink">{formatVND(v)}</span>
      ),
      width: 130,
      align: 'right' as const,
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentStatus',
      width: 230,
      render: (s: string, r) => (
        <div className="flex items-center gap-2">
          {/* Cố định width 110px cho StatusTag để các dòng luôn thẳng hàng tuyệt đối */}
          <div className="w-[110px] shrink-0 flex items-center">
            <StatusTag status={s} className="!w-full !m-0" />
          </div>
          <Select
            size="small"
            value={s}
            style={{ width: 105 }}
            disabled={r.orderStatus === 'CANCELLED' && r.paymentStatus !== 'REFUND_PENDING'}
            onChange={(v) => paymentMut.mutate({ id: r.id, paymentStatus: v })}
            options={paymentStatusOpts.map((o) => ({ value: o, label: o }))}
          />
        </div>
      ),
    },
    {
      title: 'Trạng thái đơn',
      dataIndex: 'orderStatus',
      width: 260,
      render: (s: string, r) => {
        // State Machine: Khóa cứng dropdown khi là DELIVERED hoặc CANCELLED
        const isTerminal = isTerminalOrderStatus(s);
        // Chỉ hiển thị các trạng thái kế tiếp hợp lệ
        const options = getAvailableNextStatusOptions(s);

        return (
          <div className="flex items-center gap-2">
            {/* Cố định width 105px cho StatusTag trạng thái đơn */}
            <div className="w-[105px] shrink-0 flex items-center">
              <StatusTag status={s} className="!w-full !m-0" />
            </div>
            <Select
              size="small"
              value={s}
              style={{ width: 140 }}
              disabled={isTerminal}
              onChange={(v) => {
                if (v === 'CANCELLED') {
                  handleOpenCancelModal(r);
                } else {
                  statusMut.mutate({ id: r.id, status: v });
                }
              }}
              options={options}
            />
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
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetail(r)}
            title="Xem chi tiết"
          >
            Chi tiết
          </Button>
        </Space>
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
          size="middle"
          pagination={{
            current: page,
            pageSize: 15,
            total: data?.totalElements || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
          className="[&_.ant-table-thead>tr>th]:!bg-bg-soft [&_.ant-table-thead>tr>th]:!text-xs [&_.ant-table-thead>tr>th]:!uppercase [&_.ant-table-thead>tr>th]:!tracking-wide [&_.ant-table-thead>tr>th]:!text-ink-2 [&_.ant-table-thead>tr>th]:!font-semibold"
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
          statusMut.mutate(
            { id: order.id, status: 'CONFIRMED' },
            { onSuccess: () => setIsDrawerOpen(false) }
          );
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
