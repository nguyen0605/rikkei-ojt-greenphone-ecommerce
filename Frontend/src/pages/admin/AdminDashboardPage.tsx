import { useEffect, useState } from 'react';
import type { ComponentPropsWithRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, DatePicker, Empty, Skeleton, Table } from 'antd';
import { AppstoreOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, DollarOutlined, FileExcelOutlined, FilePdfOutlined, InboxOutlined, ReloadOutlined, RollbackOutlined, ShoppingCartOutlined, TruckOutlined } from '@ant-design/icons';
import DashboardMetricCard, { type MetricTone } from '@/components/admin/dashboard/DashboardMetricCard';
import '@/components/admin/dashboard/dashboard.css';
import dayjs, { type Dayjs } from 'dayjs';
import { formatVND } from '@/utils';
import { adminStatisticsService } from '@/services/adminStatisticsService';
import { useAppSelector } from '@/store/hooks';
import FinancialKpiCards from '@/components/admin/dashboard/FinancialKpiCards';
import RevenueLineChart from '@/components/admin/dashboard/RevenueLineChart';
import PaymentMethodPieChart from '@/components/admin/dashboard/PaymentMethodPieChart';
import DashboardPdfPreviewModal from '@/components/admin/dashboard/DashboardPdfPreviewModal';
import { exportDashboardExcel, downloadDashboardPdf } from '@/utils/dashboardExportUtils';

function KeyboardAccessibleTable(props: ComponentPropsWithRef<'table'>) {
  return <table {...props} tabIndex={0} aria-label="Bảng sản phẩm bán chạy, dùng phím mũi tên để cuộn" />;
}

