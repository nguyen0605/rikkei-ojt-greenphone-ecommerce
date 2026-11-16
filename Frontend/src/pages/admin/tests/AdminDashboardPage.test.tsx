import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminDashboardPage from '../AdminDashboardPage';
import { adminStatisticsService as api } from '@/services/adminStatisticsService';
import * as XLSX from 'xlsx';

const state = vi.hoisted(() => ({ auth: { user: { id: 1, role: 'ROLE_ADMIN' } } }));
const pdf = vi.hoisted(() => ({ addImage: vi.fn(), save: vi.fn() }));
vi.mock('jspdf', () => ({ jsPDF: class { addImage = pdf.addImage; save = pdf.save; } }));
vi.mock('@/store/hooks', () => ({ useAppSelector: (selector: (value: typeof state) => unknown) => selector(state) }));
vi.mock('@/services/adminStatisticsService', () => ({ adminStatisticsService: { orders: vi.fn(), topSelling: vi.fn(), revenue: vi.fn(), financialReport: vi.fn() } }));
vi.mock('xlsx', () => ({ utils: { book_new: vi.fn(() => ({})), json_to_sheet: vi.fn((rows) => rows), book_append_sheet: vi.fn() }, writeFile: vi.fn() }));
vi.mock('@/components/admin/dashboard/RevenueLineChart', () => ({ default: ({ showProfit }: { showProfit: boolean }) => <div>{showProfit ? 'Biểu đồ lợi nhuận' : 'Biểu đồ doanh thu'}</div> }));
vi.mock('@/components/admin/dashboard/PaymentMethodPieChart', () => ({ default: () => <div>Cơ cấu thanh toán</div> }));
const report = { grossRevenue: 1000, discountAmount: 100, shippingFee: 30, netRevenue: 900, cogs: 600, grossProfit: 300, profitMarginPercentage: 33.33, refundAmount: 0, uncostedQuantity: 0, startDate: '', endDate: '', timeSeriesData: [], paymentMethodStats: [] };
describe('Dashboard role security', () => {
  let client: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks(); state.auth.user.role = 'ROLE_ADMIN';
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    vi.mocked(api.orders).mockResolvedValue({ totalOrders: 10, processingOrders: 4, shippingOrders: 3, confirmedOrders: 1, pendingOrders: 1, cancelledOrders: 0, deliveredOrders: 1, period: 'month' });
    vi.mocked(api.topSelling).mockResolvedValue([{ phoneId: 1, phoneName: 'iPhone demo', brandName: 'Apple', soldQuantity: 5, mainImageUrl: '' }]);
    vi.mocked(api.revenue).mockResolvedValue({ totalRevenue: 900, totalOrders: 10, period: 'month', startDate: '', endDate: '', timeSeriesData: [] });
    vi.mocked(api.financialReport).mockResolvedValue(report);
  });
  afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });
  function mount() { return render(<QueryClientProvider client={client}><AdminDashboardPage /></QueryClientProvider>); }
  it('admin sees finance, dual chart and payment breakdown', async () => {
    mount(); expect(await screen.findByText('Giá vốn hàng bán (COGS)')).toBeInTheDocument();
    expect(screen.getByText('Lợi nhuận gộp')).toBeInTheDocument(); expect(screen.getByText('Biểu đồ lợi nhuận')).toBeInTheDocument();
    expect(screen.getByText('Cơ cấu thanh toán')).toBeInTheDocument(); expect(api.financialReport).toHaveBeenCalledOnce(); expect(api.revenue).not.toHaveBeenCalled();
  });
  it.each(['ROLE_SALES', 'ROLE_MARKETING'])('%s gets revenue without requesting finance', async (role) => {
    state.auth.user.role = role; mount(); expect(await screen.findByText('Biểu đồ doanh thu')).toBeInTheDocument();
    expect(screen.queryByText(/COGS/)).not.toBeInTheDocument(); expect(screen.queryByText('Lợi nhuận gộp')).not.toBeInTheDocument();
    expect(api.financialReport).not.toHaveBeenCalled(); expect(api.revenue).toHaveBeenCalledOnce();
  });
  it('warehouse gets operational counts without money or finance requests', async () => {
    state.auth.user.role = 'ROLE_WAREHOUSE'; mount(); await screen.findByText('iPhone demo');
    expect(screen.getByText('Chờ đóng gói')).toBeInTheDocument(); expect(screen.getByText('Đang giao')).toBeInTheDocument();
    expect(screen.queryByText(/Doanh thu/)).not.toBeInTheDocument(); expect(screen.queryByText(/COGS/)).not.toBeInTheDocument();
    expect(api.financialReport).not.toHaveBeenCalled(); expect(api.revenue).not.toHaveBeenCalled();
  });
  it.each(['ROLE_SALES', 'ROLE_MARKETING', 'ROLE_WAREHOUSE'])('Excel for %s contains only authorized metrics', async (role) => {
    state.auth.user.role = role; mount(); await waitFor(() => expect(screen.getByRole('button', { name: 'Xuất Excel' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }));
    const exported = JSON.stringify(vi.mocked(XLSX.utils.json_to_sheet).mock.calls);
    expect(exported).not.toMatch(/COGS|Lợi nhuận|Biên lợi nhuận/);
    if (role === 'ROLE_WAREHOUSE') expect(exported).not.toMatch(/Doanh thu|Phí vận chuyển|hoàn trả/);
    expect(XLSX.writeFile).toHaveBeenCalledOnce();
  });
  it('warns when historical costs are unknown', async () => {
    vi.mocked(api.financialReport).mockResolvedValue({ ...report, cogs: null, grossProfit: null, profitMarginPercentage: null, uncostedQuantity: 3 });
    mount(); expect(await screen.findByText('Chưa đủ dữ liệu giá vốn')).toBeInTheDocument();
    expect(screen.getAllByText('Chưa đủ dữ liệu')).toHaveLength(3);
  });
  it.each(['ROLE_ADMIN', 'ROLE_SALES', 'ROLE_MARKETING', 'ROLE_WAREHOUSE'])('PDF for %s uses authorized data only', async (role) => {
    state.auth.user.role = role;
    const fillText = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillText, fillRect: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,demo');
    mount(); await waitFor(() => expect(screen.getByRole('button', { name: 'Xuất PDF' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Xuất PDF' }));
    const text = JSON.stringify(fillText.mock.calls);
    if (role === 'ROLE_ADMIN') expect(text).toContain('COGS');
    else expect(text).not.toMatch(/COGS|Lợi nhuận|Biên lợi nhuận/);
    if (role === 'ROLE_WAREHOUSE') expect(text).not.toMatch(/Doanh thu|Phí vận chuyển|hoàn trả/);
    expect(pdf.save).toHaveBeenCalledOnce();
  });
  it('does not render cached admin finances after role changes', async () => {
    const view = mount(); await screen.findByText('Giá vốn hàng bán (COGS)');
    state.auth.user.role = 'ROLE_WAREHOUSE'; view.rerender(<QueryClientProvider client={client}><AdminDashboardPage /></QueryClientProvider>);
    await screen.findByText('iPhone demo'); expect(screen.queryByText(/COGS/)).not.toBeInTheDocument(); expect(screen.queryByText('Biểu đồ lợi nhuận')).not.toBeInTheDocument();
    expect(client.getQueriesData({ queryKey: ['stats-financial', 1, 'ADMIN'] })).toEqual([]);
  });
  it('shows loading and then a recoverable API error', async () => {
    vi.mocked(api.financialReport).mockRejectedValue(new Error('Network')); mount();
    expect(screen.getByRole('button', { name: 'Xuất Excel' })).toBeDisabled();
    expect(await screen.findByText('Không thể tải báo cáo')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(screen.queryByText('Doanh thu thuần')).not.toBeInTheDocument();
  });
});
