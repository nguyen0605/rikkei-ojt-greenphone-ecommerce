import { DollarOutlined, FundOutlined, PercentageOutlined, WalletOutlined } from '@ant-design/icons';
import type { FinancialReport } from '@/types/api';
import { formatVND } from '@/utils';
import DashboardMetricCard from './DashboardMetricCard';

export default function FinancialKpiCards({ report }: { report: FinancialReport }) {
  return <div className="dashboard-financial-grid">
    <DashboardMetricCard label="Doanh thu thuần" value={formatVND(report.netRevenue)} icon={<DollarOutlined />} tone="green" hint="Doanh thu tiền hàng đã thanh toán sau giảm giá, không gồm phí vận chuyển." />
    <DashboardMetricCard label="Lợi nhuận gộp" value={report.grossProfit == null ? 'Chưa đủ dữ liệu' : formatVND(report.grossProfit)} icon={<FundOutlined />} tone="blue" hint="Doanh thu thuần trừ giá vốn hàng bán." />
    <DashboardMetricCard label="Biên lợi nhuận" value={report.profitMarginPercentage == null ? 'Chưa đủ dữ liệu' : `${report.profitMarginPercentage}%`} icon={<PercentageOutlined />} tone="green" hint="Tỷ lệ lợi nhuận gộp trên doanh thu thuần." />
    <DashboardMetricCard label="Giá vốn hàng bán (COGS)" value={report.cogs == null ? 'Chưa đủ dữ liệu' : formatVND(report.cogs)} icon={<WalletOutlined />} hint="Giá vốn đã lưu tại thời điểm tạo đơn, nhân với số lượng bán." />
  </div>;
}