export default function AdminDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.role?.replace(/^ROLE_/, '');
  const queryClient = useQueryClient();
  const isAdmin = role === 'ADMIN';
  const staff = ['ADMIN', 'SALES', 'MARKETING', 'WAREHOUSE'].includes(role ?? '');
  const canViewRevenue = ['ADMIN', 'SALES', 'MARKETING'].includes(role ?? '');
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const from = month.startOf('month').toISOString().replace('Z', '');
  const to = month.startOf('month').add(1, 'month').toISOString().replace('Z', '');
  const scope = [user?.id, role, from, to];
  const orders = useQuery({ queryKey: ['stats-orders', ...scope], queryFn: () => adminStatisticsService.orders(from, to), enabled: staff });
  const top = useQuery({ queryKey: ['stats-top', ...scope], queryFn: () => adminStatisticsService.topSelling(10, from, to), enabled: staff });
  const revenue = useQuery({ queryKey: ['stats-revenue', ...scope], queryFn: () => adminStatisticsService.revenue('month', from, to), enabled: canViewRevenue && !isAdmin });
  const finance = useQuery({ queryKey: ['stats-financial', ...scope], queryFn: () => adminStatisticsService.financialReport('month', from, to), enabled: isAdmin, gcTime: 0 });
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ['stats-financial'], predicate: (query) => !isAdmin || query.queryKey[1] !== user?.id });
  }, [queryClient, user?.id, isAdmin]);
  const financial = isAdmin ? finance.data : undefined;
  const amount = isAdmin ? financial?.netRevenue : canViewRevenue ? revenue.data?.totalRevenue : undefined;
  const points = isAdmin ? financial?.timeSeriesData : canViewRevenue ? revenue.data?.timeSeriesData : undefined;
  const loading = orders.isLoading || top.isLoading || (isAdmin && finance.isLoading) || (canViewRevenue && !isAdmin && revenue.isLoading);
  const failed = orders.isError || top.isError || (isAdmin && finance.isError) || (canViewRevenue && !isAdmin && revenue.isError);
  const rows: { label: string; value: number | string; monetary?: boolean }[] = [
    { label: 'Đơn hàng', value: orders.data?.totalOrders ?? 0 },
    { label: 'Chờ đóng gói', value: orders.data?.processingOrders ?? 0 },
    { label: 'Đang giao', value: orders.data?.shippingOrders ?? 0 },
    { label: 'Đã giao', value: orders.data?.deliveredOrders ?? 0 },
    { label: 'Chờ xác nhận', value: orders.data?.pendingOrders ?? 0 },
    { label: 'Đã hủy', value: orders.data?.cancelledOrders ?? 0 },
  ];
  if (canViewRevenue) rows.unshift({ label: 'Doanh thu thuần', value: amount ?? 0, monetary: true });
  if (financial) rows.push(
    { label: 'Doanh thu gộp', value: financial.grossRevenue, monetary: true },
    { label: 'Giảm giá', value: financial.discountAmount, monetary: true },
    { label: 'Phí vận chuyển', value: financial.shippingFee, monetary: true },
    { label: 'Giá vốn hàng bán (COGS)', value: financial.cogs ?? 'Chưa đủ dữ liệu', monetary: true },
    { label: 'Lợi nhuận gộp', value: financial.grossProfit ?? 'Chưa đủ dữ liệu', monetary: true },
    { label: 'Biên lợi nhuận', value: financial.profitMarginPercentage == null ? 'Chưa đủ dữ liệu' : `${financial.profitMarginPercentage}%` },
    { label: 'Tiền hoàn trả', value: financial.refundAmount, monetary: true },
  );
  const filename = `dashboard-${month.format('YYYY-MM')}`;

  function exportExcel() {
    exportDashboardExcel({
      month,
      filename,
      role,
      userFullName: user?.fullName,
      rows,
      topProducts: top.data ?? [],
      financial,
      points,
      isAdmin,
      canViewRevenue,
    });
  }

  function downloadPdf() {
    downloadDashboardPdf({
      month,
      filename,
      role,
      userFullName: user?.fullName,
      rows,
      topProducts: top.data ?? [],
      financial,
      points,
      isAdmin,
      canViewRevenue,
    });
  }

  function exportPdf() {
    setPdfPreviewOpen(true);
  }
  if (!staff) return <Alert type="warning" title="Bạn không có quyền xem thống kê" />;
  const operations = [
    { label: 'Đơn hàng', value: orders.data?.totalOrders ?? 0, icon: <ShoppingCartOutlined />, tone: 'slate' },
    { label: 'Chờ xác nhận', value: orders.data?.pendingOrders ?? 0, icon: <ClockCircleOutlined />, tone: 'amber' },
    { label: 'Chờ đóng gói', value: orders.data?.processingOrders ?? 0, icon: <InboxOutlined />, tone: 'blue' },
    { label: 'Đang giao', value: orders.data?.shippingOrders ?? 0, icon: <TruckOutlined />, tone: 'blue' },
    { label: 'Đã giao', value: orders.data?.deliveredOrders ?? 0, icon: <CheckCircleOutlined />, tone: 'green' },
    { label: 'Đã hủy', value: orders.data?.cancelledOrders ?? 0, icon: <CloseCircleOutlined />, tone: 'red' },
  ];
  return <div className="dashboard-overview">
    <header className="dashboard-header">
      <div>
        <div className="dashboard-eyebrow"><AppstoreOutlined /> GreenPhone Analytics</div>
        <h1>Tổng quan</h1><p className="dashboard-subtitle">Tổng quan hoạt động kinh doanh theo thời gian.</p>
      </div>
      <div className="dashboard-toolbar" role="group" aria-label="Bộ lọc và xuất báo cáo">
        <DatePicker aria-label="Tháng báo cáo" picker="month" format="MM / YYYY" value={month} allowClear={false} onChange={(value) => value && setMonth(value)} />
        <Button aria-label="Xuất Excel" className="dashboard-excel" icon={<FileExcelOutlined />} disabled={loading || failed} onClick={exportExcel}>Xuất Excel</Button>
        <Button aria-label="Xuất PDF" icon={<FilePdfOutlined />} disabled={loading || failed} onClick={exportPdf}>Xuất PDF</Button>
      </div>
    </header>
    {failed && <Alert type="error" showIcon title="Không thể tải báo cáo" description="Vui lòng thử lại." action={<Button aria-label="Thử lại" icon={<ReloadOutlined />} onClick={() => { void orders.refetch(); void top.refetch(); if (isAdmin) void finance.refetch(); else if (canViewRevenue) void revenue.refetch(); }}>Thử lại</Button>} />}
    {loading ? <div className="dashboard-loading" role="status" aria-label="Đang tải báo cáo"><Skeleton active paragraph={{ rows: 6 }} /></div> : failed ? null : <>
      {canViewRevenue && <section aria-labelledby="business-heading">
        <div className="dashboard-section-heading"><h2 id="business-heading">Hiệu quả kinh doanh</h2><span className="dashboard-period">Tháng {month.format('MM/YYYY')}</span></div>
        {financial ? <FinancialKpiCards report={financial} /> : <DashboardMetricCard label="Doanh thu thuần" value={formatVND(amount ?? 0)} icon={<DollarOutlined />} tone="green" hint="Doanh thu tiền hàng đã thanh toán sau giảm giá, không gồm phí vận chuyển." />}
        {financial && financial.uncostedQuantity > 0 && <div className="mt-4"><Alert type="warning" showIcon title="Chưa đủ dữ liệu giá vốn" description={`${financial.uncostedQuantity} sản phẩm chưa có giá vốn tại thời điểm bán; chưa thể xác định đầy đủ lợi nhuận.`} /></div>}
      </section>}
      <section aria-labelledby="operations-heading">
        <div className="dashboard-section-heading"><h2 id="operations-heading">Vận hành đơn hàng</h2><span className="dashboard-panel-subtitle">Số lượng theo trạng thái</span></div>
        <div className="dashboard-operations-grid">{operations.map((item) => <DashboardMetricCard key={item.label} {...item} tone={item.tone as MetricTone} compact />)}</div>
      </section>
      {financial && <section className="dashboard-refund" aria-label="Thống kê hoàn trả">
        <span className="dashboard-refund-icon" aria-hidden="true"><RollbackOutlined /></span>
        <div><div className="dashboard-refund-label">Tiền hoàn trả</div><p>Khoản hoàn tiền đã hoàn tất trong kỳ</p></div>
        <strong className="dashboard-refund-value">{formatVND(financial.refundAmount)}</strong>
      </section>}
      {canViewRevenue && <div className={isAdmin ? 'dashboard-charts' : ''}>
        <RevenueLineChart data={points ?? []} showProfit={isAdmin} />
        {financial && <PaymentMethodPieChart data={financial.paymentMethodStats} />}
      </div>}
    </>}
    <Card className="dashboard-panel" title={<div><div className="dashboard-panel-title">Top 10 sản phẩm bán chạy</div><div className="dashboard-panel-subtitle">Xếp hạng theo số lượng bán trong tháng {month.format('MM/YYYY')}</div></div>}>
      <Table components={{ table: KeyboardAccessibleTable }} dataSource={top.data ?? []} rowKey="phoneId" pagination={false} loading={top.isLoading} scroll={{ x: 440 }} locale={{ emptyText: <Empty description="Chưa có sản phẩm bán chạy" /> }} columns={[
        { title: '#', width: 56, render: (_, __, index) => <span className={`dashboard-rank ${index < 3 ? 'dashboard-rank--top' : ''}`}>{String(index + 1).padStart(2, '0')}</span> },
        { title: 'Sản phẩm', dataIndex: 'phoneName', render: (name: string) => <span className="font-medium text-slate-800">{name}</span> },
        { title: 'Hãng', dataIndex: 'brandName' },
        { title: 'Đã bán', dataIndex: 'soldQuantity', align: 'right', render: (quantity: number) => <span className="dashboard-sold">{quantity}</span> },
      ]} />
    </Card>
    <DashboardPdfPreviewModal
      open={pdfPreviewOpen}
      onClose={() => setPdfPreviewOpen(false)}
      onDownload={downloadPdf}
      month={month}
      rows={rows}
      topProducts={top.data ?? []}
      financial={financial}
      role={role}
      userFullName={user?.fullName}
      filename={filename}
    />
  </div>;
}
