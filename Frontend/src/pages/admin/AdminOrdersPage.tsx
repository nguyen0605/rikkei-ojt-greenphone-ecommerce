import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Select,
  Input,
  Button,
  Drawer,
  Modal,
  Descriptions,
  Divider,
  Tag,
  Space,
  Radio,
  Typography,
  message,
  type TableColumnsType,
} from 'antd';
import {
  ShoppingCartOutlined,
  EyeOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { adminOrderService } from '@/services';
import type { OrderDTO, OrderDetailDTO } from '@/types/api';
import { formatVND, formatDate } from '@/utils';
import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import StatusTag from '@/components/admin/StatusTag';

const { Text } = Typography;
const { TextArea } = Input;

const statusOpts = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
const paymentStatusOpts = ['UNPAID', 'PAID', 'REFUNDED'];

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Drawer xem chi tiết đơn hàng
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal hủy đơn hàng
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<OrderDTO | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string>(CANCEL_REASONS[0]);
  const [cancelReasonCustom, setCancelReasonCustom] = useState('');

  const params: Record<string, string> = { page: String(page - 1), size: '15' };
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;

  // Query danh sách đơn
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => adminOrderService.list(params),
  });

  // Query chi tiết đơn khi mở Drawer
  const { data: orderDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['admin-order-detail', selectedOrderId],
    queryFn: () => adminOrderService.detail(selectedOrderId!),
    enabled: !!selectedOrderId && isDrawerOpen,
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

  // Helper trích xuất lý do hủy: ưu tiên localStorage -> note của đơn -> fallback
  const getCancelReason = (order: OrderDTO | null | undefined): string | null => {
    if (!order) return null;
    try {
      const stored = localStorage.getItem(`admin_cancel_reason_${order.id}`);
      if (stored) return stored;
    } catch {
      // ignore
    }
    if (order.note) {
      const match = order.note.match(/\[Lý do hủy:\s*(.*?)\]/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    if (order.orderStatus === 'CANCELLED') {
      return 'Khách hàng yêu cầu hủy';
    }
    return null;
  };

  // Helper trích xuất ghi chú đơn hàng của khách (loại bỏ tag lý do hủy nếu có)
  const getCustomerNote = (note?: string | null): string | null => {
    if (!note) return null;
    const cleaned = note.replace(/\[Lý do hủy:\s*.*?\]/gi, '').trim();
    return cleaned.length > 0 ? cleaned : null;
  };

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

  // Xác nhận hủy đơn
  const handleConfirmCancel = () => {
    if (!cancellingOrder) return;
    const finalReason =
      cancelReasonPreset === 'Lý do khác'
        ? cancelReasonCustom.trim() || 'Lý do khác'
        : cancelReasonPreset;

    try {
      localStorage.setItem(`admin_cancel_reason_${cancellingOrder.id}`, finalReason);
    } catch {
      // ignore
    }

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
      title: 'SL',
      dataIndex: 'quantity',
      align: 'center',
      width: 60,
      render: (q: number) => <span className="font-medium">x{q}</span>,
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
            style={{ width: 95 }}
            disabled={r.orderStatus === 'CANCELLED'}
            onChange={(v) => paymentMut.mutate({ id: r.id, paymentStatus: v })}
            options={paymentStatusOpts.map((o) => ({ value: o, label: o }))}
          />
        </div>
      ),
    },
    {
      title: 'Trạng thái đơn',
      dataIndex: 'orderStatus',
      width: 240,
      render: (s: string, r) => (
        <div className="flex items-center gap-2">
          {/* Cố định width 105px cho StatusTag trạng thái đơn */}
          <div className="w-[105px] shrink-0 flex items-center">
            <StatusTag status={s} className="!w-full !m-0" />
          </div>
          <Select
            size="small"
            value={s}
            style={{ width: 115 }}
            disabled={s === 'CANCELLED'}
            onChange={(v) => {
              if (v === 'CANCELLED') {
                handleOpenCancelModal(r);
              } else {
                statusMut.mutate({ id: r.id, status: v });
              }
            }}
            options={statusOpts.map((o) => ({
              value: o,
              label: o,
              disabled: s === 'CANCELLED',
            }))}
          />
        </div>
      ),
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
          />
          {r.orderStatus !== 'CANCELLED' && (
            <Button
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleOpenCancelModal(r)}
              title="Hủy đơn hàng"
            />
          )}
        </Space>
      ),
    },
  ];

  const activeOrder = orderDetail || data?.content?.find((o) => o.id === selectedOrderId);

  return (
    <div>
      <AdminPageHeader
        title="Đơn hàng"
        subtitle="Theo dõi và cập nhật trạng thái đơn hàng"
        actions={
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <ShoppingCartOutlined />
          </div>
        }
      />
      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input.Search
            placeholder="Tìm đơn theo tên / SĐT / mã..."
            allowClear
            onSearch={(v) => {
              setSearch(v.trim());
              setPage(1);
            }}
            className="!w-64"
          />
          <Select
            placeholder="Trạng thái đơn"
            allowClear
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            className="!w-36"
            options={statusOpts.map((s) => ({ value: s, label: s }))}
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
      {/* DRAWER XEM CHI TIẾT ĐƠN HÀNG                             */}
      {/* ======================================================== */}
      <Drawer
        title={
          <div className="flex items-center justify-between pr-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-ink">
                Chi tiết đơn hàng #{activeOrder?.id}
              </span>
              {activeOrder?.orderStatus && <StatusTag status={activeOrder.orderStatus} />}
            </div>
            {activeOrder?.createdAt && (
              <span className="text-xs text-ink-3">
                Đặt lúc: {formatDate(activeOrder.createdAt)}
              </span>
            )}
          </div>
        }
        width={680}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        loading={isLoadingDetail}
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-3">
              Mã khách hàng: #{activeOrder?.userId} ({activeOrder?.userName})
            </span>
            <Space>
              {activeOrder && activeOrder.orderStatus !== 'CANCELLED' && (
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleOpenCancelModal(activeOrder)}
                >
                  Hủy đơn này
                </Button>
              )}
              {activeOrder && activeOrder.orderStatus === 'PENDING' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    statusMut.mutate(
                      { id: activeOrder.id, status: 'CONFIRMED' },
                      { onSuccess: () => setIsDrawerOpen(false) }
                    );
                  }}
                >
                  Xác nhận đơn
                </Button>
              )}
              <Button onClick={() => setIsDrawerOpen(false)}>Đóng</Button>
            </Space>
          </div>
        }
      >
        {activeOrder && (
          <div className="space-y-6">
            {/* Mục Thông tin & Lý do hủy đơn hàng (hiển thị khi đơn hàng đã bị hủy) */}
            {activeOrder.orderStatus === 'CANCELLED' && (
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
                        {getCancelReason(activeOrder)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-rose-600">
                      * Tồn kho các sản phẩm trong đơn và mã giảm giá Voucher (nếu có) đã được hoàn trả tự động vào hệ thống.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Thông tin giao nhận */}
            <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-2">
                Thông tin người nhận
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2 text-sm text-ink">
                  <UserOutlined className="mt-1 text-primary-600" />
                  <div>
                    <div className="text-xs text-ink-3">Người nhận</div>
                    <div className="font-semibold">{activeOrder.receiverName || 'Chưa cập nhật'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm text-ink">
                  <PhoneOutlined className="mt-1 text-primary-600" />
                  <div>
                    <div className="text-xs text-ink-3">Số điện thoại</div>
                    <div className="font-semibold">{activeOrder.receiverPhone || 'Chưa cập nhật'}</div>
                  </div>
                </div>
                <div className="col-span-1 sm:col-span-2 flex items-start gap-2 text-sm text-ink">
                  <EnvironmentOutlined className="mt-1 text-primary-600" />
                  <div>
                    <div className="text-xs text-ink-3">Địa chỉ giao hàng</div>
                    <div className="font-medium text-ink">{activeOrder.shippingAddress || 'Chưa cập nhật'}</div>
                  </div>
                </div>
                {getCustomerNote(activeOrder.note) && (
                  <div className="col-span-1 sm:col-span-2 flex items-start gap-2 text-sm text-ink">
                    <FileTextOutlined className="mt-1 text-primary-600" />
                    <div>
                      <div className="text-xs text-ink-3">Ghi chú của khách</div>
                      <div className="italic text-ink-2">"{getCustomerNote(activeOrder.note)}"</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Phương thức & Trạng thái thanh toán */}
            <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-2">
                Thanh toán & Vận chuyển
              </h4>
              <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Phương thức">
                  <Tag color={activeOrder.paymentMethod === 'VIETQR' ? 'blue' : 'gold'}>
                    <CreditCardOutlined className="mr-1" />
                    {activeOrder.paymentMethod}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái tiền">
                  <StatusTag status={activeOrder.paymentStatus} />
                </Descriptions.Item>
                {activeOrder.promotionCode && (
                  <Descriptions.Item label="Mã voucher">
                    <Tag color="cyan">Mã: {activeOrder.promotionCode}</Tag>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>

            {/* 3. Danh sách sản phẩm đặt mua */}
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-2">
                Sản phẩm trong đơn ({activeOrder.orderDetails?.length || 0})
              </h4>
              <Table<OrderDetailDTO>
                columns={detailItemColumns}
                dataSource={activeOrder.orderDetails || []}
                rowKey="id"
                pagination={false}
                size="small"
                className="overflow-hidden rounded-lg border border-line"
              />
            </div>

            {/* 4. Tổng kết số tiền */}
            <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-ink-2">
                  <span>Tạm tính tiền hàng:</span>
                  <span>{formatVND(activeOrder.totalAmount)}</span>
                </div>
                {activeOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Chiết khấu Voucher:</span>
                    <span>-{formatVND(activeOrder.discountAmount)}</span>
                  </div>
                )}
                <Divider className="!my-2" />
                <div className="flex justify-between text-base font-bold text-ink">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="text-xl text-primary-600">
                    {formatVND(activeOrder.finalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

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
              <div className="mb-1 text-xs text-ink-3">Nhập chi tiết lý do:</div>
              <TextArea
                rows={3}
                placeholder="Nhập lý do cụ thể để lưu lại nhật ký..."
                value={cancelReasonCustom}
                onChange={(e) => setCancelReasonCustom(e.target.value)}
                maxLength={200}
                showCount
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
