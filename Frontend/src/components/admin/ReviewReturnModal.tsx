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
  FileSearchOutlined,
  UserOutlined,
  PhoneOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { ReturnResponseDTO, ReturnReviewRequest } from '@/types/api';
import { formatDate, formatVND } from '@/utils';
import {
  getReturnStatusMeta,
  getReturnTypeMeta,
  isActionableReturnStatus,
  isCompletableReturnStatus,
} from '@/utils/returnStatus';
import RejectReasonModal from './RejectReasonModal';

const { TextArea } = Input;

interface ReviewReturnModalProps {
  open: boolean;
  returnItem: ReturnResponseDTO | null;
  approving?: boolean;
  rejecting?: boolean;
  completing?: boolean;
  onClose: () => void;
  onApprove: (payload: ReturnReviewRequest) => void | Promise<void>;
  onReject: (reason: string) => void | Promise<void>;
  onComplete?: (payload: ReturnReviewRequest) => void | Promise<void>;
}

/**
 * Modal thẩm định kỹ thuật yêu cầu đổi trả / hoàn tiền.
 * Hỗ trợ phóng to ảnh lỗi Cloudflare R2, nhập ghi chú kỹ thuật, IMEI đổi mới
 * và thực hiện duyệt / từ chối / hoàn tất kèm Popconfirm xác nhận.
 */
