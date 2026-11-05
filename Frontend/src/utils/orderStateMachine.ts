export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatusType = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
};

/**
 * State Machine Transition Rules:
 * - PENDING    -> CONFIRMED, CANCELLED
 * - CONFIRMED  -> PROCESSING, CANCELLED
 * - PROCESSING -> SHIPPING, CANCELLED
 * - SHIPPING   -> DELIVERED, CANCELLED
 * - DELIVERED  -> Terminal State (Khóa cứng, không cho chuyển tiếp)
 * - CANCELLED  -> Terminal State (Khóa cứng, không cho chuyển tiếp)
 */
export const ORDER_STATE_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Kiểm tra xem một trạng thái có phải là trạng thái kết thúc (Terminal State) hay không.
 * Nếu là terminal state (DELIVERED hoặc CANCELLED), dropdown phải bị khóa cứng hoàn toàn.
 */
export const isTerminalOrderStatus = (status?: string | null): boolean => {
  if (!status) return false;
  return status === 'DELIVERED' || status === 'CANCELLED';
};

/**
 * Kiểm tra xem chuyển đổi trạng thái từ fromStatus sang toStatus có hợp lệ hay không.
 */
export const isValidOrderStatusTransition = (fromStatus: string, toStatus: string): boolean => {
  if (fromStatus === toStatus) return true;
  const allowedTransitions = ORDER_STATE_TRANSITIONS[fromStatus] || [];
  return allowedTransitions.includes(toStatus);
};

/**
 * Lấy danh sách options hợp lệ cho dropdown cập nhật trạng thái đơn hàng.
 * Chỉ trả về trạng thái hiện tại kèm các trạng thái kế tiếp hợp lệ theo State Machine.
 */
export const getAvailableNextStatusOptions = (
  currentStatus: string
): { value: string; label: string }[] => {
  const nextStates = ORDER_STATE_TRANSITIONS[currentStatus] || [];
  const validStates = [currentStatus, ...nextStates];
  return validStates.map((status) => ({
    value: status,
    label: `${status} (${ORDER_STATUS_LABEL[status] || status})`,
  }));
};

/**
 * Trích xuất lý do hủy từ dữ liệu order.note trả về từ backend (hoàn toàn không dùng localStorage).
 */
export const extractCancelReason = (note?: string | null): string | null => {
  if (!note) return null;
  const match = note.match(/\[Lý do hủy:\s*(.*?)\]/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
};

/**
 * Lấy ghi chú thuần túy của khách hàng (loại bỏ tag [Lý do hủy: ...] nếu có).
 */
export const extractCustomerNote = (note?: string | null): string | null => {
  if (!note) return null;
  const cleaned = note.replace(/\[Lý do hủy:\s*.*?\]/gi, '').trim();
  return cleaned.length > 0 ? cleaned : null;
};

