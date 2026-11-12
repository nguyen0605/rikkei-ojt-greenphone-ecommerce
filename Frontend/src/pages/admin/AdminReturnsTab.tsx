import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Tag,
  Button,
  Modal,
  Space,
  Input,
  message,
  Image,
  Select,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { returnService, type ReturnResponse, type ReturnStatus } from '@/services/returnService';
import { formatVND, formatDate } from '@/utils';
import StatusTag from '@/components/admin/StatusTag';
import { ROUTES } from '@/routes/routePaths';

const { TextArea } = Input;
const { Text } = Typography;

export default function AdminReturnsTab() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Modal xem chi tiết & duyệt / từ chối
  const [selectedReturn, setSelectedReturn] = useState<ReturnResponse | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'approve' | 'reject' | 'complete'>('view');
  const [adminNote, setAdminNote] = useState('');
  const [newImeiNumber, setNewImeiNumber] = useState('');

  const params: Record<string, string> = {
    page: String(page - 1),
    size: '10',
  };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-returns', params],
    queryFn: () => returnService.getAdminReturns(params),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, adminNote, newImeiNumber }: { id: number; adminNote?: string; newImeiNumber?: string }) =>
      returnService.approveReturn(id, { adminNote, newImeiNumber }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-returns'] });
      message.success('Đã phê duyệt yêu cầu đổi trả thành công');
      setSelectedReturn(null);
      setAdminNote('');
      setNewImeiNumber('');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi phê duyệt');
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, adminNote }: { id: number; adminNote?: string }) =>
      returnService.rejectReturn(id, { adminNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-returns'] });
      message.success('Đã từ chối yêu cầu đổi trả');
      setSelectedReturn(null);
      setAdminNote('');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi từ chối');
    },
  });

  const completeMut = useMutation({
    mutationFn: ({ id, adminNote }: { id: number; adminNote?: string }) =>
      returnService.completeReturn(id, { adminNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-returns'] });
      message.success('Đã xác nhận hoàn tất quy trình đổi trả thành công');
      setSelectedReturn(null);
      setAdminNote('');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi hoàn tất');
    },
  });

  const handleOpenApprove = (item: ReturnResponse) => {
    setSelectedReturn(item);
    setModalMode('approve');
    setAdminNote('');
    setNewImeiNumber('');
  };

  const handleOpenReject = (item: ReturnResponse) => {
    setSelectedReturn(item);
    setModalMode('reject');
    setAdminNote('');
  };

  const handleOpenComplete = (item: ReturnResponse) => {
    setSelectedReturn(item);
    setModalMode('complete');
    setAdminNote('');
  };

  const handleOpenDetail = (item: ReturnResponse) => {
    setSelectedReturn(item);
    setModalMode('view');
  };

  const columns = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'returnCode',
      key: 'returnCode',
      render: (val: string, r: ReturnResponse) => (
        <div>
          <span className="font-semibold text-primary-700">{val || `#RET-${r.id}`}</span>
          <div className="text-xs text-ink-3">Đơn hàng #{r.orderId}</div>
        </div>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, r: ReturnResponse) => (
        <div>
          <div className="font-medium text-ink">{r.customerName || `Khách hàng #${r.userId}`}</div>
          <div className="text-xs text-ink-3">ID: {r.userId}</div>
        </div>
      ),
    },
    {
      title: 'Sản phẩm lỗi',
      key: 'product',
      render: (_: any, r: ReturnResponse) => (
        <div>
          <div className="font-medium text-ink">{r.phoneName || `Sản phẩm (Variant #${r.phoneVariantId})`}</div>
          {r.variantSku && <div className="text-xs text-ink-3">SKU: {r.variantSku}</div>}
        </div>
      ),
    },
    {
      title: 'Hình thức',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        if (type === 'EXCHANGE') {
          return <Tag color="blue" className="font-semibold">Đổi 1 - 1 máy mới</Tag>;
        }
        return <Tag color="orange" className="font-semibold">Trả hàng & Hoàn tiền</Tag>;
      },
    },
    {
      title: 'Lý do sự cố',
      key: 'reason',
      render: (_: any, r: ReturnResponse) => (
        <div className="max-w-xs">
          <div className="text-xs font-semibold text-ink line-clamp-1">{r.reason}</div>
          <div className="text-xs text-ink-2 line-clamp-2">{r.errorDescription}</div>
        </div>
      ),
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => (val ? formatDate(val) : '—'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      align: 'center' as const,
      render: (status: ReturnStatus) => {
        switch (status) {
          case 'PENDING':
            return <Tag icon={<ClockCircleOutlined />} color="warning">Chờ thẩm định</Tag>;
          case 'APPROVED':
            return <Tag icon={<CheckCircleOutlined />} color="success">Đã phê duyệt</Tag>;
          case 'REJECTED':
            return <Tag icon={<CloseCircleOutlined />} color="error">Đã từ chối</Tag>;
          case 'COMPLETED':
            return <Tag color="purple">Hoàn tất</Tag>;
          default:
            return <Tag>{status}</Tag>;
        }
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 180,
      align: 'center' as const,
      render: (_: any, r: ReturnResponse) => (
        <div className="flex items-center justify-center gap-1.5 flex-nowrap whitespace-nowrap">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetail(r)}
          >
            Chi tiết
          </Button>
          {r.status === 'PENDING' && (
            <>
              <Button
                size="small"
                type="primary"
                className="!bg-emerald-600 hover:!bg-emerald-700"
                onClick={() => handleOpenApprove(r)}
              >
                Duyệt
              </Button>
              <Button
                size="small"
                danger
                onClick={() => handleOpenReject(r)}
              >
                Từ chối
              </Button>
            </>
          )}
          {r.status === 'APPROVED' && (
            <Button
              size="small"
              type="primary"
              className="!bg-purple-600 hover:!bg-purple-700"
              onClick={() => handleOpenComplete(r)}
            >
              Hoàn tất
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select
            placeholder="Lọc trạng thái yêu cầu"
            allowClear
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            className="!w-48"
            options={[
              { value: 'PENDING', label: 'Chờ thẩm định' },
              { value: 'APPROVED', label: 'Đã phê duyệt' },
              { value: 'REJECTED', label: 'Đã từ chối' },
              { value: 'COMPLETED', label: 'Hoàn tất' },
            ]}
          />
        </div>

        <Button
          type="primary"
          icon={<ExportOutlined />}
          className="!bg-emerald-600 hover:!bg-emerald-700"
          onClick={() => navigate(ROUTES.ADMIN_RETURNS)}
        >
          Mở trang thẩm định chuyên sâu (/admin/doi-tra)
        </Button>
      </div>

      <Table<ReturnResponse>
        columns={columns}
        dataSource={data?.content || []}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={{
          current: page,
          pageSize: 10,
          total: data?.totalElements || 0,
          onChange: (p) => setPage(p),
          showSizeChanger: false,
        }}
        className="[&_.ant-table-thead>tr>th]:!bg-bg-soft [&_.ant-table-thead>tr>th]:!text-xs [&_.ant-table-thead>tr>th]:!uppercase [&_.ant-table-thead>tr>th]:!tracking-wide [&_.ant-table-thead>tr>th]:!text-ink-2 [&_.ant-table-thead>tr>th]:!font-semibold"
      />

      {/* MODAL CHI TIẾT & DUYỆT */}
      <Modal
        title={
          <div className="flex items-center gap-2 font-bold text-ink">
            {modalMode === 'approve' && <span className="text-emerald-600">Phê duyệt yêu cầu #{selectedReturn?.returnCode}</span>}
            {modalMode === 'reject' && <span className="text-rose-600">Từ chối yêu cầu #{selectedReturn?.returnCode}</span>}
            {modalMode === 'complete' && <span className="text-purple-600">Xác nhận hoàn tất đổi trả #{selectedReturn?.returnCode}</span>}
            {modalMode === 'view' && <span>Chi tiết yêu cầu đổi trả #{selectedReturn?.returnCode}</span>}
          </div>
        }
        open={!!selectedReturn}
        zIndex={1050}
        width={650}
        onCancel={() => setSelectedReturn(null)}
        footer={
          modalMode === 'view' ? (
            <Button onClick={() => setSelectedReturn(null)}>Đóng</Button>
          ) : modalMode === 'approve' ? (
            <Space>
              <Button onClick={() => setSelectedReturn(null)}>Hủy bỏ</Button>
              <Button
                type="primary"
                className="!bg-emerald-600 hover:!bg-emerald-700"
                loading={approveMut.isPending}
                onClick={() => {
                  if (!selectedReturn) return;
                  approveMut.mutate({
                    id: selectedReturn.id,
                    adminNote: adminNote.trim() || undefined,
                    newImeiNumber: newImeiNumber.trim() || undefined,
                  });
                }}
              >
                Xác nhận phê duyệt
              </Button>
            </Space>
          ) : modalMode === 'complete' ? (
            <Space>
              <Button onClick={() => setSelectedReturn(null)}>Hủy bỏ</Button>
              <Button
                type="primary"
                className="!bg-purple-600 hover:!bg-purple-700"
                loading={completeMut.isPending}
                onClick={() => {
                  if (!selectedReturn) return;
                  completeMut.mutate({
                    id: selectedReturn.id,
                    adminNote: adminNote.trim() || undefined,
                  });
                }}
              >
                Xác nhận hoàn tất
              </Button>
            </Space>
          ) : (
            <Space>
              <Button onClick={() => setSelectedReturn(null)}>Hủy bỏ</Button>
              <Button
                danger
                type="primary"
                loading={rejectMut.isPending}
                onClick={() => {
                  if (!selectedReturn) return;
                  if (!adminNote.trim()) {
                    message.warning('Vui lòng nhập lý do từ chối để thông báo tới khách hàng');
                    return;
                  }
                  rejectMut.mutate({
                    id: selectedReturn.id,
                    adminNote: adminNote.trim(),
                  });
                }}
              >
                Xác nhận từ chối
              </Button>
            </Space>
          )
        }
      >
        {selectedReturn && (
          <div className="py-2 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 bg-bg-soft p-3 rounded-lg border border-border-subtle">
              <div>
                <span className="text-xs text-ink-3">Mã đơn hàng:</span>
                <p className="font-semibold text-ink">#{selectedReturn.orderId}</p>
              </div>
              <div>
                <span className="text-xs text-ink-3">Khách hàng:</span>
                <p className="font-semibold text-ink">{selectedReturn.customerName || `User #${selectedReturn.userId}`}</p>
              </div>
              <div>
                <span className="text-xs text-ink-3">Thiết bị:</span>
                <p className="font-semibold text-ink">{selectedReturn.phoneName || `Variant #${selectedReturn.phoneVariantId}`}</p>
              </div>
              <div>
                <span className="text-xs text-ink-3">Hình thức xử lý:</span>
                <div>
                  {selectedReturn.type === 'EXCHANGE' ? (
                    <Tag color="blue" className="font-semibold">Đổi 1-1 máy mới</Tag>
                  ) : (
                    <Tag color="orange" className="font-semibold">Trả hàng & Hoàn tiền</Tag>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-1">
                Lý do sự cố & Mô tả:
              </div>
              <div className="p-3 rounded-lg border border-border-subtle bg-white space-y-1">
                <p className="font-medium text-ink">{selectedReturn.reason}</p>
                <p className="text-ink-2 whitespace-pre-wrap">{selectedReturn.errorDescription}</p>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-1">
                Hình ảnh bằng chứng lỗi:
              </div>
              {selectedReturn.proofImages && selectedReturn.proofImages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <Image.PreviewGroup>
                    {selectedReturn.proofImages.map((img, idx) => (
                      <Image
                        key={idx}
                        src={img}
                        width={90}
                        height={90}
                        className="rounded-lg object-cover border border-border-subtle"
                        alt={`proof-${idx}`}
                      />
                    ))}
                  </Image.PreviewGroup>
                </div>
              ) : (
                <div className="text-xs text-ink-3 italic">Không có hình ảnh đính kèm</div>
              )}
            </div>

            {selectedReturn.adminNote && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-xs font-semibold text-amber-800">Ghi chú từ Admin / Kỹ thuật:</span>
                <p className="text-amber-900 mt-1">{selectedReturn.adminNote}</p>
                {selectedReturn.reviewerName && (
                  <p className="text-[11px] text-amber-700 mt-1">Người duyệt: {selectedReturn.reviewerName}</p>
                )}
              </div>
            )}

            {modalMode === 'approve' && (
              <div className="space-y-3 pt-2 border-t border-border-subtle">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  Thông tin phê duyệt
                </div>
                {selectedReturn.type === 'EXCHANGE' && (
                  <div>
                    <label className="text-xs text-ink-2 mb-1 block">
                      Số IMEI máy mới đổi cho khách (Tùy chọn, hệ thống tự cấp nếu để trống):
                    </label>
                    <Input
                      placeholder="VD: 356789123456789..."
                      value={newImeiNumber}
                      onChange={(e) => setNewImeiNumber(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-ink-2 mb-1 block">
                    Ghi chú duyệt (gửi kèm phản hồi khách hàng):
                  </label>
                  <TextArea
                    rows={2}
                    placeholder="VD: Đã tiếp nhận máy và kiểm tra đủ điều kiện 1 đổi 1..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>
              </div>
            )}

            {modalMode === 'complete' && (
              <div className="space-y-3 pt-2 border-t border-border-subtle">
                <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                  Xác nhận hoàn tất
                </div>
                <p className="text-xs text-ink-2">
                  Xác nhận khách hàng đã nhận được máy mới hoặc tiền hoàn đã được xử lý xong. Yêu cầu đổi trả sẽ chuyển sang trạng thái <strong>Hoàn tất (COMPLETED)</strong>.
                </p>
                <div>
                  <label className="text-xs text-ink-2 mb-1 block">
                    Ghi chú hoàn tất (Tùy chọn):
                  </label>
                  <TextArea
                    rows={2}
                    placeholder="VD: Đã giao máy mới kèm hóa đơn bảo hành mới cho khách..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>
              </div>
            )}

            {modalMode === 'reject' && (
              <div className="space-y-3 pt-2 border-t border-border-subtle">
                <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                  Lý do từ chối <span className="text-red-500">*</span>:
                </div>
                <TextArea
                  rows={3}
                  placeholder="Vui lòng nhập lý do từ chối (VD: Thiết bị có dấu hiệu rơi vỡ, ngấm nước vi phạm chính sách bảo hành)..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  required
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

