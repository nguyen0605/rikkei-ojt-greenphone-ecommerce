import { useEffect, useState } from 'react';
import type { ComponentPropsWithRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, DatePicker, Empty, Skeleton, Table, message } from 'antd';
import { AppstoreOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, DollarOutlined, FileExcelOutlined, FilePdfOutlined, InboxOutlined, LoadingOutlined, ReloadOutlined, RollbackOutlined, ShoppingCartOutlined, TruckOutlined } from '@ant-design/icons';
import DashboardMetricCard, { type MetricTone } from '@/components/admin/dashboard/DashboardMetricCard';
import '@/components/admin/dashboard/dashboard.css';
import dayjs, { type Dayjs } from 'dayjs';
import { adminStatisticsService } from '@/services/adminStatisticsService';
import { useAppSelector } from '@/store/hooks';
import { formatVND } from '@/utils';
import FinancialKpiCards from '@/components/admin/dashboard/FinancialKpiCards';
import RevenueLineChart from '@/components/admin/dashboard/RevenueLineChart';
import PaymentMethodPieChart from '@/components/admin/dashboard/PaymentMethodPieChart';
import { exportFinancialExcel } from '@/utils/exportFinancialExcel';
// Dynamic import cho exportFinancialPdf để giảm kích thước bundle chunk chính (< 500KB)

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
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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

  // [ORD-34] Xuất báo cáo Excel đa sheet theo phân quyền RBAC
  const handleExportExcel = () => {
    if (isExportingExcel) return;
    try {
      setIsExportingExcel(true);
      exportFinancialExcel({
        monthStr: month.format('MM-YYYY'),
        userRole: user?.role,
        financial,
        orders: orders.data,
        topSelling: top.data ?? [],
        revenueTotal: amount ?? 0,
      });
      message.success('Xuất file Excel báo cáo thành công!');
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra khi xuất file Excel');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // [ORD-34] Xuất báo cáo PDF chuẩn doanh nghiệp (dùng Dynamic Import để tối ưu kích thước bundle < 500KB)
  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      // Tải động file PDF và font chữ khi người dùng bấm nút (tránh làm nặng trang ban đầu)
      const { exportFinancialPdf } = await import('@/utils/exportFinancialPdf');
      exportFinancialPdf({
        monthStr: month.format('MM-YYYY'),
        userRole: user?.role,
        financial,
        orders: orders.data,
        topSelling: top.data ?? [],
        revenueTotal: amount ?? 0,
      });
      message.success('Xuất file PDF báo cáo thành công!');
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra khi xuất file PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!staff) return <Alert type="warning" title="Bạn không có quyền xem thống kê" />;

  const operations = [
    { label: 'Đơn hàng', value: orders.data?.totalOrders ?? 0, icon: <ShoppingCartOutlined />, tone: 'slate' },
    { label: 'Chờ xác nhận', value: orders.data?.pendingOrders ?? 0, icon: <ClockCircleOutlined />, tone: 'amber' },
    { label: 'Chờ đóng gói', value: orders.data?.processingOrders ?? 0, icon: <InboxOutlined />, tone: 'blue' },
    { label: 'Đang giao', value: orders.data?.shippingOrders ?? 0, icon: <TruckOutlined />, tone: 'blue' },
    { label: 'Đã giao', value: orders.data?.deliveredOrders ?? 0, icon: <CheckCircleOutlined />, tone: 'green' },
    { label: 'Đã hủy', value: orders.data?.cancelledOrders ?? 0, icon: <CloseCircleOutlined />, tone: 'red' },
  ];

  return (
    <div className="dashboard-overview">
      <header className="dashboard-header">
        <div>
          <div className="dashboard-eyebrow"><AppstoreOutlined /> GreenPhone Analytics</div>
          <h1>Tổng quan</h1>
          <p className="dashboard-subtitle">Tổng quan hoạt động kinh doanh theo thời gian.</p>
        </div>
        <div className="dashboard-toolbar" role="group" aria-label="Bộ lọc và xuất báo cáo">
          {/* Nút làm mới dữ liệu báo cáo tổng quan */}
          <Button
            aria-label="Làm mới báo cáo"
            icon={<ReloadOutlined spin={loading} />}
            loading={loading}
            onClick={() => {
              void orders.refetch();
              void top.refetch();
              if (isAdmin) void finance.refetch();
              else if (canViewRevenue) void revenue.refetch();
              message.success('Đã làm mới dữ liệu tổng quan');
            }}
            className="!rounded-full hover:!border-primary-500 hover:!text-primary-600"
          >
            Làm mới
          </Button>
          <DatePicker
            aria-label="Tháng báo cáo"
            picker="month"
            format="MM / YYYY"
            value={month}
            allowClear={false}
            onChange={(value) => value && setMonth(value)}
          />
          <Button
            aria-label="Xuất Excel"
            className="dashboard-excel"
            icon={isExportingExcel ? <LoadingOutlined /> : <FileExcelOutlined />}
            loading={isExportingExcel}
            disabled={loading || failed}
            onClick={handleExportExcel}
          >
            Xuất Excel
          </Button>
          <Button
            aria-label="Xuất PDF"
            icon={isExportingPdf ? <LoadingOutlined /> : <FilePdfOutlined />}
            loading={isExportingPdf}
            disabled={loading || failed}
            onClick={handleExportPdf}
          >
            Xuất PDF
          </Button>
        </div>
      </header>

      {failed && (
        <Alert
          type="error"
          showIcon
          title="Không thể tải báo cáo"
          description="Vui lòng thử lại."
          action={
            <Button
              aria-label="Thử lại"
              icon={<ReloadOutlined />}
              onClick={() => {
                void orders.refetch();
                void top.refetch();
                if (isAdmin) void finance.refetch();
                else if (canViewRevenue) void revenue.refetch();
              }}
            >
              Thử lại
            </Button>
          }
        />
      )}

      {loading ? (
        <div className="dashboard-loading" role="status" aria-label="Đang tải báo cáo">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : failed ? null : (
        <>
          {canViewRevenue && (
            <section aria-labelledby="business-heading">
              <div className="dashboard-section-heading">
                <h2 id="business-heading">Hiệu quả kinh doanh</h2>
                <span className="dashboard-period">Tháng {month.format('MM/YYYY')}</span>
              </div>
              {financial ? (
                <FinancialKpiCards report={financial} />
              ) : (
                <DashboardMetricCard
                  label="Doanh thu thuần"
                  value={formatVND(amount ?? 0)}
                  icon={<DollarOutlined />}
                  tone="green"
                  hint="Doanh thu tiền hàng đã thanh toán sau giảm giá, không gồm phí vận chuyển."
                />
              )}
              {financial && financial.uncostedQuantity > 0 && (
                <div className="mt-4">
                  <Alert
                    type="warning"
                    showIcon
                    title="Chưa đủ dữ liệu giá vốn"
                    description={`${financial.uncostedQuantity} sản phẩm chưa có giá vốn tại thời điểm bán; chưa thể xác định đầy đủ lợi nhuận.`}
                  />
                </div>
              )}
            </section>
          )}

          <section aria-labelledby="operations-heading">
            <div className="dashboard-section-heading">
              <h2 id="operations-heading">Vận hành đơn hàng</h2>
              <span className="dashboard-panel-subtitle">Số lượng theo trạng thái</span>
            </div>
            <div className="dashboard-operations-grid">
              {operations.map((item) => (
                <DashboardMetricCard key={item.label} {...item} tone={item.tone as MetricTone} compact />
              ))}
            </div>
          </section>

          {financial && (
            <section className="dashboard-refund" aria-label="Thống kê hoàn trả">
              <span className="dashboard-refund-icon" aria-hidden="true"><RollbackOutlined /></span>
              <div>
                <div className="dashboard-refund-label">Tiền hoàn trả</div>
                <p>Khoản hoàn tiền đã hoàn tất trong kỳ</p>
              </div>
              <strong className="dashboard-refund-value">{formatVND(financial.refundAmount)}</strong>
            </section>
          )}

          {canViewRevenue && (
            <div className={isAdmin ? 'dashboard-charts' : ''}>
              <RevenueLineChart data={points ?? []} showProfit={isAdmin} />
              {financial && <PaymentMethodPieChart data={financial.paymentMethodStats} />}
            </div>
          )}
        </>
      )}

      <Card
        className="dashboard-panel"
        title={
          <div>
            <div className="dashboard-panel-title">Top 10 sản phẩm bán chạy</div>
            <div className="dashboard-panel-subtitle">
              Xếp hạng theo số lượng bán trong tháng {month.format('MM/YYYY')}
            </div>
          </div>
        }
      >
        <Table
          components={{ table: KeyboardAccessibleTable }}
          dataSource={top.data ?? []}
          rowKey="phoneId"
          pagination={false}
          loading={top.isLoading}
          scroll={{ x: 440 }}
          locale={{ emptyText: <Empty description="Chưa có sản phẩm bán chạy" /> }}
          columns={[
            {
              title: '#',
              width: 56,
              render: (_, __, index) => (
                <span className={`dashboard-rank ${index < 3 ? 'dashboard-rank--top' : ''}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
              ),
            },
            {
              title: 'Sản phẩm',
              dataIndex: 'phoneName',
              render: (name: string) => <span className="font-medium text-slate-800">{name}</span>,
            },
            { title: 'Hãng', dataIndex: 'brandName' },
            {
              title: 'Đã bán',
              dataIndex: 'soldQuantity',
              align: 'right',
              render: (quantity: number) => <span className="dashboard-sold">{quantity}</span>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