export default function ReviewReturnModal({
  open,
  returnItem,
  approving = false,
  rejecting = false,
  completing = false,
  onClose,
  onApprove,
  onReject,
  onComplete,
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
  const canComplete = isCompletableReturnStatus(returnItem.status);
  const isExchange = returnItem.type === 'EXCHANGE';
  const isRefund = returnItem.type === 'REFUND';
  const busy = approving || rejecting || completing;
  const images = returnItem.proofImages || [];

  const handleApproveSubmit = () => {
    const payload: ReturnReviewRequest = {};
    if (adminNote.trim()) payload.adminNote = adminNote.trim();
    if (isExchange && newImeiNumber.trim()) payload.newImeiNumber = newImeiNumber.trim();
    onApprove(payload);
  };

  const handleCompleteSubmit = () => {
    if (!onComplete) return;
    const payload: ReturnReviewRequest = {};
    if (adminNote.trim()) payload.adminNote = adminNote.trim();
    onComplete(payload);
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        width={860}
        centered
        className="[&_.ant-modal-content]:!rounded-2xl [&_.ant-modal-content]:!p-6 [&_.ant-modal-content]:!shadow-2xl"
        title={
          <div className="flex flex-wrap items-center justify-between border-b border-gray-100 pb-3 pr-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FileSearchOutlined className="text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">
                    Thẩm định phiếu {returnItem.returnCode}
                  </span>
                  <Tag color={typeMeta.color} className="!rounded-full !px-2.5 !py-0.5 !font-semibold !text-xs !border-0">
                    {typeMeta.label}
                  </Tag>
                  <Tag color={statusMeta.color} className="!rounded-full !px-2.5 !py-0.5 !font-semibold !text-xs !border-0">
                    {statusMeta.label}
                  </Tag>
                </div>
                <p className="text-xs text-gray-400 font-normal mt-0.5">
                  Đơn hàng #{returnItem.orderId} • Ngày gửi: {returnItem.createdAt ? formatDate(returnItem.createdAt) : '—'}
                </p>
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <Button onClick={onClose} disabled={busy} className="!rounded-xl">
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
                  className="!rounded-xl"
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
                      className="!rounded-xl !bg-blue-600 hover:!bg-blue-700 shadow-sm font-medium"
                      data-testid="approve-exchange-btn"
                    >
                      Duyệt Đổi Máy Mới
                    </Button>
                  </Popconfirm>
                ) : (
                  <Tooltip title="Phiếu này là yêu cầu Hoàn tiền, không áp dụng đổi máy mới">
                    <Button icon={<SwapOutlined />} disabled className="!rounded-xl">
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
                      className="!rounded-xl !bg-emerald-600 hover:!bg-emerald-700 shadow-sm font-medium"
                      data-testid="approve-refund-btn"
                    >
                      Duyệt Hoàn Tiền
                    </Button>
                  </Popconfirm>
                ) : (
                  <Tooltip title="Phiếu này là yêu cầu Đổi máy mới, không áp dụng hoàn tiền">
                    <Button icon={<DollarOutlined />} disabled className="!rounded-xl">
                      Duyệt Hoàn Tiền
                    </Button>
                  </Tooltip>
                )}
              </div>
            )}

            {canComplete && onComplete && (
              <Popconfirm
                title="Xác nhận hoàn tất quy trình đổi trả?"
                description="Xác nhận khách đã nhận máy mới hoặc tiền hoàn đã được chi trả thành công."
                okText="Hoàn tất"
                cancelText="Hủy"
                onConfirm={handleCompleteSubmit}
              >
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={completing}
                  className="!rounded-xl !bg-purple-600 hover:!bg-purple-700 shadow-sm font-medium"
                  data-testid="complete-return-btn"
                >
                  Xác Nhận Hoàn Tất
                </Button>
              </Popconfirm>
            )}
          </div>
        }
        destroyOnHidden
      >
        <div className="space-y-4 pt-1">
          {/* Card Thông tin đối soát 2 cột dạng Card hiện đại */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Cột 1: Thông tin khách hàng & Đơn */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <UserOutlined className="text-emerald-600" /> Thông tin đơn hàng & Khách
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                    #{returnItem.orderId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Khách hàng:</span>
                  <span className="font-semibold text-gray-900">{returnItem.customerName || 'Khách hàng'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Số điện thoại:</span>
                  <span className="font-medium text-gray-700 font-mono">{returnItem.customerPhone || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>

            {/* Cột 2: Thông tin sản phẩm & Giá trị hoàn */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <ShoppingOutlined className="text-emerald-600" /> Sản phẩm xử lý
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="font-bold text-gray-900 text-sm block">
                    {returnItem.phoneName || 'Sản phẩm'}
                  </span>
                  {returnItem.variantSku && (
                    <Tag color="cyan" className="!mt-1 !font-mono !text-xs !border-0 !rounded-md">
                      SKU: {returnItem.variantSku}
                    </Tag>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                  <span className="text-gray-500">
                    {isRefund ? 'Giá trị hoàn dự kiến:' : 'Hình thức hỗ trợ:'}
                  </span>
                  <span className="font-bold text-sm text-emerald-700">
                    {isRefund ? formatVND(returnItem.refundAmount || 0) : 'Đổi 1 máy mới tương đương'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Khối Thông tin lỗi từ khách hàng */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800">
              <ExclamationCircleOutlined className="text-amber-600 text-sm" />
              Thông tin lỗi từ khách hàng
            </div>
            <div className="text-sm">
              <span className="font-semibold text-gray-700">Lý do báo lỗi: </span>
              <span className="font-medium text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded-md inline-block">
                {returnItem.reason}
              </span>
            </div>
            {returnItem.errorDescription && (
              <div className="rounded-lg bg-white/80 p-3 border border-amber-100 text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                <span className="font-semibold text-gray-700 block mb-1 text-xs uppercase tracking-wide">
                  Mô tả chi tiết sự cố:
                </span>
                {returnItem.errorDescription}
              </div>
            )}
          </div>

          {/* Khối Hình ảnh minh chứng lỗi */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span>Hình ảnh minh chứng lỗi</span>
                <Tag color="blue" className="!rounded-full !border-0 !text-xs !px-2">
                  Cloudflare R2 ({images.length} ảnh)
                </Tag>
              </span>
              {images.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
                  <ZoomInOutlined />
                  Nhấn vào ảnh để phóng to sắc nét
                </span>
              )}
            </div>

            {images.length > 0 ? (
              <Image.PreviewGroup>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm transition-all hover:shadow-md hover:border-emerald-500"
                    >
                      <Image
                        src={url}
                        alt={`Ảnh lỗi #${idx + 1} - ${returnItem.returnCode}`}
                        className="!h-32 !w-full rounded-lg object-cover"
                        preview={{ mask: '🔍 Phóng to ảnh' }}
                      />
                      <div className="mt-1 text-center text-xs text-gray-400 font-medium">
                        Ảnh minh chứng #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white py-6">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<span className="text-xs text-gray-400">Khách hàng không đính kèm hình ảnh minh chứng</span>}
                />
              </div>
            )}
          </div>

          {/* Khối Thao tác nghiệp vụ Kỹ thuật viên / Admin */}
          {canProcess ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 space-y-3.5">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Ý kiến kết luận & Thẩm định kỹ thuật
              </div>

              {isExchange && (
                <div>
                  <label
                    htmlFor="exchange-new-imei"
                    className="mb-1.5 block text-xs font-semibold text-gray-700"
                  >
                    Số IMEI máy mới xuất kho (15 số - tùy chọn):
                  </label>
                  <Input
                    id="exchange-new-imei"
                    value={newImeiNumber}
                    maxLength={20}
                    onChange={(e) => setNewImeiNumber(e.target.value)}
                    placeholder="Nhập số IMEI máy mới (15 số); để trống nếu hệ thống tự sinh mã bảo hành"
                    className="!rounded-xl font-mono !py-2"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="admin-technical-note"
                  className="mb-1.5 block text-xs font-semibold text-gray-700"
                >
                  Kết luận thẩm định kỹ thuật (Admin / Kỹ thuật viên):
                </label>
                <TextArea
                  id="admin-technical-note"
                  rows={3}
                  maxLength={255}
                  showCount
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ghi chú tình trạng kiểm tra máy thực tế (ngoại quan, kiểm tra linh kiện, tem bảo hành niêm phong...)"
                  className="!rounded-xl"
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
              className="!rounded-xl"
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

