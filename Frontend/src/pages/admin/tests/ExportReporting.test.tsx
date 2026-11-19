import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { exportFinancialExcel } from '@/utils/exportFinancialExcel';
import { exportFinancialPdf } from '@/utils/exportFinancialPdf';
import type { FinancialReport, OrderStats, TopSellingPhone } from '@/types/api';

vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>();
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

const mockPdfSave = vi.fn();
vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>();
  return {
    ...actual,
    jsPDF: class MockJsPDF extends (actual.jsPDF as any) {
      constructor(...args: any[]) {
        super(...args);
        this.save = mockPdfSave;
      }
    },
  };
});

describe('ORD-34: Export Reporting Upgrade & Role-based Sanitization', () => {
  const mockOrders: OrderStats = {
    totalOrders: 150,
    deliveredOrders: 120,
    shippingOrders: 15,
    processingOrders: 8,
    pendingOrders: 5,
    cancelledOrders: 2,
    confirmedOrders: 140,
    period: 'month',
  };

  const mockTopSelling: TopSellingPhone[] = [
    {
      phoneId: 1,
      phoneName: 'iPhone 15 Pro Max 256GB',
      brandName: 'Apple',
      soldQuantity: 45,
      mainImageUrl: 'iphone15.jpg',
    },
    {
      phoneId: 2,
      phoneName: 'Samsung Galaxy S24 Ultra',
      brandName: 'Samsung',
      soldQuantity: 30,
      mainImageUrl: 's24.jpg',
    },
  ];

  const mockFinancial: FinancialReport = {
    grossRevenue: 500_000_000,
    discountAmount: 20_000_000,
    shippingFee: 5_000_000,
    netRevenue: 485_000_000,
    cogs: 350_000_000,
    grossProfit: 135_000_000,
    profitMarginPercentage: 27.84,
    refundAmount: 10_000_000,
    uncostedQuantity: 0,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    timeSeriesData: [
      { date: '2026-11-01', revenue: 15_000_000, grossProfit: 4_500_000 },
      { date: '2026-11-02', revenue: 20_000_000, grossProfit: 6_000_000 },
    ],
    paymentMethodStats: [
      { paymentMethod: 'VIETQR', revenue: 250_000_000 },
      { paymentMethod: 'VNPAY', revenue: 150_000_000 },
      { paymentMethod: 'COD', revenue: 85_000_000 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Excel Export (exportFinancialExcel)', () => {
    it('xuất đầy đủ 4 sheet và các chỉ số COGS, Lợi nhuận khi userRole là ROLE_ADMIN', () => {
      exportFinancialExcel({
        monthStr: '11-2026',
        userRole: 'ROLE_ADMIN',
        financial: mockFinancial,
        orders: mockOrders,
        topSelling: mockTopSelling,
        revenueTotal: 485_000_000,
      });

      expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
      const [savedWorkbook, savedFileName] = vi.mocked(XLSX.writeFile).mock.calls[0];

      expect(savedFileName).toBe('bao-cao-thang-11-2026-admin.xlsx');
      expect(savedWorkbook).toBeDefined();

      const sheetNames = (savedWorkbook as XLSX.WorkBook).SheetNames;
      expect(sheetNames).toContain('Tổng quan tài chính');
      expect(sheetNames).toContain('Chuỗi thời gian');
      expect(sheetNames).toContain('Cơ cấu thanh toán');
      expect(sheetNames).toContain('Top sản phẩm bán chạy');

      // Kiểm tra sheet 1 có COGS và Lợi nhuận gộp
      const sheet1 = (savedWorkbook as XLSX.WorkBook).Sheets['Tổng quan tài chính'];
      const sheet1Json = XLSX.utils.sheet_to_json(sheet1) as { 'Chỉ số': string; 'Giá trị': any }[];
      const indicators = sheet1Json.map((r) => r['Chỉ số']);
      expect(indicators).toContain('Giá vốn hàng bán (COGS)');
      expect(indicators).toContain('Lợi nhuận gộp');
      expect(indicators).toContain('Tỷ suất lợi nhuận');
    });

    it('bảo mật RBAC: loại bỏ hoàn toàn COGS và Lợi nhuận khi userRole là ROLE_SALES', () => {
      exportFinancialExcel({
        monthStr: '11-2026',
        userRole: 'ROLE_SALES',
        financial: mockFinancial,
        orders: mockOrders,
        topSelling: mockTopSelling,
        revenueTotal: 485_000_000,
      });

      expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
      const [savedWorkbook, savedFileName] = vi.mocked(XLSX.writeFile).mock.calls[0];

      expect(savedFileName).toBe('bao-cao-thang-11-2026-sales.xlsx');
      expect(savedWorkbook).toBeDefined();

      const sheet1 = (savedWorkbook as XLSX.WorkBook).Sheets['Tổng quan tài chính'];
      const sheet1Json = XLSX.utils.sheet_to_json(sheet1) as { 'Chỉ số': string; 'Giá trị': any }[];
      const indicators = sheet1Json.map((r) => r['Chỉ số']);

      // Không được rò rỉ COGS hoặc Lợi nhuận
      expect(indicators).not.toContain('Giá vốn hàng bán (COGS)');
      expect(indicators).not.toContain('Lợi nhuận gộp');
      expect(indicators).not.toContain('Tỷ suất lợi nhuận');

      // Vẫn có các chỉ số vận hành và doanh thu thuần
      expect(indicators).toContain('Tổng số đơn hàng');
      expect(indicators).toContain('Doanh thu thuần');
    });
  });

  describe('PDF Export (exportFinancialPdf)', () => {
    it('xuất file PDF với tên file chuẩn cho ROLE_ADMIN', () => {
      exportFinancialPdf({
        monthStr: '11-2026',
        userRole: 'ROLE_ADMIN',
        financial: mockFinancial,
        orders: mockOrders,
        topSelling: mockTopSelling,
        revenueTotal: 485_000_000,
      });

      expect(mockPdfSave).toHaveBeenCalledWith('bao-cao-thang-11-2026-admin.pdf');
    });

    it('bảo mật RBAC cho PDF: xuất tên file chuẩn cho ROLE_WAREHOUSE và không ném lỗi', () => {
      exportFinancialPdf({
        monthStr: '11-2026',
        userRole: 'ROLE_WAREHOUSE',
        financial: mockFinancial,
        orders: mockOrders,
        topSelling: mockTopSelling,
        revenueTotal: 485_000_000,
      });

      expect(mockPdfSave).toHaveBeenCalledWith('bao-cao-thang-11-2026-warehouse.pdf');
    });
  });
});
