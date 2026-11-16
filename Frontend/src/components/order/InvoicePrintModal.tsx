import React, { useRef, useEffect } from 'react';
import { Modal, Button, Tag, QRCode } from 'antd';
import {
  Printer,
  Download,
  CheckCircle,
  Clock,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  ShieldCheck,
  FileText,
  Smartphone,
  X,
} from 'lucide-react';
import type { OrderDTO } from '@/types/api';
import { formatVND, formatDate } from '@/utils';
import { formatPaymentMethod } from '@/components/order/orderHelpers';
import { extractVatInvoice, extractCustomerNote } from '@/utils/orderStateMachine';

interface InvoicePrintModalProps {
  open: boolean;
  onClose: () => void;
  order: OrderDTO | null | undefined;
  isAdminView?: boolean;
}

/**
 * Chuyển đổi số tiền thành chữ tiếng Việt chuẩn xác cho hóa đơn
 */
function numberToVietnameseWords(num?: number): string {
  if (!num || num <= 0) return 'Không đồng';
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroup(group: number): string {
    const hundred = Math.floor(group / 100);
    const ten = Math.floor((group % 100) / 10);
    const unit = group % 10;
    let res = '';

    if (hundred > 0 || ten > 0 || unit > 0) {
      res += digits[hundred] + ' trăm ';
      if (ten === 0 && unit > 0) {
        res += 'lẻ ' + digits[unit];
      } else if (ten === 1) {
        res += 'mười ' + (unit === 5 ? 'lăm' : unit > 0 ? digits[unit] : '');
      } else if (ten > 1) {
        res += digits[ten] + ' mươi ' + (unit === 1 ? 'mốt' : unit === 5 ? 'lăm' : unit > 0 ? digits[unit] : '');
      }
    }
    return res.trim();
  }

  let n = Math.floor(num);
  let groupIdx = 0;
  const groups: string[] = [];

  while (n > 0) {
    const group = n % 1000;
    if (group > 0) {
      const gStr = readGroup(group);
      groups.unshift(gStr + ' ' + units[groupIdx]);
    }
    n = Math.floor(n / 1000);
    groupIdx++;
  }

  let result = groups.join(' ').replace(/\s+/g, ' ').trim();
  result = result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn.';
  return result;
}

/**
 * In hóa đơn qua hidden iframe độc lập giúp cô lập hoàn toàn nội dung in,
 * loại bỏ nền trang admin/drawer phía sau và ngăn chặn 100% lỗi trắng trang.
 */
function printInvoiceElement(element: HTMLElement, title = 'Hoa_Don_GreenPhone') {
  if (typeof window === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.setAttribute(
    'style',
    'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; opacity: 0; pointer-events: none;'
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
          #greenphone-invoice-print-area {
            width: 100% !important;
            margin: 0 !important;
            padding: 2mm 3mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #374151 !important;
          }
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      if (iframe.contentWindow?.print) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else {
        window.print();
      }
    } catch {
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  }, 250);
}

export interface InvoicePrintContentProps {
  order: OrderDTO;
  isAdminView?: boolean;
  printRef?: React.RefObject<HTMLDivElement | null>;
}

