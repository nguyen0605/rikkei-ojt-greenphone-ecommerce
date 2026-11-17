import * as XLSX from 'xlsx';
import type { FinancialReport, OrderStats, TopSellingPhone } from '@/types/api';
import { formatVND } from './format';

export interface ExportFinancialData {
  monthStr: string; // MM-YYYY
  userRole?: string; // ROLE_ADMIN, ROLE_SALES, etc.
  financial?: FinancialReport;
  orders?: OrderStats;
  topSelling?: TopSellingPhone[];
  revenueTotal?: number;
}

/**
 * Tính toán độ rộng tự động cho từng cột dựa trên dữ liệu hàng
 */
function calculateColWidths(rows: Record<string, any>[]): { wch: number }[] {
  if (!rows || rows.length === 0) return [];
  const colKeys = Object.keys(rows[0]);
  return colKeys.map((key) => {
    let maxLen = key.toString().length;
    for (const row of rows) {
      const val = row[key];
      if (val !== undefined && val !== null) {
        const strVal = String(val);
        if (strVal.length > maxLen) {
          maxLen = strVal.length;
        }
      }
    }
    // Bổ sung padding 3-4 ký tự cho thoáng mắt, tối thiểu 12 ký tự
    return { wch: Math.max(maxLen + 4, 12) };
  });
}

