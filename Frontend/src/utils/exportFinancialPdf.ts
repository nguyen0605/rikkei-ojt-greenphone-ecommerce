import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FinancialReport, OrderStats, TopSellingPhone } from '@/types/api';
import { formatVND } from './format';
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from './robotoFonts';

export interface ExportFinancialPdfData {
  monthStr: string; // MM-YYYY
  userRole?: string; // ROLE_ADMIN, ROLE_SALES, etc.
  financial?: FinancialReport;
  orders?: OrderStats;
  topSelling?: TopSellingPhone[];
  revenueTotal?: number;
}

/**
 * Đăng ký font tiếng Việt Unicode (Roboto) vào jsPDF VFS
 */
function registerVietnameseFont(doc: jsPDF): void {
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  doc.setFont('Roboto', 'normal');
}

/**
 * Xuất file PDF chuẩn hóa ấn phẩm doanh nghiệp với jspdf-autotable
 * Đặt tên file chuẩn: bao-cao-thang-MM-YYYY-[role].pdf
 */
export function exportFinancialPdf(data: ExportFinancialPdfData): void {
  const { monthStr, userRole = '', financial, orders, topSelling = [], revenueTotal = 0 } = data;
  const normalizedRole = userRole.replace(/^ROLE_/, '').toUpperCase();
  const isAdmin = normalizedRole === 'ADMIN';
  const roleSuffix = normalizedRole.toLowerCase() || 'staff';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  registerVietnameseFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ==========================================
  // 1. HEADER: Thông tin thương hiệu GreenPhone
  // ==========================================
  // Dải màu trang trí phía trên cùng
  doc.setFillColor(22, 163, 74); // #16a34a - GreenPhone Green
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Badge thương hiệu GreenPhone
  doc.setFillColor(240, 253, 244); // light green bg
  doc.roundedRect(14, 12, 38, 12, 2, 2, 'F');
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(22, 163, 74);
  doc.text('GreenPhone', 17, 20);

  // Thông tin công ty & ngày xuất bản
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Hệ thống Thương Mại Điện Tử GreenPhone', 56, 17);
  doc.text(`Thời gian xuất bản: ${new Date().toLocaleString('vi-VN')}`, 56, 22);

  // Tiêu đề chính
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('BÁO CÁO HOẠT ĐỘNG KINH DOANH & TÀI CHÍNH', pageWidth / 2, 36, { align: 'center' });

  // Kỳ báo cáo
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // slate-600
  const formattedMonth = monthStr.includes('-') ? monthStr.replace('-', '/') : monthStr;
  doc.text(`Kỳ báo cáo: Tháng ${formattedMonth}`, pageWidth / 2, 43, { align: 'center' });

  // ==========================================
  // 2. BẢNG 1: TỔNG QUAN VẬN HÀNH ĐƠN HÀNG
  // ==========================================
  const orderData = [
    ['Tổng đơn hàng phát sinh', String(orders?.totalOrders ?? 0)],
    ['Đơn hàng giao thành công', String(orders?.deliveredOrders ?? 0)],
    ['Đơn hàng đang vận chuyển', String(orders?.shippingOrders ?? 0)],
    ['Đơn hàng đang xử lý đóng gói', String(orders?.processingOrders ?? 0)],
    ['Đơn hàng chờ xác nhận', String(orders?.pendingOrders ?? 0)],
    ['Đơn hàng đã hủy', String(orders?.cancelledOrders ?? 0)],
  ];

  autoTable(doc, {
    startY: 50,
    head: [['Chỉ số vận hành đơn hàng', 'Số lượng']],
    body: orderData,
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontSize: 9.5,
      cellPadding: 3,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [22, 163, 74], // #16a34a
      textColor: [255, 255, 255],
      font: 'Roboto',
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 'auto', halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // ==========================================
  // 3. BẢNG 2: CHỈ SỐ TÀI CHÍNH & HIỆU QUẢ KINH DOANH (RBAC)
  // ==========================================
  const financialRows: string[][] = [];
  const netRev = isAdmin && financial ? financial.netRevenue : revenueTotal;
  financialRows.push(['Doanh thu thuần (Net Revenue)', formatVND(netRev)]);

  if (isAdmin && financial) {
    financialRows.push(['Doanh thu gộp (Gross Revenue)', formatVND(financial.grossRevenue)]);
    financialRows.push(['Giảm giá khuyến mãi / Voucher', formatVND(financial.discountAmount)]);
    financialRows.push(['Phí vận chuyển thực thu', formatVND(financial.shippingFee)]);
    financialRows.push([
      'Giá vốn hàng bán (COGS)',
      financial.cogs != null ? formatVND(financial.cogs) : 'Chưa đủ dữ liệu',
    ]);
    financialRows.push([
      'Lợi nhuận gộp (Gross Profit)',
      financial.grossProfit != null ? formatVND(financial.grossProfit) : 'Chưa đủ dữ liệu',
    ]);
    financialRows.push([
      'Tỷ suất lợi nhuận gộp',
      financial.profitMarginPercentage != null ? `${financial.profitMarginPercentage}%` : 'Chưa đủ dữ liệu',
    ]);
    financialRows.push(['Tổng tiền hoàn trả khách hàng', formatVND(financial.refundAmount)]);
  }

  const lastTableEnd = (doc as any).lastAutoTable?.finalY ?? 100;

  autoTable(doc, {
    startY: lastTableEnd + 8,
    head: [['Chỉ số tài chính', 'Giá trị (VND)']],
    body: financialRows,
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontSize: 9.5,
      cellPadding: 3,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: [255, 255, 255],
      font: 'Roboto',
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 'auto', halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // ==========================================
  // 4. BẢNG 3: TOP SẢN PHẨM BÁN CHẠY
  // ==========================================
  const topPhoneRows = topSelling.map((p, idx) => [
    `#${idx + 1}`,
    p.phoneName,
    p.brandName,
    String(p.soldQuantity),
  ]);

  const afterFinancialY = (doc as any).lastAutoTable?.finalY ?? 160;

  autoTable(doc, {
    startY: afterFinancialY + 8,
    head: [['Hạng', 'Tên sản phẩm', 'Thương hiệu', 'Số lượng bán']],
    body: topPhoneRows.length > 0 ? topPhoneRows : [['-', 'Chưa có sản phẩm bán chạy', '-', '-']],
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontSize: 9,
      cellPadding: 3,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: [255, 255, 255],
      font: 'Roboto',
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 95 },
      2: { cellWidth: 40 },
      3: { cellWidth: 'auto', halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // ==========================================
  // 5. FOOTER: KHU VỰC KÝ TÊN VÀ ĐÁNH SỐ TRANG
  // ==========================================
  const finalTableY = (doc as any).lastAutoTable?.finalY ?? 200;
  
  // Nếu không đủ chỗ cho chữ ký ở trang hiện tại thì sang trang mới
  let signY = finalTableY + 12;
  if (signY + 35 > pageHeight - 15) {
    doc.addPage();
    signY = 25;
  }

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  const col1X = 35;
  const col2X = pageWidth / 2;
  const col3X = pageWidth - 35;

  doc.text('Người lập biểu', col1X, signY, { align: 'center' });
  doc.text('Kế toán trưởng', col2X, signY, { align: 'center' });
  doc.text('Giám đốc duyệt', col3X, signY, { align: 'center' });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('(Ký và ghi rõ họ tên)', col1X, signY + 5, { align: 'center' });
  doc.text('(Ký và ghi rõ họ tên)', col2X, signY + 5, { align: 'center' });
  doc.text('(Ký, đóng dấu và ghi rõ họ tên)', col3X, signY + 5, { align: 'center' });

  // Đánh số trang tự động cho tất cả các trang
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Trang ${i} / ${totalPages} — GreenPhone E-commerce Report`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Tên file chuẩn: bao-cao-thang-MM-YYYY-[role].pdf
  const fileName = `bao-cao-thang-${monthStr}-${roleSuffix}.pdf`;
  doc.save(fileName);
}