export const InvoicePrintContent: React.FC<InvoicePrintContentProps> = ({
  order,
  isAdminView = false,
  printRef,
}) => {
  const vatInfo = extractVatInvoice(order);
  const customerNote = extractCustomerNote(order.note);
  const isPaid = order.paymentStatus === 'PAID';
  const invoiceYear = order.createdAt ? new Date(order.createdAt).getFullYear() : new Date().getFullYear();
  const formattedInvoiceNo = `INV-${invoiceYear}-${String(order.id).padStart(5, '0')}`;
  const invoiceTokenOrId = order.invoiceToken || String(order.id);
  const trackingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/hoa-don/${invoiceTokenOrId}`
    : `https://greenphone.vn/hoa-don/${invoiceTokenOrId}`;

  return (
    <div
      id="greenphone-invoice-print-area"
      ref={printRef}
      className="bg-white text-gray-900 p-4 md:p-6 rounded-xl border border-gray-200 shadow-xs text-xs font-sans"
    >
      {/* 1. Header: Logo, Company Info, Hotline */}
      <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-emerald-700 uppercase">
              GREENPHONE RETAIL
            </h1>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Hệ thống bán lẻ thiết bị di động & công nghệ chính hãng
            </p>
            <div className="mt-1 flex flex-col text-[11px] text-gray-600 space-y-0.5">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-emerald-600" />
                Trụ sở: Tòa nhà GreenPhone, 123 Đường Công Nghệ, Cầu Giấy, Hà Nội
              </span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  Hotline: <strong>1900 6868</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-emerald-600" />
                  cskh@greenphone.vn
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-emerald-600" />
                  greenphone.vn
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Status & Barcode badge */}
        <div className="text-right shrink-0">
          <div className="inline-block border-2 border-emerald-600 px-3 py-1 rounded-md text-emerald-800 font-bold text-xs uppercase bg-emerald-50">
            {isPaid ? 'ĐÃ THANH TOÁN' : 'CHỜ THU HỘ COD'}
          </div>
          <div className="mt-2 text-xs text-gray-500 font-mono">
            Mã số thuế: <strong>0109876543</strong>
          </div>
        </div>
      </div>

      {/* 2. Invoice Title */}
      <div className="text-center my-2">
        <h2 className="text-xl font-black uppercase text-gray-900 tracking-wider">
          {isAdminView
            ? 'HÓA ĐƠN BÁN LẺ KIÊM PHIẾU XUẤT KHO & BẢO HÀNH'
            : 'HÓA ĐƠN ĐIỆN TỬ BÁN LẺ & BẢO HÀNH CHÍNH HÃNG'}
        </h2>
        <p className="text-xs text-gray-500 italic mt-0.5">
          {isAdminView
            ? '(Bản thể hiện dữ liệu điện tử phục vụ giao nhận, đối soát kế toán và bảo hành chính hãng)'
            : '(Hóa đơn điện tử chính thức phục vụ tra cứu bảo hành và quyết toán tài chính trên hệ thống GreenPhone)'}
        </p>
      </div>

      {/* 3. Invoice Meta & Customer Details */}
      <div className="grid grid-cols-2 gap-3 my-2.5 p-3 bg-gray-50/80 rounded-lg border border-gray-200 text-xs">
        {/* Left Column: Invoice Details */}
        <div className="space-y-1.5 border-r border-gray-200 pr-3">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Số hóa đơn:</span>
            <span className="font-bold text-emerald-800 font-mono text-sm">{formattedInvoiceNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Mã đơn hàng:</span>
            <span className="font-bold text-gray-900">#{order.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Ngày đặt hàng:</span>
            <span className="text-gray-800">{formatDate(order.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Phương thức thanh toán:</span>
            <span className="font-semibold text-gray-900">{formatPaymentMethod(order.paymentMethod)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Kho xuất hàng:</span>
            <span className="font-semibold text-gray-900">
              {(order as any).fulfillmentWarehouse?.name || 'Kho Tổng GreenPhone Hà Nội'}
            </span>
          </div>
        </div>

        {/* Right Column: Receiver Details */}
        <div className="space-y-1.5 pl-2">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Khách hàng:</span>
            <span className="font-bold text-gray-900">{order.receiverName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Số điện thoại:</span>
            <span className="font-semibold text-gray-900 font-mono">{order.receiverPhone}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 font-medium">Địa chỉ giao hàng:</span>
            <span className="text-gray-800 font-medium mt-0.5 line-clamp-2">{order.shippingAddress}</span>
          </div>
          {customerNote && (
            <div className="flex flex-col">
              <span className="text-gray-500 font-medium">Ghi chú của khách:</span>
              <span className="text-gray-700 italic mt-0.5">{customerNote}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Corporate VAT Invoice Details (if registered) */}
      {vatInfo.hasInvoice && (
        <div className="my-2.5 p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs avoid-break">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold uppercase mb-1.5">
            <Building2 className="w-4 h-4 text-blue-700" />
            <span>Thông tin xuất hóa đơn giá trị gia tăng (VAT doanh nghiệp)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-800">
            <div>
              <span className="text-gray-500">Tên đơn vị: </span>
              <strong className="text-gray-900">{vatInfo.companyName}</strong>
            </div>
            <div>
              <span className="text-gray-500">Mã số thuế: </span>
              <strong className="text-blue-800 font-mono">{vatInfo.taxCode}</strong>
            </div>
            <div>
              <span className="text-gray-500">Địa chỉ: </span>
              <span>{vatInfo.companyAddress}</span>
            </div>
            {vatInfo.invoiceEmail && (
              <div>
                <span className="text-gray-500">Email nhận HĐĐT: </span>
                <span className="text-blue-700">{vatInfo.invoiceEmail}</span>
              </div>
            )}
            {order.invoiceStatus && (
              <div>
                <span className="text-gray-500">Trạng thái HĐ: </span>
                <span className={`font-semibold ${order.invoiceStatus === 'ISSUED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {order.invoiceStatus === 'ISSUED' ? 'Đã phát hành chính thức' : 'Chờ kiểm duyệt'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Device & Items Table */}
      <div className="my-2.5 overflow-hidden rounded-lg border border-gray-300">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-[11px] border-b border-gray-300">
            <tr>
              <th className="py-1.5 px-2.5 text-center w-10 border-r border-gray-300">STT</th>
              <th className="py-1.5 px-2.5 border-r border-gray-300">Tên sản phẩm & Cấu hình chi tiết</th>
              <th className="py-1.5 px-2 text-center w-14 border-r border-gray-300">ĐVT</th>
              <th className="py-1.5 px-2 text-center w-12 border-r border-gray-300">SL</th>
              <th className="py-1.5 px-2.5 text-right w-28 border-r border-gray-300">Đơn giá</th>
              <th className="py-1.5 px-2.5 text-right w-28 border-r border-gray-300">Thành tiền</th>
              <th className="py-1.5 px-2.5 w-32">Bảo hành</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {order.orderDetails && order.orderDetails.length > 0 ? (
              order.orderDetails.map((item, idx) => {
                const specDetails = [item.ram, item.storage, item.color].filter(Boolean).join(' • ');
                return (
                  <tr key={item.id || idx} className="hover:bg-gray-50/50">
                    <td className="py-1.5 px-2.5 text-center font-medium text-gray-600 border-r border-gray-200">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-gray-200">
                      <div className="font-semibold text-gray-900">{item.productName}</div>
                      {specDetails && (
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Phiên bản: <span className="font-medium text-gray-700">{specDetails}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center text-gray-600 border-r border-gray-200">Cái</td>
                    <td className="py-1.5 px-2 text-center font-bold text-gray-900 border-r border-gray-200">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-gray-700 border-r border-gray-200 font-mono">
                      {formatVND(item.unitPrice)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-bold text-gray-900 border-r border-gray-200 font-mono">
                      {formatVND(item.subtotal)}
                    </td>
                    <td className="py-1.5 px-2.5 text-[11px] text-gray-600">
                      <span className="font-medium text-emerald-700">12 tháng chính hãng</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-3 text-center text-gray-500 italic">
                  Không có sản phẩm trong đơn hàng.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 6. Pricing Summary & Tax Note */}
      <div className="flex justify-end my-2.5 avoid-break">
        <div className="w-full max-w-sm space-y-1 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-200">
          <div className="flex justify-between text-gray-600">
            <span>Cộng tiền hàng (tạm tính):</span>
            <span className="font-medium text-gray-900 font-mono">{formatVND(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Phí vận chuyển giao hàng:</span>
            <span className="font-medium text-gray-900 font-mono">
              {(order.shippingFee ?? 0) > 0 ? formatVND(order.shippingFee ?? 0) : 'Miễn phí'}
            </span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Chiết khấu Voucher {order.promotionCode ? `(${order.promotionCode})` : ''}:</span>
              <span className="font-mono">-{formatVND(order.discountAmount)}</span>
            </div>
          )}
          <div className="border-t border-gray-300 pt-1.5 flex justify-between items-baseline">
            <span className="text-sm font-bold text-gray-900 uppercase">Tổng tiền thanh toán:</span>
            <span className="text-base font-extrabold text-emerald-700 font-mono">
              {formatVND(order.finalAmount)}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 italic text-right">
            (Giá thanh toán trên đã bao gồm thuế Giá trị gia tăng VAT)
          </div>
        </div>
      </div>

      {/* Số tiền bằng chữ */}
      <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-md text-xs text-gray-800 my-2 avoid-break">
        <strong>Số tiền bằng chữ: </strong>
        <span className="italic font-medium text-emerald-950">
          {numberToVietnameseWords(order.finalAmount)}
        </span>
      </div>

      {/* 7. Warranty Commitment & Legal terms */}
      <div className="my-2 text-[10.5px] text-gray-600 space-y-0.5 border-t border-gray-200 pt-2 avoid-break">
        <div className="flex items-center gap-1.5 font-bold text-gray-800 uppercase text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Chính sách & Cam kết bảo hành GreenPhone:</span>
        </div>
        <p>• Bảo hành 12 tháng chính hãng toàn diện cho tất cả thiết bị điện thoại theo tiêu chuẩn của nhà sản xuất.</p>
        <p>• Chính sách 1 đổi 1 trong vòng 30 ngày đầu tiên nếu máy phát sinh lỗi phần cứng từ nhà sản xuất.</p>
        <p>• Quý khách vui lòng xuất trình phiếu này hoặc cung cấp SĐT / Số hóa đơn khi đến trung tâm bảo hành.</p>
      </div>

      {/* 8. Signature Block & Verification QR Code */}
      <div className="grid grid-cols-4 gap-3 pt-3 mt-3 border-t border-gray-200 text-center text-xs avoid-break">
        {/* QR Code tra cứu */}
        <div className="flex flex-col items-center justify-center">
          <QRCode value={trackingUrl} size={76} bordered={false} />
          <span className="text-[10px] text-gray-500 mt-0.5 font-mono">Quét tra cứu hóa đơn</span>
        </div>

        {/* Khối chữ ký Người mua */}
        <div className="flex flex-col justify-between h-20">
          <div>
            <div className="font-bold text-gray-900 uppercase">Người mua hàng</div>
            <div className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên)</div>
          </div>
          <div className="font-semibold text-gray-800 text-[11px]">{order.receiverName}</div>
        </div>

        {/* Khối chữ ký Người lập phiếu */}
        <div className="flex flex-col justify-between h-20">
          <div>
            <div className="font-bold text-gray-900 uppercase">Người lập phiếu</div>
            <div className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên)</div>
          </div>
          <div className="font-semibold text-gray-800 text-[11px]">Nhân viên bán hàng</div>
        </div>

        {/* Khối chữ ký Thủ kho */}
        <div className="flex flex-col justify-between h-20">
          <div>
            <div className="font-bold text-gray-900 uppercase">Thủ kho xuất hàng</div>
            <div className="text-[10px] text-gray-500 italic">(Ký, đóng dấu xuất kho)</div>
          </div>
          <div className="font-semibold text-gray-800 text-[11px]">Bộ phận Kho vận</div>
        </div>
      </div>

      {/* Footer timestamp */}
      <div className="mt-3 text-center text-[10px] text-gray-400 border-t border-gray-100 pt-1.5 font-mono">
        In lúc: {formatDate(new Date())} • Hệ thống GreenPhone E-Commerce Core • Bản quyền thuộc GreenPhone
      </div>
    </div>
  );
};

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  open,
  onClose,
  order,
  isAdminView = false,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (!open || !order) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, order]);

  if (!order) return null;

  return (
    <>
      {/* Dedicated CSS Print Stylesheet for direct fallback */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            width: 100% !important;
            height: auto !important;
          }
          #root,
          .ant-drawer,
          .ant-drawer-mask,
          .ant-drawer-content-wrapper,
          .ant-modal-mask,
          .ant-modal-close,
          .ant-modal-header,
          .ant-modal-footer,
          .no-print {
            display: none !important;
          }
          .ant-modal-root {
            position: static !important;
            display: block !important;
          }
          .ant-modal-wrap {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            width: 100% !important;
            height: auto !important;
            inset: auto !important;
          }
          .ant-modal {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            top: 0 !important;
          }
          .ant-modal-content {
            position: static !important;
            display: block !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          #greenphone-invoice-print-area {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #111827 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #374151 !important;
          }
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <Modal
        open={open}
        onCancel={onClose}
        width={860}
        centered
        footer={null}
        closable={false}
        destroyOnHidden
        className="invoice-modal"
      >
        <div className="flex flex-col">
          {/* Action Bar on top of modal */}
          <div className="no-print flex items-center justify-between pb-4 mb-4 border-b border-gray-200">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>
                  {isAdminView
                    ? `Phiếu xuất kho & Hóa đơn bán lẻ #${order.id}`
                    : `Hóa đơn điện tử #${order.id}`}
                </span>
                {!isAdminView && (
                  <Tag color="green" className="!font-semibold !rounded-full">
                    Bản điện tử hợp lệ
                  </Tag>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                {isAdminView
                  ? 'Khổ giấy tiêu chuẩn A4 (210 × 297mm). Nhấn "In ngay" để in hoặc lưu file PDF.'
                  : 'Hóa đơn điện tử chính thức được lưu trữ trực tuyến và có giá trị bảo hành toàn quốc.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isAdminView && (
                <Button
                  type="primary"
                  icon={<Printer className="w-4 h-4" />}
                  onClick={handlePrint}
                  data-testid="invoice-print-btn"
                  className="!bg-emerald-600 hover:!bg-emerald-700 !font-semibold !rounded-lg"
                >
                  In ngay (Ctrl+P)
                </Button>
              )}
              <Button
                onClick={onClose}
                icon={<X className="w-4 h-4" />}
                className="!rounded-lg"
                type={isAdminView ? 'default' : 'primary'}
                danger={false}
              >
                Đóng
              </Button>
            </div>
          </div>

          <InvoicePrintContent
            order={order}
            isAdminView={isAdminView}
            printRef={printRef}
          />
        </div>
      </Modal>
    </>
  );
};

export default InvoicePrintModal;
