import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  message,
  type TableColumnsType,
} from 'antd';
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { adminWarrantyClaimService } from '@/services';
import type {
  ClaimStatus,
  HardwareIssueType,
  UpdateClaimStatusRequest,
  WarrantyClaimCreateRequest,
  WarrantyClaimResponseDTO,
} from '@/types/api';
import { formatDate, formatVND } from '@/utils';
import {
  CLAIM_STATUS_META,
  HARDWARE_ISSUE_LABEL,
  getClaimStatusMeta,
} from '@/utils/returnStatus';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';

const { TextArea } = Input;

const CLAIM_STATUS_OPTIONS: { value: ClaimStatus; label: string }[] = (
  Object.keys(CLAIM_STATUS_META) as ClaimStatus[]
).map((key) => ({
  value: key,
  label: CLAIM_STATUS_META[key].label,
}));

const ISSUE_TYPE_OPTIONS: { value: HardwareIssueType; label: string }[] = (
  Object.keys(HARDWARE_ISSUE_LABEL) as HardwareIssueType[]
).map((key) => ({
  value: key,
  label: HARDWARE_ISSUE_LABEL[key],
}));

/**
 * Trang quản lý tiếp nhận sửa chữa và xử lý phiếu bảo hành theo IMEI
 * (dành cho Kỹ thuật viên / Thủ kho & Admin).
 */
