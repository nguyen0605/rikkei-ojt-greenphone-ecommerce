import { adminBannerService, adminPromotionService } from '@/services';
import type { BannerRequest, PromotionRequest } from '@/types/api';

/**
 * Service facade for Admin Marketing (Banners & Promotions/Vouchers).
 * Matches requirements of [FE3] Admin Marketing Module.
 */
export const adminMarketingService = {
  // Banners
  getBanners: (params?: Record<string, string>) => adminBannerService.list(params),
  createBanner: (data: BannerRequest) => adminBannerService.create(data),
  updateBanner: (id: number, data: BannerRequest) => adminBannerService.update(id, data),
  deleteBanner: (id: number) => adminBannerService.remove(id),

  // Vouchers / Promotions
  getVouchers: (params?: Record<string, string>) => adminPromotionService.list(params),
  createVoucher: (data: PromotionRequest) => adminPromotionService.create(data),
  updateVoucher: (id: number, data: PromotionRequest) => adminPromotionService.update(id, data),
  deleteVoucher: (id: number) => adminPromotionService.remove(id),
  toggleVoucherStatus: (id: number, current: PromotionRequest, newStatus: 'ACTIVE' | 'INACTIVE') =>
    adminPromotionService.update(id, { ...current, status: newStatus }),
};

export default adminMarketingService;

