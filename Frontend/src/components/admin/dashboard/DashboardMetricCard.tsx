import type { ReactNode } from 'react';
import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

export type MetricTone = 'green' | 'blue' | 'amber' | 'red' | 'slate';
export default function DashboardMetricCard({ label, value, icon, tone = 'slate', hint, compact = false }: {
  label: string; value: ReactNode; icon: ReactNode; tone?: MetricTone; hint?: string; compact?: boolean;
}) {
  return <article className={`dashboard-metric dashboard-metric--${tone} ${compact ? 'dashboard-metric--compact' : ''}`}>
    <div className="dashboard-metric-heading">
      <span className="dashboard-metric-icon" aria-hidden="true">{icon}</span>
      <span className="dashboard-metric-label">{label}</span>
      {hint && <Tooltip title={hint}><button type="button" className="dashboard-info" aria-label={`Giải thích ${label}`}><InfoCircleOutlined /></button></Tooltip>}
    </div>
    <div className="dashboard-metric-value">{value}</div>
  </article>;
}
