import type {
  ClaimStatus,
  HardwareIssueType,
  ReturnStatus,
  ReturnType,
} from '@/types/api';

export interface StatusMeta {
  label: string;
  color: string;
}

export const RETURN_STATUS_META: Record<ReturnStatus, StatusMeta> = {
  PENDING: { label: 'Chờ duyệt', color: 'gold' },
  UNDER_REVIEW: { label: 'Đang thẩm định', color: 'gold' },
  APPROVED: { label: 'Đã duyệt', color: 'green' },
  COMPLETED: { label: 'Hoàn tất', color: 'green' },
  REJECTED: { label: 'Đã từ chối', color: 'red' },
};

export const RETURN_TYPE_META: Record<ReturnType, StatusMeta> = {
  EXCHANGE: { label: 'Đổi máy mới', color: 'blue' },
  REFUND: { label: 'Hoàn tiền', color: 'purple' },
};

export const CLAIM_STATUS_META: Record<ClaimStatus, StatusMeta> = {
  SUBMITTED: { label: 'Đã tiếp nhận', color: 'gold' },
  IN_INSPECTION: { label: 'Đang kiểm tra', color: 'blue' },
  REPAIRING: { label: 'Đang sửa chữa', color: 'geekblue' },
  COMPLETED: { label: 'Hoàn thành', color: 'green' },
  REJECTED: { label: 'Từ chối', color: 'red' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};

export const HARDWARE_ISSUE_LABEL: Record<HardwareIssueType, string> = {
  SCREEN: 'Màn hình / Cảm ứng',
  BATTERY: 'Pin / Sạc / Nguồn',
  MOTHERBOARD: 'Bo mạch chủ (Mainboard)',
  CAMERA: 'Camera',
  SPEAKER: 'Loa / Micro',
  OTHER: 'Lỗi phần cứng khác',
};

export function getReturnStatusMeta(status?: string): StatusMeta {
  if (status && status in RETURN_STATUS_META) {
    return RETURN_STATUS_META[status as ReturnStatus];
  }
  return { label: status || 'Không xác định', color: 'default' };
}

export function getReturnTypeMeta(type?: string): StatusMeta {
  if (type && type in RETURN_TYPE_META) {
    return RETURN_TYPE_META[type as ReturnType];
  }
  return { label: type || 'Không xác định', color: 'default' };
}

export function getClaimStatusMeta(status?: string): StatusMeta {
  if (status && status in CLAIM_STATUS_META) {
    return CLAIM_STATUS_META[status as ClaimStatus];
  }
  return { label: status || 'Không xác định', color: 'default' };
}

export function isActionableReturnStatus(status?: string): boolean {
  return status === 'PENDING' || status === 'UNDER_REVIEW';
}

export function isCompletableReturnStatus(status?: string): boolean {
  return status === 'APPROVED';
}

