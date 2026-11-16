import { get } from './api';
import type { FinancialReport, OrderStats, RevenueStats, TopSellingPhone } from '@/types/api';

export const adminStatisticsService = {
  revenue: (period: string, from?: string, to?: string) =>
    get<RevenueStats>('/admin/statistics/revenue', { params: { period, from, to } }),
  orders: (from?: string, to?: string) =>
    get<OrderStats>('/admin/statistics/orders', { params: { from, to } }),
  topSelling: (limit = 10, from?: string, to?: string) =>
    get<TopSellingPhone[]>('/admin/statistics/top-selling', { params: { limit, from, to } }),
  financialReport: (period: string, from?: string, to?: string) =>
    get<FinancialReport>('/admin/statistics/financial-report', { params: { period, from, to } }),
};
