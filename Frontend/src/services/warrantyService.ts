import axios from 'axios';
import type { ApiResponse } from '@/types/api';

export interface WarrantyLookupItem {
  id: number;
  orderId: number;
  phoneVariantId?: number;
  imei?: string;
  imeiNumber: string;
  productName: string;
  variantDetails?: string;
  thumbnailUrl?: string | null;
  customerName?: string;
  customerPhone?: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | string;
  remainingDays: number;
  warrantyDurationMonths?: number;
  note?: string | null;
}

// Dedicated public axios instance: never attaches auth token and never redirects to /dang-nhap on 401.
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const warrantyService = {
  async check(query: string): Promise<WarrantyLookupItem[]> {
    const sanitized = query.trim();
    const res = await publicApi.get<ApiResponse<WarrantyLookupItem[]>>(
      '/v1/warranties/check',
      { params: { query: sanitized } },
    );
    return res.data.data ?? [];
  },

  async getByImei(imei: string): Promise<WarrantyLookupItem> {
    const sanitized = imei.trim();
    const res = await publicApi.get<ApiResponse<WarrantyLookupItem>>(
      `/v1/warranties/imei/${encodeURIComponent(sanitized)}`,
    );
    return res.data.data;
  },
};

export default warrantyService;
