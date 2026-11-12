import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Empty,
  Image,
  Input,
  Modal,
  Popconfirm,
  Tag,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  SwapOutlined,
  ZoomInOutlined,
} from '@ant-design/icons';
import type { ReturnResponseDTO, ReturnReviewRequest } from '@/types/api';
import { formatDate, formatVND } from '@/utils';
import {
  getReturnStatusMeta,
  getReturnTypeMeta,
  isActionableReturnStatus,
} from '@/utils/returnStatus';
import RejectReasonModal from './RejectReasonModal';

const { TextArea } = Input;

interface ReviewReturnModalProps {
  open: boolean;
  returnItem: ReturnResponseDTO | null;
  approving?: boolean;
  rejecting?: boolean;
  onClose: () => void;
  onApprove: (payload: ReturnReviewRequest) => void | Promise<void>;
  onReject: (reason: string) => void | Promise<void>;
}

/**
 * Modal thẩm định kỹ thuật yêu cầu đổi trả / hoàn tiền.
 * Hỗ trợ phóng to ảnh lỗi Cloudflare R2, nhập ghi chú kỹ thuật, IMEI đổi mới
 * và thực hiện duyệt / từ chối kèm Popconfirm xác nhận.
 */
export default function ReviewReturnModal({
  open,
  returnItem,
  approving = false,
  rejecting = false,
  onClose,
  onApprove,
  onReject,
}: ReviewReturnModalProps) {
  const [adminNote, setAdminNote] = useState('');
  const [newImeiNumber, setNewImeiNumber] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  useEffect(() => {
    if (open && returnItem) {
      setAdminNote(returnItem.adminNote || '');
      setNewImeiNumber('');
      setRejectModalOpen(false);
    }
  }, [open, returnItem]);

  if (!returnItem) return null;

  const statusMeta = getReturnStatusMeta(returnItem.status);
  const typeMeta = getReturnTypeMeta(returnItem.type);
  const canProcess = isActionableReturnStatus(returnItem.status);
  const isExchange = returnItem.type === 'EXCHANGE';
  const isRefund = returnItem.type === 'REFUND';
  const busy = approving || rejecting;
  const images = returnItem.proofImages || [];

  const handleApproveSubmit = () => {
    const payload: ReturnReviewRequest = {};
    if (adminNote.trim()) payload.adminNote = adminNote.trim();
    if (isExchange && newImeiNumber.trim()) payload.newImeiNumber = newImeiNumber.trim();
    onApprove(payload);
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        width={820}
        title={
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <span className="text-base font-bold text-ink">
              Thẩm định phiếu {returnItem.returnCode}
            </span>
            <Tag color={typeMeta.color} className="!rounded-full !border-0 !font-medium">
              {typeMeta.label}
            </Tag>
            <Tag color={statusMeta.color} className="!rounded-full !border-0 !font-medium">
              {statusMeta.label}
            </Tag>
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button onClick={onClose} disabled={busy}>
              Đóng
            </Button>

            {canProcess && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  disabled={busy}
                  onClick={() => setRejectModalOpen(true)}
                  data-testid="open-reject-modal-btn"
                >
                  Từ Chối Tiếp Nhận
                </Button>

                {isExchange ? (
                  <Popconfirm
                    title="Xác nhận duyệt đổi máy mới?"
                    description="Hệ thống sẽ tự động trừ 1 sản phẩm tồn kho, hủy bảo hành cũ và cấp bảo hành mới."
                    okText="Xác nhận đổi máy"
                    cancelText="Hủy"
                    onConfirm={handleApproveSubmit}
                  >
                    <Button
                      type="primary"
                      icon={<SwapOutlined />}
                      loading={approving}
                      disabled={rejecting}
                      data-testid="approve-exchange-btn"
                    >
                      Duyệt Đổi Máy Mới
                    </Button>
                  </Popconfirm>
                ) : (
                  <Tooltip title="Phiếu này là yêu cầu Hoàn tiền, không áp dụng đổi máy mới">
                    <Button icon={<SwapOutlined />} disabled>
                      Duyệt Đổi Máy Mới
                    </Button>
                  </Tooltip>
                )}

                {isRefund ? (
                  <Popconfirm
                    title="Xác nhận duyệt hoàn tiền?"
                    description={`Hệ thống sẽ tạo lệnh hoàn ${formatVND(returnItem.refundAmount || 0)} về tài khoản khách hàng và cập nhật trạng thái đơn.`}
                    okText="Xác nhận hoàn tiền"
                    cancelText="Hủy"
                    onConfirm={handleApproveSubmit}
                  >
                    <Button
                      type="primary"
                      icon={<DollarOutlined />}
                      loading={approving}
                      disabled={rejecting}
                      className="!bg-emerald-600 hover:!bg-emerald-700"
                      data-testid="approve-refund-btn"
                    >
                      Duyệt Hoàn Tiền
                    </Button>
                  </Popconfirm>
                ) : (
                  <Tooltip title="Phiếu này là yêu cầu Đổi máy mới, không áp dụng hoàn tiền">
                    <Button icon={<DollarOutlined />} disabled>
                      Duyệt Hoàn Tiền
                    </Button>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        }
        destroyOnHidden
      >
        <div className="space-y-4 pt-2">
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Mã phiếu">
              <span className="font-mono font-semibold text-ink">{returnItem.returnCode}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Mã đơn hàng">
              <span className="font-mono font-medium">#{returnItem.orderId}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Khách hàng">
              {returnItem.customerName || 'Khách hàng'}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {returnItem.customerPhone || 'Chưa cập nhật'}
            </Descriptions.Item>
            <Descriptions.Item label="Sản phẩm đổi trả" span={2}>
              <span className="font-medium text-ink">
                {returnItem.phoneName || 'Sản phẩm'}
              </span>
              {returnItem.variantSku && (
                <Tag className="!ml-2 !font-mono !text-xs">{returnItem.variantSku}</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Giá trị hoàn dự kiến">
              <span className="font-semibold text-emerald-700">
                {formatVND(returnItem.refundAmount || 0)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày gửi yêu cầu">
              {returnItem.createdAt ? formatDate(returnItem.createdAt) : '—'}
            </Descriptions.Item>
          </Descriptions>

          <div className="rounded-xl border border-rule bg-bg-soft p-3.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-2">
              Thông tin lỗi từ khách hàng
            </div>
            <div className="mt-2 text-sm">
              <span className="font-medium text-ink">Lý do: </span>
              <span className="text-ink">{returnItem.reason}</span>
            </div>
            <div className="mt-1.5 whitespace-pre-line text-sm text-ink-2">
              <span className="font-medium text-ink">Mô tả chi tiết: </span>
              {returnItem.errorDescription}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">
                Hình ảnh minh chứng lỗi (Cloudflare R2)
              </span>
              {images.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-ink-2">
                  <ZoomInOutlined />
                  Nhấn vào ảnh để phóng to chất lượng cao
                </span>
              )}
            </div>

            {images.length > 0 ? (
              <Image.PreviewGroup>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="overflow-hidden rounded-xl border border-rule bg-bg-soft p-1"
                    >
                      <Image
                        src={url}
                        alt={`Ảnh lỗi #${idx + 1} - ${returnItem.returnCode}`}
                        className="!h-28 !w-full rounded-lg object-cover"
                        preview={{ mask: 'Phóng to' }}
                      />
                    </div>
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <div className="rounded-xl border border-dashed border-rule py-4">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Khách hàng chưa đính kèm hình ảnh lỗi"
                />
              </div>
            )}
          </div>

          <Divider className="!my-3" />

          {canProcess ? (
            <div className="space-y-3">
              {isExchange && (
                <div>
                  <label
                    htmlFor="exchange-new-imei"
                    className="mb-1 block text-sm font-medium text-ink"
                  >
                    Số IMEI máy mới xuất kho (tùy chọn)
                  </label>
                  <Input
                    id="exchange-new-imei"
                    value={newImeiNumber}
                    maxLength={20}
                    onChange={(e) => setNewImeiNumber(e.target.value)}
                    placeholder="Nhập số IMEI máy mới (15 số); để trống nếu hệ thống tự sinh"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="admin-technical-note"
                  className="mb-1 block text-sm font-medium text-ink"
                >
                  Kết luận thẩm định kỹ thuật (Admin / KTV)
                </label>
                <TextArea
                  id="admin-technical-note"
                  rows={3}
                  maxLength={255}
                  showCount
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ghi chú tình trạng máy khi kiểm tra thực tế (ngoại quan, test phần cứng, tem niêm phong...)"
                />
              </div>
            </div>
          ) : (
            <Alert
              type={returnItem.status === 'REJECTED' ? 'error' : 'success'}
              showIcon
              icon={
                returnItem.status === 'REJECTED' ? (
                  <CloseCircleOutlined />
                ) : (
                  <CheckCircleOutlined />
                )
              }
              title={`Đã xử lý bởi ${returnItem.reviewerName || 'Quản trị viên'}${
                returnItem.reviewedAt ? ` vào ${formatDate(returnItem.reviewedAt)}` : ''
              }`}
              description={returnItem.adminNote || 'Không có ghi chú kỹ thuật kèm theo.'}
            />
          )}
        </div>
      </Modal>

      <RejectReasonModal
        open={rejectModalOpen}
        returnItem={returnItem}
        initialReason={adminNote}
        loading={rejecting}
        onCancel={() => setRejectModalOpen(false)}
        onConfirm={async (reason) => {
          await onReject(reason);
          setRejectModalOpen(false);
        }}
      />
    </>
  );
}