// [ORD-34] Xuất báo cáo Excel 4 sheet: Tổng quan, Chuỗi thời gian, Thanh toán, Top bán chạy
// Áp dụng phân quyền RBAC: Chỉ ADMIN mới thấy Giá vốn (COGS) & Lợi nhuận; Ẩn Doanh thu với WAREHOUSE
export function exportFinancialExcel(data: ExportFinancialData): void {
  const { monthStr, userRole = '', financial, orders, topSelling = [], revenueTotal = 0 } = data;
  const normalizedRole = userRole.replace(/^ROLE_/, '').toUpperCase();
  const isAdmin = normalizedRole === 'ADMIN';
  const roleSuffix = normalizedRole.toLowerCase() || 'staff';

  const workbook = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: Tổng quan tài chính / Vận hành
  // ==========================================
  const sheet1Rows: { 'Chỉ số': string; 'Giá trị': string | number }[] = [];

  // Vận hành đơn hàng (mọi role đều thấy)
  sheet1Rows.push({ 'Chỉ số': 'Tổng số đơn hàng', 'Giá trị': orders?.totalOrders ?? 0 });
  sheet1Rows.push({ 'Chỉ số': 'Đơn hàng đã giao', 'Giá trị': orders?.deliveredOrders ?? 0 });
  sheet1Rows.push({ 'Chỉ số': 'Đang vận chuyển', 'Giá trị': orders?.shippingOrders ?? 0 });
  sheet1Rows.push({ 'Chỉ số': 'Đang xử lý đóng gói', 'Giá trị': orders?.processingOrders ?? 0 });
  sheet1Rows.push({ 'Chỉ số': 'Chờ xác nhận', 'Giá trị': orders?.pendingOrders ?? 0 });
  sheet1Rows.push({ 'Chỉ số': 'Đơn hàng đã hủy', 'Giá trị': orders?.cancelledOrders ?? 0 });

  // Doanh thu thuần: Chỉ thêm khi vai trò có quyền xem doanh thu (ADMIN, SALES, MARKETING). Tuyệt đối ẩn với WAREHOUSE.
  const canViewRevenue = ['ADMIN', 'SALES', 'MARKETING'].includes(normalizedRole);
  if (canViewRevenue) {
    const netRev = isAdmin && financial ? financial.netRevenue : revenueTotal;
    sheet1Rows.push({ 'Chỉ số': 'Doanh thu thuần', 'Giá trị': formatVND(netRev) });
  }

  if (isAdmin && financial) {
    sheet1Rows.push({ 'Chỉ số': 'Doanh thu gộp', 'Giá trị': formatVND(financial.grossRevenue) });
    sheet1Rows.push({ 'Chỉ số': 'Giảm giá voucher', 'Giá trị': formatVND(financial.discountAmount) });
    sheet1Rows.push({ 'Chỉ số': 'Phí vận chuyển', 'Giá trị': formatVND(financial.shippingFee) });
    sheet1Rows.push({
      'Chỉ số': 'Giá vốn hàng bán (COGS)',
      'Giá trị': financial.cogs != null ? formatVND(financial.cogs) : 'Chưa đủ dữ liệu',
    });
    sheet1Rows.push({
      'Chỉ số': 'Lợi nhuận gộp',
      'Giá trị': financial.grossProfit != null ? formatVND(financial.grossProfit) : 'Chưa đủ dữ liệu',
    });
    sheet1Rows.push({
      'Chỉ số': 'Tỷ suất lợi nhuận',
      'Giá trị': financial.profitMarginPercentage != null ? `${financial.profitMarginPercentage}%` : 'Chưa đủ dữ liệu',
    });
    sheet1Rows.push({ 'Chỉ số': 'Tiền hoàn trả', 'Giá trị': formatVND(financial.refundAmount) });
  }

  const wsOverview = XLSX.utils.json_to_sheet(sheet1Rows);
  wsOverview['!cols'] = calculateColWidths(sheet1Rows);
  XLSX.utils.book_append_sheet(workbook, wsOverview, 'Tổng quan tài chính');

  // ==========================================
  // SHEET 2: Chuỗi thời gian
  // ==========================================
  const rawTimeSeries = (isAdmin && financial?.timeSeriesData) ? financial.timeSeriesData : [];
  const sheet2Rows = rawTimeSeries.map((point) => {
    const row: Record<string, string | number> = {
      'Ngày': point.date,
      'Doanh thu': formatVND(point.revenue),
    };
    if (isAdmin) {
      row['Lợi nhuận gộp'] = point.grossProfit != null ? formatVND(point.grossProfit) : 'N/A';
    }
    return row;
  });

  const wsTimeSeries = sheet2Rows.length > 0
    ? XLSX.utils.json_to_sheet(sheet2Rows)
    : XLSX.utils.aoa_to_sheet([['Ngày', 'Doanh thu', ...(isAdmin ? ['Lợi nhuận gộp'] : [])]]);
  wsTimeSeries['!cols'] = sheet2Rows.length > 0
    ? calculateColWidths(sheet2Rows)
    : [{ wch: 15 }, { wch: 20 }, ...(isAdmin ? [{ wch: 20 }] : [])];
  XLSX.utils.book_append_sheet(workbook, wsTimeSeries, 'Chuỗi thời gian');

  // ==========================================
  // SHEET 3: Cơ cấu thanh toán
  // ==========================================
  const rawPaymentStats = (isAdmin && financial?.paymentMethodStats) ? financial.paymentMethodStats : [];
  const sheet3Rows = rawPaymentStats.map((item) => ({
    'Phương thức thanh toán': item.paymentMethod,
    'Dòng tiền thực nhận': formatVND(item.revenue),
  }));

  const wsPayment = sheet3Rows.length > 0
    ? XLSX.utils.json_to_sheet(sheet3Rows)
    : XLSX.utils.aoa_to_sheet([['Phương thức thanh toán', 'Dòng tiền thực nhận']]);
  wsPayment['!cols'] = sheet3Rows.length > 0
    ? calculateColWidths(sheet3Rows)
    : [{ wch: 25 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(workbook, wsPayment, 'Cơ cấu thanh toán');

  // ==========================================
  // SHEET 4: Top sản phẩm bán chạy
  // ==========================================
  const sheet4Rows = topSelling.map((phone, idx) => ({
    'Thứ hạng': `Top ${idx + 1}`,
    'Tên điện thoại': phone.phoneName,
    'Hãng sản xuất': phone.brandName,
    'Số lượng đã bán': phone.soldQuantity,
  }));

  const wsTopSelling = sheet4Rows.length > 0
    ? XLSX.utils.json_to_sheet(sheet4Rows)
    : XLSX.utils.aoa_to_sheet([['Thứ hạng', 'Tên điện thoại', 'Hãng sản xuất', 'Số lượng đã bán']]);
  wsTopSelling['!cols'] = sheet4Rows.length > 0
    ? calculateColWidths(sheet4Rows)
    : [{ wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, wsTopSelling, 'Top sản phẩm bán chạy');

  // Tên file chuẩn: bao-cao-thang-MM-YYYY-[role].xlsx
  const fileName = `bao-cao-thang-${monthStr}-${roleSuffix}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
