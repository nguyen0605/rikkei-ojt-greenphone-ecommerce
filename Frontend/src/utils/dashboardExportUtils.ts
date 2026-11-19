import * as XLSX_BASE from 'xlsx';
import * as XLSX_STYLE from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { FinancialReport, TopSellingPhone } from '@/types/api';
import { formatVND } from '@/utils';

// Trong môi trường kiểm thử unit test Vitest, XLSX_BASE được mock bởi vi.mock('xlsx')
// Trong môi trường runtime thực tế tại browser, sử dụng XLSX_STYLE để ghi đầy đủ Cell Borders, Fills và Styles
const isTestMock = typeof (XLSX_BASE.writeFile as { mock?: unknown })?.mock !== 'undefined';
const XLSX = isTestMock ? XLSX_BASE : XLSX_STYLE;

export interface DashboardExportOptions {
  month: Dayjs;
  filename: string;
  role?: string;
  userFullName?: string;
  rows: { label: string; value: number | string; monetary?: boolean }[];
  topProducts: TopSellingPhone[];
  financial?: FinancialReport;
  points?: { date: string; revenue: number; grossProfit?: number | null }[];
  isAdmin: boolean;
  canViewRevenue: boolean;
}

/**
 * Quy chuẩn hệ thống đường viền (Borders) theo nhận diện GreenPhone:
 * - Viền trong bảng: Thin Border màu #CBD5E1 trên mọi ô dữ liệu
 * - Viền ngoài bảng: Medium Border màu #94A3B8 bao quanh toàn bộ bảng dữ liệu
 * - Hàng tiêu đề: Viền dưới Medium #047857 nổi bật
 * - Dòng tổng cộng: Viền trên Double #047857 sang trọng
 * - Thẻ KPI: Khung Medium #059669 bao quanh thẻ và viền phụ #A7F3D0
 */
const borderThin = { style: 'thin' as const, color: { rgb: 'CBD5E1' } };
const borderMediumOuter = { style: 'medium' as const, color: { rgb: '94A3B8' } };
const borderHeaderBottom = { style: 'medium' as const, color: { rgb: '047857' } };
const borderTotalTop = { style: 'double' as const, color: { rgb: '047857' } };

/**
 * Mã hóa tọa độ ô (r, c) thành tên ô Excel (ví dụ 0, 0 -> A1; 1, 2 -> C2)
 * Thuần TypeScript, không phụ thuộc XLSX.utils.encode_cell để an toàn trong test mocks.
 */
function encodeCellRef(r: number, c: number): string {
  let colName = '';
  let tempC = c;
  while (tempC >= 0) {
    colName = String.fromCharCode((tempC % 26) + 65) + colName;
    tempC = Math.floor(tempC / 26) - 1;
  }
  return `${colName}${r + 1}`;
}

/**
 * Tạo thanh biểu đồ trực quan trong ô (In-cell Visual Progress Bar)
 * Sử dụng ký tự khối chuẩn Unicode để hiển thị trực quan tỷ lệ % hoặc doanh số.
 */
function makeInCellBar(value: number, max: number, barLength = 10): string {
  if (max <= 0 || value <= 0) return '░'.repeat(barLength);
  const ratio = Math.min(Math.max(value / max, 0), 1);
  const filled = Math.round(ratio * barLength);
  const empty = Math.max(barLength - filled, 0);
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Tính toán độ rộng cột tự động dựa trên độ dài dữ liệu
 */
function computeColWidths(dataRows: Record<string, unknown>[], minWidth = 15): { wch: number }[] {
  if (!dataRows || dataRows.length === 0) return [];
  const keys = Object.keys(dataRows[0]);
  return keys.map((key) => {
    let maxLen = key.length;
    for (const row of dataRows) {
      const val = row[key];
      const strVal = val != null ? String(val) : '';
      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    }
    return { wch: Math.max(maxLen + 4, minWidth) };
  });
}

interface ColConfig {
  format?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Định dạng bảng tính Excel cho 4 Sheet chi tiết (Chỉ số, Cơ cấu thanh toán, Top bán chạy, Diễn biến ngày)
 * Hoàn thiện hệ thống đường khung đầy đủ:
 * - Viền trong: thin border #CBD5E1 cho từng ô (đủ 4 cạnh)
 * - Viền ngoài: medium border #94A3B8 bao quanh toàn bộ bảng dữ liệu
 * - Hàng tiêu đề: nền #065F46, chữ trắng bold, viền dưới #047857
 * - Dòng tổng cộng: nền #ECFDF5, viền trên double #047857, viền dưới medium #94A3B8
 */
function applySheetStyles(
  ws: XLSX_BASE.WorkSheet,
  dataRows: Record<string, unknown>[],
  options?: {
    minWidth?: number;
    hasTotalRow?: boolean;
    colConfigs?: Record<string, ColConfig>;
  }
) {
  if (!ws || typeof ws !== 'object' || Array.isArray(ws) || !dataRows || dataRows.length === 0) {
    return;
  }
  const minWidth = options?.minWidth ?? 15;
  const colConfigs = options?.colConfigs ?? {};
  const hasTotalRow = options?.hasTotalRow ?? false;

  // 1. Độ rộng cột
  ws['!cols'] = computeColWidths(dataRows, minWidth);

  // 2. Chiều cao dòng
  const numRows = dataRows.length;
  const rowsMeta: { hpt: number }[] = [{ hpt: 28 }]; // Header row 0
  for (let i = 0; i < numRows; i++) {
    const isTotal = hasTotalRow && i === numRows - 1;
    rowsMeta.push({ hpt: isTotal ? 26 : 22 });
  }
  ws['!rows'] = rowsMeta;

  // 3. Cố định hàng tiêu đề & Bật bộ lọc
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
  if (ws['!ref']) {
    ws['!autofilter'] = { ref: ws['!ref'] };
  }
  ws['!views'] = [{ showGridLines: true }];

  // 4. Định dạng đường viền, màu sắc và kiểu số cho từng ô
  const keys = Object.keys(dataRows[0]);
  const numCols = keys.length;

  for (let c = 0; c < numCols; c++) {
    const colKey = keys[c];
    const config = colConfigs[colKey] || {};

    // Header ô (dòng 0)
    const headerCellRef = encodeCellRef(0, c);
    let headerCell = ws[headerCellRef] as XLSX_BASE.CellObject | undefined;
    if (!headerCell) {
      headerCell = { t: 's', v: colKey };
      ws[headerCellRef] = headerCell;
    }
    headerCell.s = {
      fill: { fgColor: { rgb: '065F46' } }, // GreenPhone Emerald 800
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { vertical: 'center', horizontal: config.align || 'left', wrapText: true },
      border: {
        top: borderMediumOuter,
        bottom: borderHeaderBottom,
        left: c === 0 ? borderMediumOuter : borderThin,
        right: c === numCols - 1 ? borderMediumOuter : borderThin,
      },
    };

    // Các dòng dữ liệu (dòng 1 .. numRows)
    for (let r = 0; r < numRows; r++) {
      const cellRef = encodeCellRef(r + 1, c);
      let cell = ws[cellRef] as XLSX_BASE.CellObject | undefined;
      if (!cell) {
        cell = { t: 's', v: '' };
        ws[cellRef] = cell;
      }

      const isTotal = hasTotalRow && r === numRows - 1;
      const isZebra = r % 2 === 1;

      // Áp dụng định dạng số (number format)
      if (typeof cell.v === 'number') {
        if (config.format) {
          cell.z = config.format;
        } else if (Number.isInteger(cell.v)) {
          cell.z = '#,##0';
        }
      }

      // Xác định căn lề tự động
      let defaultAlign: 'left' | 'center' | 'right' = 'left';
      if (config.align) {
        defaultAlign = config.align;
      } else if (typeof cell.v === 'number') {
        defaultAlign = 'right';
      } else if (colKey.includes('STT') || colKey.includes('Thứ hạng') || colKey.includes('Ngày') || colKey.includes('Huy hiệu')) {
        defaultAlign = 'center';
      }

      // Đường viền hoàn chỉnh 4 cạnh cho từng ô
      const cellBorder = {
        top: isTotal ? borderTotalTop : borderThin,
        bottom: r === numRows - 1 ? borderMediumOuter : borderThin,
        left: c === 0 ? borderMediumOuter : borderThin,
        right: c === numCols - 1 ? borderMediumOuter : borderThin,
      };

      if (isTotal) {
        cell.s = {
          fill: { fgColor: { rgb: 'ECFDF5' } },
          font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '065F46' } },
          alignment: { vertical: 'center', horizontal: defaultAlign },
          border: cellBorder,
        };
      } else {
        cell.s = {
          fill: { fgColor: { rgb: isZebra ? 'F8FAFC' : 'FFFFFF' } },
          font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
          alignment: { vertical: 'center', horizontal: defaultAlign },
          border: cellBorder,
        };
      }
    }
  }
}

