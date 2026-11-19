import { Card, Empty } from 'antd';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { PaymentMethodBreakdown } from '@/types/api';
import { formatVND } from '@/utils';

const palette: Record<string, { color: string; dot: string; label: string }> = {
  VIETQR: { color: '#16a34a', dot: 'green', label: 'VietQR' },
  VNPAY: { color: '#3b82f6', dot: 'blue', label: 'VNPay' },
  COD: { color: '#f59e0b', dot: 'amber', label: 'COD' },
  BANK_TRANSFER: { color: '#0ea5e9', dot: 'cyan', label: 'Chuyển khoản' },
  E_WALLET: { color: '#8b5cf6', dot: 'purple', label: 'Ví điện tử' },
  MOMO: { color: '#d946ef', dot: 'pink', label: 'Ví MoMo' },
};

export default function PaymentMethodPieChart({ data }: { data: PaymentMethodBreakdown[] }) {
  const positive = (data ?? []).filter((row) => row.revenue > 0);
  const totalRevenue = positive.reduce((sum, row) => sum + row.revenue, 0);
  const totalTransactions = positive.reduce((sum, row) => sum + (row.transactionCount || 0), 0);

  const methods = positive.map((row) => {
    const preset = palette[row.paymentMethod?.toUpperCase()] ?? {
      color: '#8b5cf6',
      dot: 'purple',
      label: row.paymentMethod || 'Khác',
    };
    const share = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : (row.percentage ?? 0);
    return {
      ...row,
      ...preset,
      share,
      transactionCount: row.transactionCount || 0,
    };
  });

  return (
    <Card className="dashboard-panel" title={<div><div className="dashboard-panel-title">Cơ cấu thanh toán</div><div className="dashboard-panel-subtitle">Doanh thu theo kênh · giao dịch thành công</div></div>}>
      {positive.length === 0 ? (
        <div className="dashboard-line flex items-center justify-center"><Empty description="Chưa có thanh toán" /></div>
      ) : (
        <>
          <div className="dashboard-donut" role="img" aria-label="Biểu đồ cơ cấu thanh toán">
            <div className="dashboard-donut-center">
              <strong>{totalTransactions > 0 ? totalTransactions : methods.length}</strong>
              <span>{totalTransactions > 0 ? 'giao dịch' : 'kênh thanh toán'}</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={methods} dataKey="revenue" nameKey="label" innerRadius={65} outerRadius={88} paddingAngle={methods.length > 1 ? 3 : 0} cornerRadius={4} stroke="none" isAnimationActive={false}>
                  {methods.map((row) => <Cell key={row.paymentMethod} fill={row.color} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as (typeof methods)[number] | undefined;
                  return active && row ? (
                    <div className="dashboard-tooltip">
                      <strong>{row.label}</strong>
                      <p>{formatVND(row.revenue)} · {row.share.toFixed(1)}%</p>
                      <p className="text-xs text-slate-400 mt-0.5">{row.transactionCount} giao dịch thành công</p>
                    </div>
                  ) : null;
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="dashboard-payment-legend" role="group" aria-label="Chi tiết cơ cấu thanh toán">
            {methods.map((row) => (
              <div className="dashboard-payment-row" key={row.paymentMethod}>
                <i className={`dashboard-dot dashboard-dot--${row.dot}`} />
                <span>{row.label}</span>
                <span className="text-[11px] text-slate-400">({row.transactionCount} GD)</span>
                <span className="dashboard-payment-amount">{formatVND(row.revenue)}</span>
                <span className="dashboard-payment-share">{row.share.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
