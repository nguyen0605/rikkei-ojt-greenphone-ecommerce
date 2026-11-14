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
    try {
      const res = await publicApi.get<ApiResponse<PageResponse<PhoneDTO>>>('/phones/search', {
        params: { q: query.trim(), page: 0, size: 10 },
      });
      if (res.data.data?.content && res.data.data.content.length > 0) {
        return res.data.data.content;
      }
    } catch (err) {
      console.warn('Fulltext search failed, falling back to query list:', err);
    }

    try {
      const res = await publicApi.get<ApiResponse<PageResponse<PhoneDTO>>>('/phones', {
        params: { query: query.trim(), page: 0, size: 10 },
      });
      return res.data.data?.content ?? [];
    } catch (err) {
      console.error('All phone search methods failed:', err);
      return [];
    }
  },

  /**
   * Lấy danh sách điện thoại nổi bật ban đầu khi mở modal
   */
  async getInitialPhones(): Promise<PhoneDTO[]> {
    try {
      const res = await publicApi.get<ApiResponse<PageResponse<PhoneDTO>>>('/phones', {
        params: { page: 0, size: 6 },
      });
      return res.data.data?.content ?? [];
    } catch (err) {
      console.error('Failed to get initial phones:', err);
      return [];
    }
  },
};

export default phoneComparisonService;
