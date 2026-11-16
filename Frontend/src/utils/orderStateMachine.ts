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
 * Thông tin hóa đơn VAT doanh nghiệp
 */
export interface VatInvoiceInfo {
  hasInvoice: boolean;
  companyName: string;
  taxCode: string;
  companyAddress: string;
  invoiceEmail: string;
}

/**
 * Trích xuất thông tin hóa đơn VAT doanh nghiệp từ OrderDTO hoặc Order.note
 */
export const extractVatInvoice = (order?: {
  hasInvoice?: boolean;
  companyName?: string;
  taxCode?: string;
  companyAddress?: string;
  invoiceEmail?: string;
  note?: string | null;
} | null): VatInvoiceInfo => {
  if (!order) {
    return {
      hasInvoice: false,
      companyName: '',
      taxCode: '',
      companyAddress: '',
      invoiceEmail: '',
    };
  }

  // 1. Kiểm tra trực tiếp các trường DTO từ backend
  if (order.companyName && order.companyName.trim().length > 0) {
    return {
      hasInvoice: true,
      companyName: order.companyName.trim(),
      taxCode: (order.taxCode || '').trim(),
      companyAddress: (order.companyAddress || '').trim(),
      invoiceEmail: (order.invoiceEmail || '').trim(),
    };
  }

  // 2. Fallback: Parse tag trong note (ví dụ: [VAT_INVOICE: ...] hoặc [Hóa đơn VAT: ...])
  if (order.note) {
    const vatMatch = order.note.match(/\[(?:Hóa đơn VAT|VAT_INVOICE|VAT):\s*(.*?)\]/i);
    if (vatMatch && vatMatch[1]) {
      const content = vatMatch[1].trim();
      // Try JSON format
      if (content.startsWith('{') && content.endsWith('}')) {
        try {
          const parsed = JSON.parse(content);
          return {
            hasInvoice: true,
            companyName: parsed.companyName || parsed.company || '',
            taxCode: parsed.taxCode || parsed.tax || '',
            companyAddress: parsed.companyAddress || parsed.address || '',
            invoiceEmail: parsed.invoiceEmail || parsed.email || '',
          };
        } catch {
          // ignore json parse error
        }
      }

      // Format key-value: Công ty=..., MST=..., Địa chỉ=..., Email=...
      const segments = content.split(/[;,|]\s*/);
      const kv: Record<string, string> = {};
      segments.forEach((seg) => {
        const idx = seg.indexOf(':') !== -1 ? seg.indexOf(':') : seg.indexOf('=');
        if (idx !== -1) {
          const k = seg.slice(0, idx).trim().toLowerCase();
          const v = seg.slice(idx + 1).trim();
          kv[k] = v;
        }
      });

      const companyName = kv['công ty'] || kv['company'] || kv['tên'] || kv['name'] || '';
      if (companyName) {
        return {
          hasInvoice: true,
          companyName,
          taxCode: kv['mst'] || kv['taxcode'] || kv['mã số thuế'] || '',
          companyAddress: kv['địa chỉ'] || kv['address'] || '',
          invoiceEmail: kv['email'] || '',
        };
      }
    }
  }

  return {
    hasInvoice: Boolean(order.hasInvoice),
    companyName: (order.companyName || '').trim(),
    taxCode: (order.taxCode || '').trim(),
    companyAddress: (order.companyAddress || '').trim(),
    invoiceEmail: (order.invoiceEmail || '').trim(),
  };
};

/**
 * Trích xuất cờ yêu cầu lấy kèm hóa đơn giấy khi giao hàng
 */
export const extractPaperInvoicePreference = (order?: {
  includePaperInvoice?: boolean;
  note?: string | null;
} | null): boolean => {
  if (!order) return false;
  if (typeof order.includePaperInvoice === 'boolean') {
    return order.includePaperInvoice;
  }
  if (order.note && /\[(?:KÈM_HÓA_ĐƠN_GIẤY|PAPER_INVOICE|YÊU CẦU HÓA ĐƠN GIẤY)\]/i.test(order.note)) {
    return true;
  }
  return false;
};

/**
 * Lấy ghi chú thuần túy của khách hàng (loại bỏ tag [Lý do hủy: ...], [Hóa đơn VAT: ...] và [KÈM_HÓA_ĐƠN_GIẤY] nếu có).
 */
export const extractCustomerNote = (note?: string | null): string | null => {
  if (!note) return null;
  const cleaned = note
    .replace(/\[Lý do hủy:\s*.*?\]/gi, '')
    .replace(/\[(?:Hóa đơn VAT|VAT_INVOICE|VAT):\s*.*?\]/gi, '')
    .replace(/\[(?:KÈM_HÓA_ĐƠN_GIẤY|PAPER_INVOICE|YÊU CẦU HÓA ĐƠN GIẤY)\]/gi, '')
    .replace(/\[(?:YÊU CẦU HOÀN TIỀN|REFUND).*?\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 0 ? cleaned : null;
};

