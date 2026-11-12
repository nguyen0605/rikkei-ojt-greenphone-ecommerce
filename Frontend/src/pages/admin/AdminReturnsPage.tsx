import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select, Space, Table, Tag, message, type TableColumnsType } from 'antd';
import {
  AuditOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { adminReturnService } from '@/services';
import type {
  PageResponse,
  ReturnResponseDTO,
  ReturnReviewRequest,
  ReturnStatus,
} from '@/types/api';
import { formatDate, formatVND } from '@/utils';
import {
  getReturnStatusMeta,
  getReturnTypeMeta,
  isActionableReturnStatus,
  isCompletableReturnStatus,
} from '@/utils/returnStatus';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import ReviewReturnModal from '@/components/admin/ReviewReturnModal';

const RETURN_FILTER_OPTIONS: { value: ReturnStatus; label: string }[] = [
  { value: 'PENDING', label: 'Chờ duyệt (PENDING)' },
  { value: 'APPROVED', label: 'Đã duyệt (APPROVED)' },
  { value: 'COMPLETED', label: 'Hoàn tất (COMPLETED)' },
  { value: 'REJECTED', label: 'Đã từ chối (REJECTED)' },
];

/**
 * Trang Back-office Admin / Kỹ thuật viên thẩm định đổi máy mới và duyệt hoàn tiền.
 */
export default function AdminReturnsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | undefined>();

  const [selectedReturn, setSelectedReturn] = useState<ReturnResponseDTO | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryParams = {
    page: page - 1,
    size: pageSize,
    status: statusFilter,
    keyword: debouncedSearch || undefined,
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-returns', queryParams],
    queryFn: () => adminReturnService.list(queryParams),
  });

  const syncUpdatedRowInCache = (updated: ReturnResponseDTO) => {
    qc.setQueriesData<PageResponse<ReturnResponseDTO>>(
      { queryKey: ['admin-returns'] },
      (old) => {
        if (!old) return old;
        return {
          ...old,
          content: old.content.map((row) => (row.id === updated.id ? updated : row)),
        };
      },
    );
    setSelectedReturn(updated);
    qc.invalidateQueries({ queryKey: ['admin-returns'] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ReturnReviewRequest }) =>
      adminReturnService.approve(id, payload),
    onSuccess: (updated) => {
      syncUpdatedRowInCache(updated);
      setReviewModalOpen(false);
      message.success(
        updated.type === 'EXCHANGE'
          ? `Đã duyệt đổi máy mới cho phiếu ${updated.returnCode} và cập nhật tồn kho`
          : `Đã duyệt hoàn tiền cho phiếu ${updated.returnCode}`,
      );
    },
    onError: (err: Error) => {
      message.error(err.message || 'Không thể phê duyệt yêu cầu đổi trả');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, adminNote }: { id: number; adminNote: string }) =>
      adminReturnService.reject(id, { adminNote }),
    onSuccess: (updated) => {
      syncUpdatedRowInCache(updated);
      setReviewModalOpen(false);
      message.success(`Đã từ chối yêu cầu ${updated.returnCode}`);
    },
    onError: (err: Error) => {
      message.error(err.message || 'Không thể từ chối yêu cầu đổi trả');
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ReturnReviewRequest }) =>
      adminReturnService.complete(id, payload),
    onSuccess: (updated) => {
      syncUpdatedRowInCache(updated);
      setReviewModalOpen(false);
      message.success(`Đã xác nhận hoàn tất yêu cầu ${updated.returnCode}`);
    },
    onError: (err: Error) => {
      message.error(err.message || 'Không thể hoàn tất yêu cầu đổi trả');
    },
  });

  const handleOpenReview = (record: ReturnResponseDTO) => {
    setSelectedReturn(record);
    setReviewModalOpen(true);
  };

  const columns: TableColumnsType<ReturnResponseDTO> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'returnCode',
      key: 'returnCode',
      width: 170,
      render: (code: string, record) => (
        <div>
          <div className="font-mono font-semibold text-ink">{code}</div>
          <div className="text-xs text-ink-2">Đơn hàng #{record.orderId}</div>
        </div>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 170,
      render: (name: string | null) => (
        <span className="font-medium text-ink">{name || 'Khách hàng'}</span>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      width: 135,
      render: (phone: string | null) => (
        <span className="font-mono text-ink-2">{phone || '—'}</span>
      ),
    },
    {
      title: 'Sản phẩm cần đổi trả',
      key: 'product',
      render: (_, record) => {
        const typeMeta = getReturnTypeMeta(record.type);
        return (
          <div className="space-y-1">
            <div className="font-medium text-ink">
              {record.phoneName || 'Sản phẩm không xác định'}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
              {record.variantSku && (
                <span className="font-mono">{record.variantSku}</span>
              )}
              <Tag color={typeMeta.color} className="!m-0 !rounded-full !border-0 !text-[11px]">
                {typeMeta.label}
              </Tag>
              {record.type === 'REFUND' && record.refundAmount > 0 && (
                <span className="font-medium text-emerald-700">
                  {formatVND(record.refundAmount)}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => (date ? formatDate(date) : '—'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => {
        const meta = getReturnStatusMeta(status);
        return (
          <Tag
            color={meta.color}
            className="!rounded-full !border-0 !px-2.5 !py-0.5 !text-xs !font-medium"
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => {
        const actionable = isActionableReturnStatus(record.status);
        const completable = isCompletableReturnStatus(record.status);
        return (
          <Button
            type={actionable ? 'primary' : 'default'}
            size="small"
            icon={
              actionable ? (
                <AuditOutlined />
              ) : completable ? (
                <CheckCircleOutlined />
              ) : (
                <EyeOutlined />
              )
            }
            onClick={() => handleOpenReview(record)}
            data-testid={`review-return-${record.id}`}
          >
            {actionable ? 'Thẩm định' : completable ? 'Hoàn tất' : 'Chi tiết'}
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Thẩm định Đổi trả & Hoàn tiền"
        subtitle="Kiểm tra lỗi phần cứng từ ảnh minh chứng, xuất kho đổi máy mới hoặc phê duyệt hoàn tiền"
        actions={
          <Button
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
          >
            Làm mới
          </Button>
        }
      />

      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Space wrap className="w-full sm:w-auto">
            <Input
              allowClear
              prefix={<SearchOutlined className="text-ink-2" />}
              placeholder="Tìm mã đơn, mã phiếu hoặc số điện thoại..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full sm:w-80"
              data-testid="returns-search-input"
            />
            <Select
              allowClear
              placeholder="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={RETURN_FILTER_OPTIONS}
              className="w-full sm:w-56"
              data-testid="returns-status-select"
            />
          </Space>

          <div className="text-xs text-ink-2">
            Tổng cộng: <span className="font-semibold text-ink">{data?.totalElements ?? 0}</span> phiếu
          </div>
        </div>

        <Table<ReturnResponseDTO>
          rowKey="id"
          columns={columns}
          dataSource={data?.content ?? []}
          loading={isLoading}
          scroll={{ x: 960 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.totalElements ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 15, 30, 50],
            showTotal: (total) => `${total} yêu cầu đổi trả`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </AdminCard>

      <ReviewReturnModal
        open={reviewModalOpen}
        returnItem={selectedReturn}
        approving={approveMutation.isPending}
        rejecting={rejectMutation.isPending}
        completing={completeMutation.isPending}
        onClose={() => {
          if (
            !approveMutation.isPending &&
            !rejectMutation.isPending &&
            !completeMutation.isPending
          ) {
            setReviewModalOpen(false);
          }
        }}
        onApprove={async (payload) => {
          if (!selectedReturn) return;
          await approveMutation.mutateAsync({ id: selectedReturn.id, payload });
        }}
        onReject={async (reason) => {
          if (!selectedReturn) return;
          await rejectMutation.mutateAsync({ id: selectedReturn.id, adminNote: reason });
        }}
        onComplete={async (payload) => {
          if (!selectedReturn) return;
          await completeMutation.mutateAsync({ id: selectedReturn.id, payload });
        }}
      />
    </div>
  );
}

