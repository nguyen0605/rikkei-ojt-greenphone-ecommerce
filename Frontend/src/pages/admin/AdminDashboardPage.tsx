import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Spin, DatePicker, Button, message } from 'antd';
import { PhoneOutlined, ShoppingCartOutlined, DollarOutlined, CloseCircleOutlined, CheckCircleOutlined, RiseOutlined, DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { adminStatisticsService } from '@/services';
import type { TopSellingPhone } from '@/types/api';
import { formatVND } from '@/utils';
import dayjs, { type Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

/* Hallmark · macrostructure: Workbench (stats row + table) · tone: modern-minimal · anchor hue: green
 * Month filter + Excel/PDF export.
 */

const statCards = [
  { key: 'revenue', title: 'Doanh thu', prefix: <DollarOutlined />, formatter: (v: number) => formatVND(v), className: 'from-primary-500 to-primary-700' },
  { key: 'orders', title: 'Đơn hàng', prefix: <ShoppingCartOutlined />, formatter: (v: number) => String(v), className: 'from-emerald-500 to-teal-700' },
  { key: 'delivered', title: 'Đã giao', prefix: <CheckCircleOutlined />, formatter: (v: number) => String(v), className: 'from-green-500 to-emerald-700' },
  { key: 'cancelled', title: 'Đã hủy', prefix: <CloseCircleOutlined />, formatter: (v: number) => String(v), className: 'from-neutral-500 to-neutral-700' },
];

export default function AdminDashboardPage() {
  // ── Month filter (mặc định tháng hiện tại) ──
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const from = month.startOf('month');
  const to = month.endOf('month');
  const fromStr = from.toISOString();
  const toStr = to.toISOString();
  const monthLabel = month.format('MM/YYYY');

  const { data: revenue, isLoading: revLoading } = useQuery({
    queryKey: ['stats-revenue', fromStr, toStr],
    queryFn: () => adminStatisticsService.revenue('month', fromStr, toStr),
  });
  const { data: orders, isLoading: ordLoading } = useQuery({
    queryKey: ['stats-orders', fromStr, toStr],
    queryFn: () => adminStatisticsService.orders(fromStr, toStr),
  });
  const { data: topSelling, isLoading: topLoading } = useQuery({
    queryKey: ['stats-top', fromStr, toStr],
    queryFn: () => adminStatisticsService.topSelling(10, fromStr, toStr),
  });

  const stats = {
    revenue: revenue?.totalRevenue || 0,
    orders: orders?.totalOrders || 0,
    delivered: orders?.deliveredOrders || 0,
    cancelled: orders?.cancelledOrders || 0,
  };

  // ── Export Excel ──
  const exportExcel = () => {
    const rows = [
      { 'Chỉ số': 'Doanh thu', 'Giá trị': stats.revenue },
      { 'Chỉ số': 'Đơn hàng', 'Giá trị': stats.orders },
      { 'Chỉ số': 'Đã giao', 'Giá trị': stats.delivered },
      { 'Chỉ số': 'Đã hủy', 'Giá trị': stats.cancelled },
    ];
    const topRows = (topSelling || []).map((p, i) => ({
      'Top': i + 1,
      'Sản phẩm': p.phoneName,
      'Hãng': p.brandName,
      'Đã bán': p.soldQuantity,
    }));
    const ws1 = XLSX.utils.json_to_sheet(rows);
    const ws2 = XLSX.utils.json_to_sheet(topRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Chỉ số');
    XLSX.utils.book_append_sheet(wb, ws2, 'Top bán chạy');
    XLSX.writeFile(wb, `dashboard-${monthLabel.replace('/', '-')}.xlsx`);
    message.success('Đã xuất Excel');
  };

  // ── Export PDF ──
  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('GreenPhone — Tổng quan', 14, 20);
    doc.setFontSize(12);
    doc.text(`Tháng ${monthLabel}`, 14, 30);
    doc.setFontSize(11);
    doc.text(`Doanh thu: ${formatVND(stats.revenue)}`, 14, 42);
    doc.text(`Đơn hàng: ${stats.orders}`, 14, 50);
    doc.text(`Đã giao: ${stats.delivered}`, 14, 58);
    doc.text(`Đã hủy: ${stats.cancelled}`, 14, 66);
    doc.text('Top sản phẩm bán chạy:', 14, 80);
    (topSelling || []).slice(0, 10).forEach((p, i) => {
      doc.text(`${i + 1}. ${p.phoneName} (${p.brandName}) — ${p.soldQuantity}`, 14, 90 + i * 8);
    });
    doc.save(`dashboard-${monthLabel.replace('/', '-')}.pdf`);
    message.success('Đã xuất PDF');
  };

  return (
    <div className="space-y-6">
      {/* Page header + month filter + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tổng quan</h1>
          <p className="mt-0.5 text-sm text-ink-2">Hoạt động kinh doanh tháng {monthLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker
            picker="month"
            value={month}
            onChange={(v) => v && setMonth(v)}
            allowClear={false}
            className="!rounded-full"
          />
          <Button icon={<FileExcelOutlined />} onClick={exportExcel} className="!rounded-full !border-green-600 !text-green-600 hover:!border-green-700 hover:!text-green-700">
            Xuất Excel
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={exportPdf} className="!rounded-full !border-red-500 !text-red-500 hover:!border-red-600 hover:!text-red-600">
            Xuất PDF
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.key}
            className="group relative overflow-hidden rounded-2xl border border-rule bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br ${s.className} opacity-[0.08] transition-transform duration-300 group-hover:scale-125`} />
            <div className="relative">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                {s.prefix}
              </div>
              <div className="text-xs font-medium uppercase tracking-wide text-ink-2">{s.title} {s.key === 'revenue' ? monthLabel : ''}</div>
              {revLoading || ordLoading ? (
                <div className="mt-1 h-7 w-24 rounded bg-bg-muted animate-pulse-soft" />
              ) : (
                <div className="mt-1 text-2xl font-bold tracking-tight text-ink">{s.formatter(stats[s.key as keyof typeof stats])}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Top selling */}
      <div className="overflow-hidden rounded-2xl border border-rule bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Top sản phẩm bán chạy ({monthLabel})</h2>
          <PhoneOutlined className="text-lg text-primary-600" />
        </div>
        <Table<TopSellingPhone>
          dataSource={topSelling || []}
          rowKey="phoneId"
          pagination={false}
          size="middle"
          loading={topLoading}
          locale={{ emptyText: <Spin /> }}
          columns={[
            {
              title: '#',
              width: 56,
              render: (_, __, index) => (
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${index < 3 ? 'bg-primary-50 text-primary-700' : 'bg-bg-muted text-ink-2'}`}>
                  {index + 1}
                </span>
              ),
            },
            { title: 'Sản phẩm', dataIndex: 'phoneName', render: (v: string) => <span className="font-medium text-ink">{v}</span> },
            { title: 'Hãng', dataIndex: 'brandName', render: (v: string) => <span className="rounded-full bg-bg-muted px-2.5 py-0.5 text-xs font-medium text-ink-2">{v}</span> },
            {
              title: 'Đã bán',
              dataIndex: 'soldQuantity',
              align: 'right' as const,
              render: (v: number) => (
                <span className="inline-flex items-center gap-1 font-semibold text-ink">
                  {v}
                  <RiseOutlined className="text-xs text-primary-600" />
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
