import axios from 'axios';
import type { ApiResponse, PageResponse, PhoneComparisonResponseDTO, PhoneDTO } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const publicApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const COMPARE_STORAGE_KEY = 'greenphone_compare_slots';
export const COMPARE_UPDATED_EVENT = 'greenphone_compare_updated';

export interface StoredCompareSlots {
  id1: number | null;
  id2: number | null;
}

export function getStoredCompareSlots(): StoredCompareSlots {
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return { id1: null, id2: null };
    const parsed = JSON.parse(raw);
    const id1 = typeof parsed.id1 === 'number' && !isNaN(parsed.id1) ? parsed.id1 : null;
    const id2 = typeof parsed.id2 === 'number' && !isNaN(parsed.id2) ? parsed.id2 : null;
    return { id1, id2 };
  } catch {
    return { id1: null, id2: null };
  }
}

export function saveStoredCompareSlots(slots: StoredCompareSlots): void {
  try {
    const validId1 = slots.id1 && !isNaN(slots.id1) ? slots.id1 : null;
    const validId2 = slots.id2 && !isNaN(slots.id2) ? slots.id2 : null;
    if (!validId1 && !validId2) {
      localStorage.removeItem(COMPARE_STORAGE_KEY);
    } else {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify({ id1: validId1, id2: validId2 }));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(COMPARE_UPDATED_EVENT));
    }
  } catch (err) {
    console.error('Failed to save comparison to localStorage:', err);
  }
}

export function clearStoredCompareSlots(): void {
  try {
    localStorage.removeItem(COMPARE_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(COMPARE_UPDATED_EVENT));
    }
  } catch (err) {
    console.error('Failed to clear comparison from localStorage:', err);
  }
}

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
   * Lấy danh sách thương hiệu phục vụ bộ lọc nhanh
   */
  async getBrands(): Promise<{ id: number; name: string }[]> {
    try {
      const res = await publicApi.get<ApiResponse<{ id: number; name: string }[]>>('/brands');
      return res.data.data ?? [];
    } catch (err) {
      console.error('Failed to get brands:', err);
      return [];
    }
  },

  /**
   * Tìm kiếm điện thoại cho thanh gợi ý thay đổi / chọn máy (lấy toàn bộ kết quả phù hợp, tối đa 100 máy)
   */
  async searchPhones(query: string, brandId?: number): Promise<PhoneDTO[]> {
    if (!query || !query.trim()) {
      return this.getInitialPhones(brandId);
    }
    const cleanQuery = query.trim();
    try {
      const params: Record<string, any> = { q: cleanQuery, page: 0, size: 100 };
      if (brandId) {
        params.brandIds = brandId;
      }
      const res = await publicApi.get<ApiResponse<PageResponse<PhoneDTO>>>('/phones/search', {
        params,
      });
      if (res.data.data?.content && res.data.data.content.length > 0) {
        return res.data.data.content;
      }
    } catch (err) {
      console.warn('Fulltext search failed, falling back to query list:', err);
    }

    try {
      const params: Record<string, any> = { page: 0, size: 100 };
      if (brandId) {
        params.brandIds = brandId;
      }
      const res = await publicApi.get<ApiResponse<PageResponse<PhoneDTO>>>('/phones', {
        params,
      });
      const lower = cleanQuery.toLowerCase();
      return (res.data.data?.content ?? []).filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          (p.brandName && p.brandName.toLowerCase().includes(lower)) ||
          (p.chip && p.chip.toLowerCase().includes(lower))
      );
    } catch (err) {
      console.error('All phone search methods failed:', err);
      return [];
    }
  },

  /**
   * Lấy toàn bộ danh sách điện thoại đang bán (tối đa 100 sản phẩm) khi mở modal
   */
  async getInitialPhones(brandId?: number): Promise<PhoneDTO[]> {
    try {
      const params: Record<string, any> = { page: 0, size: 100 };
      if (brandId) {
        params.brandIds = brandId;
      }
      const res = await publicApi.get<ApiResponse<PageResponse<PhoneDTO>>>('/phones', {
        params,
      });
      return res.data.data?.content ?? [];
    } catch (err) {
      console.error('Failed to get initial phones:', err);
      return [];
    }
  },
};

export default phoneComparisonService;
