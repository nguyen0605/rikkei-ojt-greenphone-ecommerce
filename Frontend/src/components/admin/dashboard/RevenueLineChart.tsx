import { Card, Empty } from 'antd';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FinancialTimeSeriesPoint } from '@/types/api';
import { formatVND } from '@/utils';

export default function RevenueLineChart({ data, showProfit = false }: { data: FinancialTimeSeriesPoint[]; showProfit?: boolean }) {
  const hasActivity = data.some((point) => point.revenue !== 0 || (showProfit && point.grossProfit != null && point.grossProfit !== 0));
  return <Card className="dashboard-panel" title={<div><div className="dashboard-panel-title">{showProfit ? 'Doanh thu và lợi nhuận' : 'Doanh thu theo ngày'}</div><div className="dashboard-panel-subtitle">Theo dõi kết quả kinh doanh từng ngày · VND</div></div>}>
    <div className="dashboard-chart-legend"><span><i className="dashboard-dot dashboard-dot--green" />Doanh thu</span>{showProfit && <span><i className="dashboard-dot dashboard-dot--blue" />Lợi nhuận</span>}</div>
    {!hasActivity ? <div className="dashboard-line flex items-center justify-center"><Empty description="Chưa có dữ liệu phát sinh trong kỳ" /></div> : <div className="dashboard-line" role="img" aria-label="Biểu đồ doanh thu theo ngày">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(date: string) => `${date.slice(8)}/${date.slice(5, 7)}`} axisLine={false} tickLine={false} minTickGap={28} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
          <YAxis width={88} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(value: number) => formatVND(value)} />
          <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="dashboard-tooltip"><p className="text-slate-500">Ngày {String(label).slice(8)}/{String(label).slice(5, 7)}</p>{payload.map((entry) => <p key={String(entry.dataKey)}><strong>{entry.name}:</strong> {entry.value == null ? 'Chưa đủ dữ liệu' : formatVND(Number(entry.value))}</p>)}</div> : null} />
          <Line type="linear" dataKey="revenue" name="Doanh thu" stroke="#16a34a" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff' }} isAnimationActive={false} />
          {showProfit && <Line type="linear" dataKey="grossProfit" name="Lợi nhuận" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff' }} connectNulls={false} isAnimationActive={false} />}
        </LineChart>
      </ResponsiveContainer>
    </div>}
  </Card>;
}