export default function AdminWarrantyClaimsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | undefined>();
  const [searchKeyword, setSearchKeyword] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<WarrantyClaimResponseDTO | null>(null);
  const [statusItem, setStatusItem] = useState<WarrantyClaimResponseDTO | null>(null);

  const [createForm] = Form.useForm<WarrantyClaimCreateRequest>();
  const [statusForm] = Form.useForm<UpdateClaimStatusRequest>();

  const { data: claims = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-warranty-claims', statusFilter],
    queryFn: () => adminWarrantyClaimService.list(statusFilter),
  });

  const filteredClaims = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    if (!q) return claims;
    return claims.filter((item) =>
      [
        item.claimCode,
        item.imeiNumber,
        item.customerName,
        item.customerPhone,
        item.productName,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q)),
    );
  }, [claims, searchKeyword]);

  const createMutation = useMutation({
    mutationFn: (payload: WarrantyClaimCreateRequest) =>
      adminWarrantyClaimService.create(payload),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['admin-warranty-claims'] });
      setCreateOpen(false);
      createForm.resetFields();
      message.success(`Đã tiếp nhận phiếu bảo hành ${created.claimCode}`);
    },
    onError: (err: Error) => {
      message.error(err.message || 'Không thể tiếp nhận phiếu bảo hành');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClaimStatusRequest }) =>
      adminWarrantyClaimService.updateStatus(id, data),
    onSuccess: (updated) => {
      qc.setQueriesData<WarrantyClaimResponseDTO[]>(
        { queryKey: ['admin-warranty-claims'] },
        (old) => (old ? old.map((row) => (row.id === updated.id ? updated : row)) : old),
      );
      qc.invalidateQueries({ queryKey: ['admin-warranty-claims'] });
      if (detailItem?.id === updated.id) {
        setDetailItem(updated);
      }
      setStatusItem(null);
      statusForm.resetFields();
      message.success(`Đã cập nhật trạng thái phiếu ${updated.claimCode}`);
    },
    onError: (err: Error) => {
      message.error(err.message || 'Không thể cập nhật trạng thái bảo hành');
    },
  });

  const openUpdateStatus = (record: WarrantyClaimResponseDTO) => {
    setStatusItem(record);
    statusForm.setFieldsValue({
      status: undefined,
      resolution: record.resolution || '',
      note: '',
    });
  };

  const columns: TableColumnsType<WarrantyClaimResponseDTO> = [
    {
      title: 'Mã RMA',
      dataIndex: 'claimCode',
      key: 'claimCode',
      width: 185,
      render: (code: string, record) => (
        <div>
          <div className="font-mono font-semibold text-ink">{code}</div>
          <div className="font-mono text-xs text-ink-2">IMEI: {record.imeiNumber}</div>
        </div>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 170,
      render: (_, record) => (
        <div>
          <div className="font-medium text-ink">{record.customerName || 'Khách hàng'}</div>
          <div className="font-mono text-xs text-ink-2">{record.customerPhone || '—'}</div>
        </div>
      ),
    },
    {
      title: 'Thiết bị & Lỗi phần cứng',
      key: 'issue',
      render: (_, record) => (
        <div className="space-y-0.5">
          <div className="font-medium text-ink">{record.productName || 'Thiết bị'}</div>
          <div className="text-xs text-ink-2">
            <Tag className="!mr-1.5 !text-[11px]">
              {HARDWARE_ISSUE_LABEL[record.hardwareIssueType] || record.hardwareIssueType}
            </Tag>
            {record.issueDescription}
          </div>
        </div>
      ),
    },
    {
      title: 'Bảo hành',
      key: 'isUnderWarranty',
      width: 130,
      render: (_, record) => (
        <Tag
          color={record.isUnderWarranty ? 'green' : 'volcano'}
          className="!rounded-full !border-0 !text-xs"
        >
          {record.isUnderWarranty ? 'Trong hạn BH' : 'Hết hạn BH'}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: ClaimStatus) => {
        const meta = getClaimStatusMeta(status);
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
      title: 'Ngày tiếp nhận',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (d: string) => (d ? formatDate(d) : '—'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 190,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailItem(record)}
          >
            Chi tiết
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openUpdateStatus(record)}
          >
            Xử lý
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Tiếp nhận & Sửa chữa Bảo hành IMEI"
        subtitle="Tra cứu lịch sử bảo hành theo IMEI 15 số, lập phiếu RMA và cập nhật tiến trình sửa chữa"
        actions={
          <Space>
            <Button
              icon={<ReloadOutlined spin={isFetching} />}
              onClick={() => refetch()}
            >
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              Tiếp nhận máy bảo hành
            </Button>
          </Space>
        }
      />

      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Space wrap className="w-full sm:w-auto">
            <Input
              allowClear
              prefix={<SearchOutlined className="text-ink-2" />}
              placeholder="Tìm theo IMEI, mã RMA, SĐT hoặc tên khách..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full sm:w-80"
            />
            <Select
              allowClear
              placeholder="Lọc trạng thái sửa chữa"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={CLAIM_STATUS_OPTIONS}
              className="w-full sm:w-52"
            />
          </Space>
          <div className="text-xs text-ink-2">
            Hiển thị <span className="font-semibold text-ink">{filteredClaims.length}</span> phiếu
          </div>
        </div>

        <Table<WarrantyClaimResponseDTO>
          rowKey="id"
          columns={columns}
          dataSource={filteredClaims}
          loading={isLoading}
          scroll={{ x: 980 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} phiếu bảo hành`,
          }}
        />
      </AdminCard>

      {/* Modal tạo phiếu tiếp nhận theo IMEI */}
      <Modal
        open={createOpen}
        title="Tiếp nhận phiếu sửa chữa bảo hành theo IMEI"
        okText="Tạo phiếu RMA"
        cancelText="Hủy"
        confirmLoading={createMutation.isPending}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        destroyOnHidden
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item
            name="imeiNumber"
            label="Số IMEI (15 chữ số)"
            rules={[
              { required: true, message: 'Vui lòng nhập số IMEI của thiết bị' },
              { pattern: /^[0-9]{15}$/, message: 'Số IMEI phải gồm đúng 15 chữ số' },
            ]}
          >
            <Input maxLength={15} placeholder="Ví dụ: 356938035643809" />
          </Form.Item>

          <Form.Item
            name="hardwareIssueType"
            label="Nhóm lỗi phần cứng"
            rules={[{ required: true, message: 'Vui lòng chọn nhóm lỗi phần cứng' }]}
          >
            <Select options={ISSUE_TYPE_OPTIONS} placeholder="Chọn bộ phận lỗi" />
          </Form.Item>

          <Form.Item
            name="issueDescription"
            label="Mô tả tình trạng máy & lỗi kỹ thuật"
            rules={[{ required: true, message: 'Vui lòng mô tả lỗi tiếp nhận' }]}
          >
            <TextArea rows={3} maxLength={500} showCount placeholder="Mô tả chi tiết lỗi khách phản ánh và ngoại quan máy..." />
          </Form.Item>

          <Form.Item name="repairCost" label="Chi phí sửa chữa dự kiến (VND - nếu ngoài bảo hành)">
            <InputNumber<number>
              min={0}
              className="!w-full"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => Number(v?.replace(/,/g, '') || 0)}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item name="customerNote" label="Ghi chú bàn giao của khách">
            <Input maxLength={255} placeholder="Phụ kiện đi kèm, mật khẩu mở khóa test máy..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal cập nhật tiến trình */}
      <Modal
        open={Boolean(statusItem)}
        title={`Cập nhật tiến trình phiếu ${statusItem?.claimCode || ''}`}
        okText="Lưu tiến trình"
        cancelText="Hủy"
        confirmLoading={updateStatusMutation.isPending}
        onCancel={() => setStatusItem(null)}
        onOk={() => statusForm.submit()}
        destroyOnHidden
      >
        <Form
          form={statusForm}
          layout="vertical"
          onFinish={(values) => {
            if (!statusItem) return;
            updateStatusMutation.mutate({ id: statusItem.id, data: values });
          }}
        >
          <Form.Item
            name="status"
            label="Trạng thái mới"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái tiếp theo' }]}
          >
            <Select
              placeholder="Chọn trạng thái xử lý"
              options={CLAIM_STATUS_OPTIONS.filter(
                (opt) => opt.value !== statusItem?.status,
              )}
            />
          </Form.Item>

          <Form.Item name="resolution" label="Hướng xử lý / Kết luận sửa chữa">
            <TextArea
              rows={3}
              maxLength={500}
              placeholder="Ví dụ: Thay cụm màn hình chính hãng, test cảm ứng và TrueTone đạt chuẩn."
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú lưu vết lịch sử">
            <Input maxLength={255} placeholder="Ghi chú nội bộ KTV..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal chi tiết & timeline */}
      <Modal
        open={Boolean(detailItem)}
        onCancel={() => setDetailItem(null)}
        footer={
          <Button onClick={() => setDetailItem(null)}>Đóng</Button>
        }
        width={720}
        title={`Hồ sơ bảo hành ${detailItem?.claimCode || ''}`}
      >
        {detailItem && (
          <div className="space-y-4 pt-2">
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="IMEI">
                <span className="font-mono font-semibold">{detailItem.imeiNumber}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={getClaimStatusMeta(detailItem.status).color} className="!border-0">
                  {getClaimStatusMeta(detailItem.status).label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">
                {detailItem.customerName || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {detailItem.customerPhone || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Thiết bị" span={2}>
                {detailItem.productName || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Chi phí dự kiến">
                {detailItem.repairCost ? formatVND(detailItem.repairCost) : 'Miễn phí (Theo BH)'}
              </Descriptions.Item>
              <Descriptions.Item label="Hạn bảo hành">
                {detailItem.warrantyEndDate ? formatDate(detailItem.warrantyEndDate) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Mô tả lỗi" span={2}>
                {detailItem.issueDescription}
              </Descriptions.Item>
              {detailItem.resolution && (
                <Descriptions.Item label="Kết luận xử lý" span={2}>
                  {detailItem.resolution}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div>
              <div className="mb-3 text-sm font-semibold text-ink">
                Nhật ký tiến trình xử lý
              </div>
              <Timeline
                items={(detailItem.histories || []).map((h) => ({
                  key: h.id,
                  content: (
                    <div className="text-sm">
                      <div className="font-medium text-ink">
                        {h.fromStatus ? `${getClaimStatusMeta(h.fromStatus).label} → ` : ''}
                        {getClaimStatusMeta(h.toStatus).label}
                      </div>
                      {h.note && <div className="text-ink-2">{h.note}</div>}
                      <div className="text-xs text-ink-2">
                        {h.performedByName || 'Hệ thống'} ·{' '}
                        {h.createdAt ? formatDate(h.createdAt) : ''}
                      </div>
                    </div>
                  ),
                }))}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