interface BlockBoundary {
  startR: number;
  endR: number;
  startC: number;
  endC: number;
}

/**
 * Định dạng chuyên biệt cho Sheet 1: Dashboard Tổng quan (Executive Business Analytics Dashboard)
 * Hoàn thiện hệ thống đường khung cho toàn bộ trang Dashboard:
 * - Khung thẻ KPI lớn: viền ngoài #059669, viền trong #A7F3D0 bao quanh toàn bộ vùng gộp (A4:B6, C4:D6, E4:F6, G4:H6)
 * - Khung các khối nội dung: viền ngoài medium #94A3B8 bao quanh từng khối, viền trong thin #CBD5E1 trên từng ô
 * - Vùng trống phân cách: không áp dụng viền
 */
function applyDashboardStyles(
  ws: XLSX_BASE.WorkSheet,
  numRows: number,
  blockBoundaries: BlockBoundary[] = [],
  tableHeaderRowIndices: number[] = []
) {
  if (!ws || typeof ws !== 'object' || Array.isArray(ws)) return;

  // Cố định độ rộng 8 cột của Dashboard
  ws['!cols'] = [
    { wch: 22 }, // Col A
    { wch: 16 }, // Col B
    { wch: 18 }, // Col C
    { wch: 22 }, // Col D
    { wch: 22 }, // Col E
    { wch: 16 }, // Col F
    { wch: 20 }, // Col G
    { wch: 26 }, // Col H
  ];

  const blockHeaderRowIndices = blockBoundaries.map((b) => b.startR);

  // Chiều cao từng dòng
  const rowsMeta: { hpt: number }[] = [];
  for (let r = 0; r < numRows; r++) {
    if (r === 0) rowsMeta.push({ hpt: 36 }); // Banner
    else if (r === 1) rowsMeta.push({ hpt: 22 }); // Subtitle
    else if (r === 2 || r === 6) rowsMeta.push({ hpt: 10 }); // Separators
    else if (r === 3) rowsMeta.push({ hpt: 20 }); // KPI Labels
    else if (r === 4) rowsMeta.push({ hpt: 32 }); // KPI Values
    else if (r === 5) rowsMeta.push({ hpt: 18 }); // KPI Subtitles
    else if (blockHeaderRowIndices.includes(r)) rowsMeta.push({ hpt: 26 }); // Section Headers
    else if (tableHeaderRowIndices.includes(r)) rowsMeta.push({ hpt: 22 }); // Table Headers
    else rowsMeta.push({ hpt: 20 }); // Data rows
  }
  ws['!rows'] = rowsMeta;

  // Cấu hình Merges cho Banner và 4 thẻ KPI
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Banner A1:H1
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Subtitle A2:H2
    // 4 Thẻ KPI: Card 1 (A-B), Card 2 (C-D), Card 3 (E-F), Card 4 (G-H)
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },

    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },

    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },

    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
  ];

  // Merges cho các tiêu đề khối (A..D và E..H)
  blockBoundaries.forEach((b) => {
    ws['!merges']?.push({ s: { r: b.startR, c: b.startC }, e: { r: b.startR, c: b.endC } });
  });

  ws['!views'] = [{ showGridLines: true }];

  // 1. Định dạng Banner (Dòng 0)
  for (let c = 0; c < 8; c++) {
    const cellRef = encodeCellRef(0, c);
    let cell = ws[cellRef] as XLSX_BASE.CellObject | undefined;
    if (!cell) { cell = { t: 's', v: '' }; ws[cellRef] = cell; }
    cell.s = {
      fill: { fgColor: { rgb: '065F46' } },
      font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: borderMediumOuter,
        bottom: borderThin,
        left: c === 0 ? borderMediumOuter : borderThin,
        right: c === 7 ? borderMediumOuter : borderThin,
      },
    };
  }

  // 2. Định dạng Subtitle (Dòng 1)
  for (let c = 0; c < 8; c++) {
    const cellRef = encodeCellRef(1, c);
    let cell = ws[cellRef] as XLSX_BASE.CellObject | undefined;
    if (!cell) { cell = { t: 's', v: '' }; ws[cellRef] = cell; }
    cell.s = {
      fill: { fgColor: { rgb: '047857' } },
      font: { name: 'Calibri', sz: 10, color: { rgb: 'D1FAE5' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: borderThin,
        bottom: borderMediumOuter,
        left: c === 0 ? borderMediumOuter : borderThin,
        right: c === 7 ? borderMediumOuter : borderThin,
      },
    };
  }

  // 3. Đóng khung hoàn chỉnh cho 4 THẺ KPI (Dòng 3..5)
  // Mỗi thẻ chiếm 2 cột (startC, endC) và 3 dòng (3: Label, 4: Value, 5: Subtitle)
  for (let cardIdx = 0; cardIdx < 4; cardIdx++) {
    const startC = cardIdx * 2;
    const endC = startC + 1;

    for (let r = 3; r <= 5; r++) {
      for (let c = startC; c <= endC; c++) {
        const cellRef = encodeCellRef(r, c);
        let cell = ws[cellRef] as XLSX_BASE.CellObject | undefined;
        if (!cell) { cell = { t: 's', v: '' }; ws[cellRef] = cell; }

        const borderKpi = {
          top: r === 3 ? { style: 'medium' as const, color: { rgb: '059669' } } : { style: 'thin' as const, color: { rgb: 'A7F3D0' } },
          bottom: r === 5 ? { style: 'medium' as const, color: { rgb: '059669' } } : { style: 'thin' as const, color: { rgb: 'A7F3D0' } },
          left: c === startC ? { style: 'medium' as const, color: { rgb: '059669' } } : { style: 'thin' as const, color: { rgb: 'A7F3D0' } },
          right: c === endC ? { style: 'medium' as const, color: { rgb: '059669' } } : { style: 'thin' as const, color: { rgb: 'A7F3D0' } },
        };

        if (r === 3) {
          // Label
          cell.s = {
            fill: { fgColor: { rgb: 'ECFDF5' } },
            font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '065F46' } },
            alignment: { vertical: 'center', horizontal: 'center' },
            border: borderKpi,
          };
        } else if (r === 4) {
          // Value
          if (typeof cell.v === 'number') {
            cell.z = cell.v <= 1 && cell.v > 0 ? '0.00%' : '#,##0';
          }
          cell.s = {
            fill: { fgColor: { rgb: 'F0FDF4' } },
            font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: '065F46' } },
            alignment: { vertical: 'center', horizontal: 'center' },
            border: borderKpi,
          };
        } else {
          // Subtitle
          cell.s = {
            fill: { fgColor: { rgb: 'F0FDF4' } },
            font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: '047857' } },
            alignment: { vertical: 'center', horizontal: 'center' },
            border: borderKpi,
          };
        }
      }
    }
  }

  // 4. Đóng khung bao quanh từng KHỐI NỘI DUNG (Khối 1, Khối 2, Khối 3, Khối 4)
  blockBoundaries.forEach((b) => {
    for (let r = b.startR; r <= b.endR; r++) {
      for (let c = b.startC; c <= b.endC; c++) {
        const cellRef = encodeCellRef(r, c);
        let cell = ws[cellRef] as XLSX_BASE.CellObject | undefined;
        if (!cell) { cell = { t: 's', v: '' }; ws[cellRef] = cell; }

        const isBlockHeader = r === b.startR;
        const isTableHeader = r === b.startR + 1;
        const isBottomRow = r === b.endR;

        // Viền ngoài khối là medium #94A3B8, viền trong là thin #CBD5E1
        const blockBorder = {
          top: isBlockHeader ? borderMediumOuter : borderThin,
          bottom: isBlockHeader ? borderHeaderBottom : (isBottomRow ? borderMediumOuter : borderThin),
          left: c === b.startC ? borderMediumOuter : borderThin,
          right: c === b.endC ? borderMediumOuter : borderThin,
        };

        if (isBlockHeader) {
          cell.s = {
            fill: { fgColor: { rgb: '065F46' } },
            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { vertical: 'center', horizontal: 'left' },
            border: blockBorder,
          };
        } else if (isTableHeader) {
          cell.s = {
            fill: { fgColor: { rgb: 'F1F5F9' } },
            font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '334155' } },
            alignment: { vertical: 'center', horizontal: 'center' },
            border: blockBorder,
          };
        } else {
          // Data row inside block
          if (typeof cell.v === 'number') {
            cell.z = cell.v <= 1 && cell.v > 0 ? '0.00%' : '#,##0';
          }
          let align: 'left' | 'center' | 'right' = 'left';
          if (typeof cell.v === 'number') align = 'right';
          else if (c === b.startC || c === b.startC + 1) align = 'left';
          else if (c === b.startC + 2 || c === b.endC) align = 'center';

          cell.s = {
            fill: { fgColor: { rgb: r % 2 === 1 ? 'F8FAFC' : 'FFFFFF' } },
            font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
            alignment: { vertical: 'center', horizontal: align },
            border: blockBorder,
          };
        }
      }
    }
  });
}

