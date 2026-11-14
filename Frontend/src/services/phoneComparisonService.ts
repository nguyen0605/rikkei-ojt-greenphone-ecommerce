import axios from 'axios';
import type { ApiResponse, PageResponse, PhoneComparisonResponseDTO, PhoneDTO } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const publicApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const phoneComparisonService = {
  /**
   * So sánh danh sách điện thoại theo IDs
   */
  async compare(ids: number[]): Promise<PhoneComparisonResponseDTO> {
    const res = await publicApi.get<ApiResponse<PhoneComparisonResponseDTO>>('/v1/phones/compare', {
      params: { ids: ids.join(',') },
    });
    return res.data.data;
  },

  /**
   * Tìm kiếm điện thoại cho thanh gợi ý thay đổi / chọn máy
   */
  async searchPhones(query: string): Promise<PhoneDTO[]> {
    if (!query || !query.trim()) return [];
    const res = await publicApi.get<ApiResponse<PageResponse<PhoneDTO>>>('/phones/search', {
      params: { q: query.trim(), page: 0, size: 10 },
    });
    return res.data.data?.content ?? [];
  },
};

export default phoneComparisonService;