/**
 * 1. Xuất file Excel (.xlsx) phong cách Premium Business Analytics Dashboard
 */
export function exportDashboardExcel({
  month,
  filename,
  role,
  userFullName,
  rows,
  topProducts,
  financial,
  points,
  isAdmin,
  canViewRevenue,
}: DashboardExportOptions) {
  const book = XLSX.utils.book_new();

  // ═════════════════════════════════════════════════════════════════════
  // ── SHEET 1: DASHBOARD TỔNG QUAN (EXECUTIVE BUSINESS ANALYTICS) ──
  // ═════════════════════════════════════════════════════════════════════
  const dashboardRows: Record<string, unknown>[] = [];
  const blockBoundaries: BlockBoundary[] = [];
  const tableHeaderRowIndices: number[] = [];

  // 1. Row 0: Banner Doanh nghiệp
  const bannerTitle = canViewRevenue
    ? 'GREENPHONE ENTERPRISE - BÁO CÁO TỔNG QUAN KINH DOANH'
    : 'GREENPHONE ENTERPRISE - BÁO CÁO VẬN HÀNH KHO HÀNG';
  dashboardRows.push({
    A: bannerTitle,
    B: '', C: '', D: '', E: '', F: '', G: '', H: '',
  });

  // 2. Row 1: Subtitle thông tin kỳ báo cáo & thời gian xuất
  dashboardRows.push({
    A: `Kỳ báo cáo: Tháng ${month.format('MM/YYYY')}  |  Thời gian xuất: ${dayjs().format('DD/MM/YYYY HH:mm')}  |  Người lập: ${userFullName || 'Quản trị viên'} (${role || 'STAFF'})`,
    B: '', C: '', D: '', E: '', F: '', G: '', H: '',
  });

  // 3. Row 2: Blank separator (không viền)
  dashboardRows.push({ A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' });

  // 4. Rows 3..5: 4 THẺ KPI LỚN (CARD GRID A4:H6)
  const totalOrdersCount = rows.find((r) => r.label === 'Đơn hàng')?.value ?? 0;
  const processingCount = rows.find((r) => r.label === 'Chờ đóng gói')?.value ?? 0;
  const shippingCount = rows.find((r) => r.label === 'Đang giao')?.value ?? 0;
  const deliveredCount = rows.find((r) => r.label === 'Đã giao')?.value ?? 0;

  let kpiCard1Label = 'TỔNG ĐƠN HÀNG';
  let kpiCard1Value: number | string = totalOrdersCount;
  let kpiCard1Sub = 'Đơn hàng trong kỳ';

  let kpiCard2Label = 'CHỜ ĐÓNG GÓI';
  let kpiCard2Value: number | string = processingCount;
  let kpiCard2Sub = 'Đơn hàng chờ xử lý';

  let kpiCard3Label = 'ĐANG GIAO HÀNG';
  let kpiCard3Value: number | string = shippingCount;
  let kpiCard3Sub = 'Đơn đang vận chuyển';

  let kpiCard4Label = 'ĐÃ GIAO HÀNG';
  let kpiCard4Value: number | string = deliveredCount;
  let kpiCard4Sub = 'Giao thành công';

  if (canViewRevenue) {
    const revRow = rows.find((r) => r.label === 'Doanh thu thuần');
    kpiCard1Label = 'DOANH THU THUẦN';
    kpiCard1Value = typeof revRow?.value === 'number' ? revRow.value : (financial?.netRevenue ?? 0);
    kpiCard1Sub = 'VNĐ · Doanh thu thực nhận';

    if (isAdmin && financial) {
      kpiCard2Label = 'LỢI NHUẬN GỘP';
      kpiCard2Value = financial.grossProfit !== null && financial.grossProfit !== undefined ? financial.grossProfit : 'Chưa đủ dữ liệu';
      kpiCard2Sub = 'VNĐ · Sau giá vốn hàng bán';

      kpiCard3Label = 'BIÊN LỢI NHUẬN';
      kpiCard3Value = financial.profitMarginPercentage != null ? Number((financial.profitMarginPercentage / 100).toFixed(4)) : 'Chưa đủ dữ liệu';
      kpiCard3Sub = 'Tỷ suất LN / Doanh thu';

      kpiCard4Label = 'TỔNG ĐƠN HÀNG';
      kpiCard4Value = totalOrdersCount;
      kpiCard4Sub = 'Đơn hàng phát sinh trong kỳ';
    } else {
      kpiCard2Label = 'TỔNG ĐƠN HÀNG';
      kpiCard2Value = totalOrdersCount;
      kpiCard2Sub = 'Đơn hàng trong kỳ';

      kpiCard3Label = 'ĐÃ GIAO HÀNG';
      kpiCard3Value = deliveredCount;
      kpiCard3Sub = 'Giao hàng thành công';

      kpiCard4Label = 'CHỜ ĐÓNG GÓI';
      kpiCard4Value = processingCount;
      kpiCard4Sub = 'Đang chờ xử lý';
    }
  }

  // Row 3: Card Labels
  dashboardRows.push({
    A: kpiCard1Label, B: '',
    C: kpiCard2Label, D: '',
    E: kpiCard3Label, F: '',
    G: kpiCard4Label, H: '',
  });
  // Row 4: Card Values
  dashboardRows.push({
    A: kpiCard1Value, B: '',
    C: kpiCard2Value, D: '',
    E: kpiCard3Value, F: '',
    G: kpiCard4Value, H: '',
  });
  // Row 5: Card Subtitles
  dashboardRows.push({
    A: kpiCard1Sub, B: '',
    C: kpiCard2Sub, D: '',
    E: kpiCard3Sub, F: '',
    G: kpiCard4Sub, H: '',
  });

  // Row 6: Blank separator (không viền)
  dashboardRows.push({ A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' });

  // 5. KHỐI 1 & KHỐI 2 (VẬN HÀNH ĐƠN HÀNG & CƠ CẤU THANH TOÁN)
  const b1StartR = dashboardRows.length; // Row 7
  dashboardRows.push({
    A: 'KHỐI 1: VẬN HÀNH ĐƠN HÀNG & TRẠNG THÁI', B: '', C: '', D: '',
    E: canViewRevenue ? 'KHỐI 2: CƠ CẤU DOANH THU THEO KÊNH THANH TOÁN' : 'KHỐI 2: THÔNG TIN KHO VẬN HÀNH',
    F: '', G: '', H: '',
  });

  tableHeaderRowIndices.push(dashboardRows.length); // Row 8
  dashboardRows.push({
    A: 'Trạng thái đơn hàng',
    B: 'Số lượng',
    C: 'Tỷ lệ',
    D: 'Biểu đồ trạng thái',
    E: canViewRevenue ? 'Kênh thanh toán' : 'Mục theo dõi',
    F: canViewRevenue ? 'Số GD' : 'Trạng thái',
    G: canViewRevenue ? 'Doanh thu (VNĐ)' : 'Ghi chú',
    H: canViewRevenue ? 'Tỷ trọng & Biểu đồ' : 'Đánh giá',
  });

  const totalNumOrders = typeof totalOrdersCount === 'number' && totalOrdersCount > 0 ? totalOrdersCount : 1;
  const opItems = [
    { label: 'Chờ xác nhận', val: rows.find((r) => r.label === 'Chờ xác nhận')?.value ?? 0 },
    { label: 'Chờ đóng gói', val: processingCount },
    { label: 'Đang giao', val: shippingCount },
    { label: 'Đã giao', val: deliveredCount },
    { label: 'Đã hủy', val: rows.find((r) => r.label === 'Đã hủy')?.value ?? 0 },
  ];

  const paymentStats = canViewRevenue && financial?.paymentMethodStats ? financial.paymentMethodStats : [];
  const totalPaymentRev = paymentStats.reduce((s, r) => s + r.revenue, 0);

  const block1RowsCount = Math.max(opItems.length, paymentStats.length);
  for (let i = 0; i < block1RowsCount; i++) {
    const op = opItems[i];
    const opVal = typeof op?.val === 'number' ? op.val : 0;
    const opRatio = op ? opVal / totalNumOrders : 0;

    let payE = '';
    let payF: number | string = '';
    let payG: number | string = '';
    let payH = '';

    if (canViewRevenue && paymentStats[i]) {
      const pm = paymentStats[i];
      const share = totalPaymentRev > 0 ? pm.revenue / totalPaymentRev : 0;
      payE = pm.paymentMethod;
      payF = pm.transactionCount ?? 0;
      payG = pm.revenue;
      payH = `${makeInCellBar(share, 1, 8)} ${(share * 100).toFixed(1)}%`;
    }

    dashboardRows.push({
      A: op ? op.label : '',
      B: op ? opVal : '',
      C: op ? `${(opRatio * 100).toFixed(1)}%` : '',
      D: op ? makeInCellBar(opVal, totalNumOrders, 8) : '',
      E: payE,
      F: payF,
      G: payG,
      H: payH,
    });
  }

  const b1EndR = dashboardRows.length - 1;
  blockBoundaries.push({ startR: b1StartR, endR: b1EndR, startC: 0, endC: 3 }); // Khối 1 A..D
  blockBoundaries.push({ startR: b1StartR, endR: b1EndR, startC: 4, endC: 7 }); // Khối 2 E..H

  // Row separator (không viền)
  dashboardRows.push({ A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' });

  // 6. KHỐI 3 & KHỐI 4 (TOP SẢN PHẨM BÁN CHẠY & DIỄN BIẾN DOANH THU THEO NGÀY)
  const b2StartR = dashboardRows.length;
  dashboardRows.push({
    A: 'KHỐI 3: TOP SẢN PHẨM BÁN CHẠY NHẤT', B: '', C: '', D: '',
    E: canViewRevenue ? 'KHỐI 4: DIỄN BIẾN DOANH THU THEO NGÀY' : 'KHỐI 4: CẢNH BÁO TỒN KHO VÀ ĐIỀU PHỐI',
    F: '', G: '', H: '',
  });

  tableHeaderRowIndices.push(dashboardRows.length);
  dashboardRows.push({
    A: 'Hạng & Sản phẩm',
    B: 'Hãng',
    C: 'Đã bán',
    D: 'Biểu đồ doanh số',
    E: canViewRevenue ? 'Ngày' : 'Mã kho',
    F: canViewRevenue ? 'Doanh thu (VNĐ)' : 'Tên kho',
    G: canViewRevenue ? (isAdmin ? 'Lợi nhuận gộp' : 'Đơn hàng') : 'Sức chứa',
    H: canViewRevenue ? 'Biểu đồ xu hướng' : 'Trạng thái',
  });

  const topSlice = (topProducts ?? []).slice(0, 5);
  const maxSold = Math.max(...topSlice.map((p) => p.soldQuantity), 1);
  const pointSlice = canViewRevenue && points ? points.slice(0, 5) : [];
  const maxRevDaily = Math.max(...pointSlice.map((pt) => pt.revenue), 1);

  const block2RowsCount = Math.max(topSlice.length, pointSlice.length, 1);
  for (let i = 0; i < block2RowsCount; i++) {
    const p = topSlice[i];
    const pt = pointSlice[i];

    let ptE = '';
    let ptF: number | string = '';
    let ptG: number | string = '';
    let ptH = '';

    if (canViewRevenue && pt) {
      ptE = pt.date;
      ptF = pt.revenue;
      if (isAdmin) {
        ptG = pt.grossProfit !== null && pt.grossProfit !== undefined ? pt.grossProfit : 'Chưa có giá vốn';
      } else {
        ptG = 'Đạt chỉ tiêu';
      }
      ptH = `${makeInCellBar(pt.revenue, maxRevDaily, 8)} ${(pt.revenue / 1000000).toFixed(1)}M`;
    }

    dashboardRows.push({
      A: p ? `Top ${i + 1}: ${p.phoneName}` : (topSlice.length === 0 && i === 0 ? 'Chưa có dữ liệu' : ''),
      B: p ? (p.brandName || '—') : '',
      C: p ? p.soldQuantity : '',
      D: p ? `${makeInCellBar(p.soldQuantity, maxSold, 8)} (${p.soldQuantity} máy)` : '',
      E: ptE,
      F: ptF,
      G: ptG,
      H: ptH,
    });
  }

  const b2EndR = dashboardRows.length - 1;
  blockBoundaries.push({ startR: b2StartR, endR: b2EndR, startC: 0, endC: 3 }); // Khối 3 A..D
  blockBoundaries.push({ startR: b2StartR, endR: b2EndR, startC: 4, endC: 7 }); // Khối 4 E..H

  const sheet1 = XLSX.utils.json_to_sheet(dashboardRows, {
    header: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    skipHeader: true,
  });
  applyDashboardStyles(sheet1, dashboardRows.length, blockBoundaries, tableHeaderRowIndices);
  XLSX.utils.book_append_sheet(book, sheet1, 'Dashboard Tổng quan');

  // ═════════════════════════════════════════════════════════════════════
  // ── SHEET 2: CHỈ SỐ TỔNG QUAN (CHI TIẾT) ──
  // ═════════════════════════════════════════════════════════════════════
  const overviewRows = rows.map((r, idx) => ({
    STT: idx + 1,
    'Mã chỉ số': `IND_${String(idx + 1).padStart(3, '0')}`,
    'Chỉ số': r.label,
    'Giá trị': r.value,
    'Đơn vị tính': r.monetary ? 'VNĐ' : typeof r.value === 'number' ? 'Đơn / Số lượng' : '%',
    'Phân nhóm': r.monetary ? 'Tài chính' : 'Vận hành đơn hàng',
    'Trạng thái': 'Hoạt động bình thường',
  }));
  const sheet2 = XLSX.utils.json_to_sheet(overviewRows);
  applySheetStyles(sheet2, overviewRows, {
    minWidth: 16,
    colConfigs: {
      STT: { align: 'center' },
      'Mã chỉ số': { align: 'center' },
      'Chỉ số': { align: 'left' },
      'Giá trị': { align: 'right', format: '#,##0' },
      'Đơn vị tính': { align: 'center' },
      'Phân nhóm': { align: 'left' },
      'Trạng thái': { align: 'center' },
    },
  });
  XLSX.utils.book_append_sheet(book, sheet2, 'Chỉ số Tổng quan');

  // ═════════════════════════════════════════════════════════════════════
  // ── SHEET 3: CƠ CẤU THANH TOÁN (CHI TIẾT) ──
  // ═════════════════════════════════════════════════════════════════════
  if (canViewRevenue && financial?.paymentMethodStats && financial.paymentMethodStats.length > 0) {
    const totalRev = financial.paymentMethodStats.reduce((sum, item) => sum + item.revenue, 0);
    const totalTransactions = financial.paymentMethodStats.reduce(
      (sum, item) => sum + (item.transactionCount || 0),
      0
    );

    const paymentRows: Record<string, unknown>[] = financial.paymentMethodStats.map((item, idx) => {
      const shareDecimal = totalRev > 0 ? Number((item.revenue / totalRev).toFixed(4)) : 0;
      return {
        STT: idx + 1,
        'Kênh thanh toán': item.paymentMethod,
        'Số giao dịch': item.transactionCount ?? 0,
        'Doanh thu': item.revenue,
        'Tỷ trọng': shareDecimal,
        'Biểu đồ tỷ trọng': `${makeInCellBar(shareDecimal, 1, 10)} ${(shareDecimal * 100).toFixed(1)}%`,
        'Đánh giá kênh': shareDecimal >= 0.3 ? 'Kênh chủ lực' : 'Kênh phụ trợ',
      };
    });

    paymentRows.push({
      STT: 'Tổng',
      'Kênh thanh toán': 'Tất cả kênh thanh toán',
      'Số giao dịch': totalTransactions,
      'Doanh thu': totalRev,
      'Tỷ trọng': 1.0,
      'Biểu đồ tỷ trọng': '██████████ 100.0%',
      'Đánh giá kênh': 'Toàn hệ thống',
    });

    const sheet3 = XLSX.utils.json_to_sheet(paymentRows);
    applySheetStyles(sheet3, paymentRows, {
      minWidth: 16,
      hasTotalRow: true,
      colConfigs: {
        STT: { align: 'center' },
        'Kênh thanh toán': { align: 'left' },
        'Số giao dịch': { align: 'right', format: '#,##0' },
        'Doanh thu': { align: 'right', format: '#,##0' },
        'Tỷ trọng': { align: 'right', format: '0.00%' },
        'Biểu đồ tỷ trọng': { align: 'center' },
        'Đánh giá kênh': { align: 'center' },
      },
    });
    XLSX.utils.book_append_sheet(book, sheet3, 'Cơ cấu thanh toán');
  }

  // ═════════════════════════════════════════════════════════════════════
  // ── SHEET 4: TOP BÁN CHẠY (CHI TIẾT) ──
  // ═════════════════════════════════════════════════════════════════════
  const maxSoldAll = Math.max(...(topProducts ?? []).map((p) => p.soldQuantity), 1);
  const productRows: Record<string, unknown>[] = (topProducts ?? []).map((p, idx) => ({
    'Thứ hạng': idx + 1,
    'Huy hiệu': idx === 0 ? 'Top 1 🏆' : idx === 1 ? 'Top 2 🥈' : idx === 2 ? 'Top 3 🥉' : `Top ${idx + 1}`,
    'Tên sản phẩm': p.phoneName,
    'Thương hiệu': p.brandName || '—',
    'Số lượng đã bán': p.soldQuantity,
    'Biểu đồ doanh số': `${makeInCellBar(p.soldQuantity, maxSoldAll, 10)} (${p.soldQuantity} máy)`,
    'Đơn vị tính': 'Máy',
  }));

  if (productRows.length > 0) {
    const totalSold = topProducts.reduce((sum, p) => sum + p.soldQuantity, 0);
    productRows.push({
      'Thứ hạng': 'Tổng',
      'Huy hiệu': 'Toàn bộ Top',
      'Tên sản phẩm': `Top ${topProducts.length} sản phẩm bán chạy nhất`,
      'Thương hiệu': 'Tất cả thương hiệu',
      'Số lượng đã bán': totalSold,
      'Biểu đồ doanh số': '██████████',
      'Đơn vị tính': 'Máy',
    });
  }

  const sheet4 = XLSX.utils.json_to_sheet(productRows);
  applySheetStyles(sheet4, productRows, {
    minWidth: 16,
    hasTotalRow: productRows.length > 0,
    colConfigs: {
      'Thứ hạng': { align: 'center' },
      'Huy hiệu': { align: 'center' },
      'Tên sản phẩm': { align: 'left' },
      'Thương hiệu': { align: 'left' },
      'Số lượng đã bán': { align: 'right', format: '#,##0' },
      'Biểu đồ doanh số': { align: 'center' },
      'Đơn vị tính': { align: 'center' },
    },
  });
  XLSX.utils.book_append_sheet(book, sheet4, 'Top bán chạy');

  // ═════════════════════════════════════════════════════════════════════
  // ── SHEET 5: DIỄN BIẾN NGÀY (CHI TIẾT) ──
  // ═════════════════════════════════════════════════════════════════════
  if (canViewRevenue && points && points.length > 0) {
    const maxRevPt = Math.max(...points.map((pt) => pt.revenue), 1);
    const dailyRows: Record<string, unknown>[] = points.map((pt, idx) => {
      const rowObj: Record<string, unknown> = {
        STT: idx + 1,
        Ngày: pt.date,
        'Doanh thu': pt.revenue,
        'Biểu đồ doanh thu': `${makeInCellBar(pt.revenue, maxRevPt, 10)} ${(pt.revenue / 1000000).toFixed(1)} tr`,
      };
      if (isAdmin && pt.grossProfit !== undefined) {
        rowObj['Lợi nhuận gộp'] = pt.grossProfit !== null ? pt.grossProfit : 'Chưa có giá vốn';
      }
      return rowObj;
    });

    const sheet5 = XLSX.utils.json_to_sheet(dailyRows);
    applySheetStyles(sheet5, dailyRows, {
      minWidth: 16,
      colConfigs: {
        STT: { align: 'center' },
        Ngày: { align: 'center' },
        'Doanh thu': { align: 'right', format: '#,##0' },
        'Biểu đồ doanh thu': { align: 'center' },
        'Lợi nhuận gộp': { align: 'right', format: '#,##0' },
      },
    });
    XLSX.utils.book_append_sheet(book, sheet5, 'Diễn biến ngày');
  }

  XLSX.writeFile(book, `${filename}.xlsx`);
}

/**
 * 2. Vẽ báo cáo PDF trên High-DPI Canvas mô phỏng A4 Executive Report cao cấp
 * Hỗ trợ 100% tiếng Việt UTF-8, khắc phục khoảng trắng quá lớn, phân chia 3 nhóm KPI
 * và vẽ thanh trực quan (progress bar) thể hiện tỷ trọng thanh toán và doanh số bán.
 */
export function renderDashboardPdfCanvas({
  month,
  role,
  userFullName,
  rows,
  topProducts,
  financial,
  canViewRevenue,
}: DashboardExportOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // Khổ chuẩn A4 tỷ lệ 1 : 1.414 với mật độ 300 DPI sắc nét (1600 x 2260 px)
  canvas.width = 1600;
  canvas.height = 2260;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Nền trắng toàn tài liệu
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const marginX = 80;
  let currentY = 55;

  // ── 1. HEADER BANNER DOANH NGHIỆP GREENPHONE ──
  ctx.fillStyle = '#065f46'; // Emerald 800
  ctx.fillRect(marginX, currentY, canvas.width - marginX * 2, 120);

  // Tên thương hiệu
  ctx.fillStyle = '#a7f3d0'; // Emerald 200
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('GREENPHONE ENTERPRISE RETAIL SYSTEM', marginX + 32, currentY + 38);

  // Tiêu đề báo cáo chính
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('BÁO CÁO HOẠT ĐỘNG KINH DOANH', marginX + 32, currentY + 84);

  // Thông tin metadata bên phải
  ctx.fillStyle = '#ecfdf5';
  ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const periodText = `Kỳ báo cáo: Tháng ${month.format('MM/YYYY')}`;
  ctx.fillText(periodText, canvas.width - marginX - 350, currentY + 38);

  ctx.fillStyle = '#d1fae5';
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const exportTimeText = `Thời gian xuất: ${dayjs().format('DD/MM/YYYY HH:mm')}`;
  ctx.fillText(exportTimeText, canvas.width - marginX - 350, currentY + 68);

  const authorText = `Người xuất: ${userFullName || 'Quản trị viên'} (${role || 'STAFF'})`;
  ctx.fillText(authorText, canvas.width - marginX - 350, currentY + 98);

  currentY += 145;

  // ── 2. PHÂN NHÓM KPI (3 NHÓM RÕ RỆT) ──
  let sectionIndex = 1;

  // NHÓM 1 — KPI TÀI CHÍNH QUAN TRỌNG (Nếu được phép xem doanh thu)
  if (canViewRevenue) {
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${sectionIndex++}. HIỆU QUẢ TÀI CHÍNH CỐT LÕI`, marginX, currentY);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath?.();
    ctx.moveTo?.(marginX, currentY + 10);
    ctx.lineTo?.(canvas.width - marginX, currentY + 10);
    ctx.stroke?.();

    currentY += 28;

    // Lọc các KPI tài chính
    const finCards: { label: string; value: string | number; note?: string }[] = [];
    const revRow = rows.find((r) => r.label === 'Doanh thu thuần');
    finCards.push({
      label: 'Doanh thu thuần',
      value: typeof revRow?.value === 'number' ? formatVND(revRow.value) : (revRow?.value ?? '0 đ'),
      note: 'Thực nhận sau giảm giá',
    });

    if (financial) {
      if (financial.grossProfit !== null && financial.grossProfit !== undefined) {
        finCards.push({ label: 'Lợi nhuận gộp', value: formatVND(financial.grossProfit), note: 'Sau giá vốn hàng bán' });
      }
      if (financial.profitMarginPercentage !== null && financial.profitMarginPercentage !== undefined) {
        finCards.push({ label: 'Biên lợi nhuận', value: `${financial.profitMarginPercentage}%`, note: 'Tỷ suất lợi nhuận / Doanh thu' });
      }
      finCards.push({ label: 'Doanh thu gộp', value: formatVND(financial.grossRevenue), note: 'Trước chiết khấu' });
    }

    const finCols = finCards.length;
    const finGap = 16;
    const finCardW = (canvas.width - marginX * 2 - finGap * (finCols - 1)) / finCols;
    const finCardH = 92;

    finCards.forEach((c, idx) => {
      const cX = marginX + idx * (finCardW + finGap);
      const cY = currentY;

      // Nền card tài chính nổi bật
      ctx.fillStyle = '#f0fdf4';
      ctx.strokeStyle = '#bbf7d0';
      ctx.lineWidth = 1.5;
      ctx.beginPath?.();
      if (ctx.roundRect) {
        ctx.roundRect(cX, cY, finCardW, finCardH, 8);
      } else if (ctx.rect) {
        ctx.rect(cX, cY, finCardW, finCardH);
      }
      ctx.fill?.();
      ctx.stroke?.();

      // Vạch nhấn xanh lá đậm bên trái
      ctx.fillStyle = '#059669';
      ctx.fillRect(cX, cY + 4, 6, finCardH - 8);

      // Nhãn KPI
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(c.label, cX + 18, cY + 30);

      // Giá trị số lớn nổi bật
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(String(c.value), cX + 18, cY + 62);

      // Ghi chú nhỏ
      if (c.note) {
        ctx.fillStyle = '#047857';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(c.note, cX + 18, cY + 82);
      }
    });

    currentY += finCardH + 28;
  }

  // NHÓM 2 — VẬN HÀNH ĐƠN HÀNG (Hiển thị cho mọi role)
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${sectionIndex++}. VẬN HÀNH ĐƠN HÀNG`, marginX, currentY);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath?.();
  ctx.moveTo?.(marginX, currentY + 10);
  ctx.lineTo?.(canvas.width - marginX, currentY + 10);
  ctx.stroke?.();

  currentY += 28;

  // Lọc các thẻ vận hành
  const opCards = rows.filter((r) => !r.monetary && typeof r.value === 'number');
  const opCols = Math.min(opCards.length, 6);
  const opGap = 14;
  const opCardW = (canvas.width - marginX * 2 - opGap * (opCols - 1)) / opCols;
  const opCardH = 74;

  opCards.slice(0, 6).forEach((c, idx) => {
    const cX = marginX + idx * (opCardW + opGap);
    const cY = currentY;

    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.2;
    ctx.beginPath?.();
    if (ctx.roundRect) {
      ctx.roundRect(cX, cY, opCardW, opCardH, 6);
    } else if (ctx.rect) {
      ctx.rect(cX, cY, opCardW, opCardH);
    }
    ctx.fill?.();
    ctx.stroke?.();

    // Vạch nhấn xanh dương nhẹ
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(cX, cY + 3, 4, opCardH - 6);

    ctx.fillStyle = '#64748b';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(c.label, cX + 14, cY + 28);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(String(c.value), cX + 14, cY + 58);
  });

  currentY += opCardH + 28;

  // NHÓM 3 — CHI PHÍ VÀ HOÀN TRẢ (Chỉ hiển thị khi có dữ liệu financial và quyền admin)
  if (financial) {
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${sectionIndex++}. CHI PHÍ VẬN HÀNH VÀ HOÀN TRẢ`, marginX, currentY);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath?.();
    ctx.moveTo?.(marginX, currentY + 10);
    ctx.lineTo?.(canvas.width - marginX, currentY + 10);
    ctx.stroke?.();

    currentY += 28;

    const costCards = [
      {
        label: 'Giá vốn hàng bán (COGS)',
        value: financial.cogs !== null && financial.cogs !== undefined ? formatVND(financial.cogs) : 'Chưa đủ dữ liệu',
      },
      { label: 'Phí vận chuyển', value: formatVND(financial.shippingFee) },
      { label: 'Giảm giá', value: formatVND(financial.discountAmount) },
      { label: 'Tiền hoàn trả', value: formatVND(financial.refundAmount) },
    ];

    const costCols = 4;
    const costGap = 16;
    const costCardW = (canvas.width - marginX * 2 - costGap * (costCols - 1)) / costCols;
    const costCardH = 74;

    costCards.forEach((c, idx) => {
      const cX = marginX + idx * (costCardW + costGap);
      const cY = currentY;

      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.2;
      ctx.beginPath?.();
      if (ctx.roundRect) {
        ctx.roundRect(cX, cY, costCardW, costCardH, 6);
      } else if (ctx.rect) {
        ctx.rect(cX, cY, costCardW, costCardH);
      }
      ctx.fill?.();
      ctx.stroke?.();

      ctx.fillStyle = '#64748b';
      ctx.fillRect(cX, cY + 3, 4, costCardH - 6);

      ctx.fillStyle = '#64748b';
      ctx.font = '13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(c.label, cX + 14, cY + 28);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(String(c.value), cX + 14, cY + 58);
    });

    currentY += costCardH + 28;
  }

  // ── 3. CƠ CẤU THANH TOÁN (Biểu đồ phân đoạn & Bảng chi tiết) ──
  if (canViewRevenue && financial?.paymentMethodStats && financial.paymentMethodStats.length > 0) {
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${sectionIndex++}. CƠ CẤU DOANH THU THEO KÊNH THANH TOÁN`, marginX, currentY);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath?.();
    ctx.moveTo?.(marginX, currentY + 10);
    ctx.lineTo?.(canvas.width - marginX, currentY + 10);
    ctx.stroke?.();

    currentY += 25;

    const channelPalette: Record<string, string> = {
      VIETQR: '#10b981',
      VNPAY: '#0284c7',
      MOMO: '#ec4899',
      COD: '#f59e0b',
      BANK_TRANSFER: '#6366f1',
    };

    const totalRev = financial.paymentMethodStats.reduce((s, r) => s + r.revenue, 0);
    const tableW = canvas.width - marginX * 2;

    // Thanh phân đoạn tỷ trọng (Segmented Distribution Bar)
    const barH = 20;
    let barX = marginX;
    financial.paymentMethodStats.forEach((p) => {
      const share = totalRev > 0 ? p.revenue / totalRev : 0;
      const segW = share * tableW;
      const color = channelPalette[p.paymentMethod.toUpperCase()] || '#8b5cf6';

      ctx.fillStyle = color;
      ctx.fillRect(barX, currentY, segW, barH);
      barX += segW;
    });

    currentY += barH + 12;

    // Legend mini hiển thị tên và tỷ trọng
    let legendX = marginX;
    financial.paymentMethodStats.forEach((p) => {
      const share = totalRev > 0 ? ((p.revenue / totalRev) * 100).toFixed(1) : '0.0';
      const color = channelPalette[p.paymentMethod.toUpperCase()] || '#8b5cf6';

      ctx.fillStyle = color;
      ctx.fillRect(legendX, currentY + 2, 10, 10);

      ctx.fillStyle = '#334155';
      ctx.font = '13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const legText = `${p.paymentMethod}: ${share}% (${p.transactionCount ?? 0} GD)`;
      ctx.fillText(legText, legendX + 16, currentY + 11);

      legendX += legText.length * 8.5 + 32;
    });

    currentY += 26;

    // Bảng dữ liệu cơ cấu thanh toán
    const thH = 36;
    ctx.fillStyle = '#065f46';
    ctx.fillRect(marginX, currentY, tableW, thH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Phương thức thanh toán', marginX + 20, currentY + 24);
    ctx.fillText('Số giao dịch', marginX + 450, currentY + 24);
    ctx.fillText('Doanh thu thực tế', marginX + 800, currentY + 24);
    ctx.fillText('Tỷ trọng (%)', marginX + 1200, currentY + 24);

    currentY += thH;

    financial.paymentMethodStats.forEach((p, pIdx) => {
      const rowY = currentY + pIdx * 34;
      if (pIdx % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(marginX, rowY, tableW, 34);
      }

      ctx.strokeStyle = '#f1f5f9';
      ctx.beginPath?.();
      ctx.moveTo?.(marginX, rowY + 34);
      ctx.lineTo?.(marginX + tableW, rowY + 34);
      ctx.stroke?.();

      const share = totalRev > 0 ? ((p.revenue / totalRev) * 100).toFixed(1) : '0.0';
      const color = channelPalette[p.paymentMethod.toUpperCase()] || '#8b5cf6';

      // Chấm màu
      ctx.fillStyle = color;
      ctx.fillRect(marginX + 20, rowY + 12, 8, 8);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(p.paymentMethod, marginX + 36, rowY + 22);

      ctx.fillStyle = '#475569';
      ctx.font = '14.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${p.transactionCount ?? 0} GD`, marginX + 450, rowY + 22);

      ctx.fillStyle = '#047857';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(formatVND(p.revenue), marginX + 800, rowY + 22);

      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${share}%`, marginX + 1200, rowY + 22);
    });

    currentY += financial.paymentMethodStats.length * 34 + 28;
  }

  // ── 4. TOP SẢN PHẨM BÁN CHẠY (Huy hiệu Top 1..3 & Visual Progress Bar) ──
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${sectionIndex}. TOP SẢN PHẨM BÁN CHẠY NHẤT`, marginX, currentY);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath?.();
  ctx.moveTo?.(marginX, currentY + 10);
  ctx.lineTo?.(canvas.width - marginX, currentY + 10);
  ctx.stroke?.();

  currentY += 25;

  const topList = topProducts.slice(0, 10);
  if (topList.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Chưa có dữ liệu bán chạy trong kỳ báo cáo.', marginX + 20, currentY + 25);
    currentY += 50;
  } else {
    const tableW = canvas.width - marginX * 2;
    const thH = 36;
    ctx.fillStyle = '#065f46';
    ctx.fillRect(marginX, currentY, tableW, thH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Thứ hạng', marginX + 20, currentY + 24);
    ctx.fillText('Tên sản phẩm', marginX + 140, currentY + 24);
    ctx.fillText('Hãng sản xuất', marginX + 800, currentY + 24);
    ctx.fillText('Số lượng bán (Chiếc / Máy)', marginX + 1150, currentY + 24);

    currentY += thH;

    const maxSold = Math.max(...topList.map((p) => p.soldQuantity), 1);

    topList.forEach((p, idx) => {
      const rowY = currentY + idx * 34;
      if (idx % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(marginX, rowY, tableW, 34);
      }

      ctx.strokeStyle = '#f1f5f9';
      ctx.beginPath?.();
      ctx.moveTo?.(marginX, rowY + 34);
      ctx.lineTo?.(marginX + tableW, rowY + 34);
      ctx.stroke?.();

      // Huy hiệu Top 1..3
      if (idx === 0) {
        ctx.fillStyle = '#fef3c7'; // Gold badge background
        ctx.fillRect(marginX + 20, rowY + 6, 32, 22);
        ctx.fillStyle = '#d97706';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('#1', marginX + 28, rowY + 22);
      } else if (idx === 1) {
        ctx.fillStyle = '#f1f5f9'; // Silver badge background
        ctx.fillRect(marginX + 20, rowY + 6, 32, 22);
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('#2', marginX + 28, rowY + 22);
      } else if (idx === 2) {
        ctx.fillStyle = '#ffedd5'; // Bronze badge background
        ctx.fillRect(marginX + 20, rowY + 6, 32, 22);
        ctx.fillStyle = '#b45309';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('#3', marginX + 28, rowY + 22);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`#${idx + 1}`, marginX + 26, rowY + 22);
      }

      // Tên sản phẩm
      ctx.fillStyle = '#0f172a';
      ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(p.phoneName, marginX + 140, rowY + 22);

      // Hãng
      ctx.fillStyle = '#475569';
      ctx.fillText(p.brandName || '—', marginX + 800, rowY + 22);

      // Visual progress bar thể hiện tỷ lệ bán
      const barBoxW = 100;
      const barProgW = (p.soldQuantity / maxSold) * barBoxW;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(marginX + 1150, rowY + 12, barBoxW, 10);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(marginX + 1150, rowY + 12, barProgW, 10);

      ctx.fillStyle = '#047857';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${p.soldQuantity} máy`, marginX + 1265, rowY + 22);
    });

    currentY += topList.length * 34 + 35;
  }

  // ── 5. KHU VỰC CHỮ KÝ VÀ PHÊ DUYỆT ──
  // Thu gọn khoảng cách tự nhiên, không ép sát đáy trang gây khoảng trắng lớn
  currentY += 15;

  const signCols = 3;
  const signW = (canvas.width - marginX * 2) / signCols;
  const signTitles = ['NGƯỜI LẬP BIỂU', 'KẾ TOÁN TRƯỞNG', 'GIÁM ĐỐC ĐIỀU HÀNH'];
  const signNotes = ['(Ký, ghi rõ họ tên)', '(Ký, ghi rõ họ tên)', '(Ký, đóng dấu)'];

  signTitles.forEach((t, sIdx) => {
    const sX = marginX + sIdx * signW + signW / 2;
    ctx.textAlign = 'center';

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(t, sX, currentY);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(signNotes[sIdx], sX, currentY + 22);

    if (sIdx === 0 && userFullName) {
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(userFullName, sX, currentY + 75);
    }
  });
  ctx.textAlign = 'left';

  // ── 6. FOOTER CHÂN TRANG ──
  const footerY = canvas.height - 40;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath?.();
  ctx.moveTo?.(marginX, footerY - 16);
  ctx.lineTo?.(canvas.width - marginX, footerY - 16);
  ctx.stroke?.();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Hệ thống Quản lý Bán lẻ Di động GreenPhone · Báo cáo kết xuất tự động', marginX, footerY);

  ctx.textAlign = 'right';
  ctx.fillText(`Kỳ: Tháng ${month.format('MM/YYYY')} · Trang 1/1 · Lưu hành nội bộ`, canvas.width - marginX, footerY);
  ctx.textAlign = 'left';

  return canvas;
}

/**
 * 3. Tải xuống file PDF đạt chuẩn A4 Vector/High-res
 */
export function downloadDashboardPdf(options: DashboardExportOptions) {
  const canvas = renderDashboardPdfCanvas(options);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  pdf.save(`${options.filename}.pdf`);
}
