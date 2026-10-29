export { authService, userService } from "./authService";
import { get, post, put, del } from './api';
import type {
  CartDTO, CartItemRequest, OrderDTO, OrderRequest,
  PaymentDTO, PaymentQRInfo, PromotionDTO, UserPromotionDTO, AvailablePromotionDTO, ReviewDTO,
  ReviewSummary, PageResponse, PhoneDTO, PhoneDetailDTO,
  PhoneVariantDTO, PhoneImageDTO, BrandDTO, BannerDTO,
  PhoneRequest, PhoneVariantRequest, BrandRequest,
  BannerRequest, PromotionRequest, RevenueStats,
  OrderStats, TopSellingPhone, UserDTO, SettingsDTO,
  OptionDTO, OptionRequest, OptionItemDTO, OptionItemRequest, OptionTreeDTO,
} from '@/types/api';

// Phone
export const phoneService = {
  list: (params?: Record<string, string>) => get<PageResponse<PhoneDTO>>('/phones', { params }),
  detail: (id: number) => get<PhoneDetailDTO>('/phones/' + id),
  search: (params?: Record<string, string>) => get<PageResponse<PhoneDTO>>('/phones/search', { params }),
  filters: () => get<Record<string, unknown>>('/phones/filters'),
};

// Brand
export const brandService = {
  list: () => get<BrandDTO[]>('/brands'),
};

// Banner
export const bannerService = {
  active: () => get<BannerDTO[]>('/banners'),
};

// Review
export const reviewService = {
  byPhone: (phoneId: number, params?: Record<string, string>) => get<PageResponse<ReviewDTO>>('/reviews/phone/' + phoneId, { params }),
  summary: (phoneId: number) => get<ReviewSummary>('/reviews/phone/' + phoneId + '/summary'),
  create: (data: { orderDetailId: number; rating: number; content: string }) => post<ReviewDTO>('/reviews', data),
  update: (id: number, data: { rating: number; content: string }) => put<ReviewDTO>('/reviews/' + id, data),
  remove: (id: number) => del<void>('/reviews/' + id),
  myReviews: (params?: Record<string, string>) => get<PageResponse<ReviewDTO>>('/reviews/me', { params }),
  eligible: (params?: Record<string, string>) => get<PageResponse<OrderDTO>>('/reviews/eligible', { params }),
};

// Cart
export const cartService = {
  get: () => get<CartDTO>('/cart'),
  addItem: (data: CartItemRequest) => post<CartDTO>('/cart/items', data),
  updateItem: (id: number, quantity: number) => put<CartDTO>('/cart/items/' + id, { quantity }),
  removeItem: (id: number) => del<CartDTO>('/cart/items/' + id),
  clear: () => del<void>('/cart'),
};

// Order
export const orderService = {
  create: (data: OrderRequest) => post<OrderDTO>('/orders', data),
  list: (params?: Record<string, string>) => get<PageResponse<OrderDTO>>('/orders', { params }),
  detail: (id: number) => get<OrderDTO>('/orders/' + id),
  cancel: (id: number) => put<OrderDTO>('/orders/' + id + '/cancel'),
  applyPromotion: (id: number, userPromotionId: number) => put<OrderDTO>('/orders/' + id + '/promotion', { userPromotionId }),
};

// Payment
export const paymentService = {
  create: (orderId: number, method: string) => post<PaymentDTO>('/payments', { orderId, method }),
  getByOrder: (orderId: number) => get<PaymentDTO>('/payments/order/' + orderId),
  qrCode: (orderId: number) => get<PaymentQRInfo>('/payments/qr/' + orderId),
};

// Promotion
export const promotionService = {
  publicList: () => get<unknown[]>('/promotions/public'),
  available: (orderAmount: number) => get<AvailablePromotionDTO[]>('/promotions/available', { params: { orderAmount } }),
  myPromotions: () => get<UserPromotionDTO[]>('/promotions/me'),
  claim: (code: string) => post<UserPromotionDTO>('/promotions/claim', { code }),
};

// Admin
export const adminPhoneService = {
  list: (params?: Record<string, string>) => get<PageResponse<PhoneDTO>>('/admin/phones', { params }),
  detail: (id: number) => get<PhoneDetailDTO>('/admin/phones/' + id),
  create: (data: PhoneRequest) => post<PhoneDTO>('/admin/phones', data),
  update: (id: number, data: PhoneRequest) => put<PhoneDTO>('/admin/phones/' + id, data),
  updateStatus: (id: number, status: string) => put<PhoneDTO>('/admin/phones/' + id + '/status', { status }),
  remove: (id: number) => del<void>('/admin/phones/' + id),
  variants: (phoneId: number) => get<PhoneVariantDTO[]>('/admin/phones/' + phoneId + '/variants'),
  addVariant: (phoneId: number, data: PhoneVariantRequest) => post<PhoneVariantDTO>('/admin/phones/' + phoneId + '/variants', data),
  updateVariant: (phoneId: number, variantId: number, data: PhoneVariantRequest) => put<PhoneVariantDTO>('/admin/phones/' + phoneId + '/variants/' + variantId, data),
  removeVariant: (phoneId: number, variantId: number) => del<void>('/admin/phones/' + phoneId + '/variants/' + variantId),
  images: (phoneId: number) => get<PhoneImageDTO[]>('/admin/phones/' + phoneId + '/images'),
  addImage: (phoneId: number, formData: FormData) => post<PhoneImageDTO>('/admin/phones/' + phoneId + '/images', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  removeImage: (phoneId: number, imageId: number) => del<void>('/admin/phones/' + phoneId + '/images/' + imageId),
  updateImage: (phoneId: number, imageId: number, data: { isMain?: boolean }) => put<PhoneImageDTO>('/admin/phones/' + phoneId + '/images/' + imageId, data),
  reorderImages: (phoneId: number, imageIds: number[]) => put<PhoneImageDTO[]>('/admin/phones/' + phoneId + '/images/reorder', { imageIds }),
};

// Option catalog — categories (tree) + items
export const optionService = {
  list: () => get<OptionTreeDTO[]>('/options'),
};

export const adminOptionService = {
  // Categories
  list: () => get<OptionDTO[]>('/admin/options'),
  types: () => get<string[]>('/admin/options/types'),
  create: (data: OptionRequest) => post<OptionDTO>('/admin/options', data),
  update: (id: number, data: OptionRequest) => put<OptionDTO>('/admin/options/' + id, data),
  remove: (id: number) => del<void>('/admin/options/' + id),
  // Items
  items: (optionId: number) => get<OptionItemDTO[]>('/admin/options/' + optionId + '/items'),
  createItem: (optionId: number, data: OptionItemRequest) => post<OptionItemDTO>('/admin/options/' + optionId + '/items', data),
  updateItem: (id: number, data: OptionItemRequest) => put<OptionItemDTO>('/admin/options/items/' + id, data),
  removeItem: (id: number) => del<void>('/admin/options/items/' + id),
  itemUsage: (id: number, params?: Record<string, string>) => get<PageResponse<PhoneDTO>>('/admin/options/items/' + id + '/usage', { params }),
};

export const adminBrandService = {
  list: (params?: Record<string, string>) => get<PageResponse<BrandDTO>>('/admin/brands', { params }),
  create: (data: BrandRequest) => post<BrandDTO>('/admin/brands', data),
  update: (id: number, data: BrandRequest) => put<BrandDTO>('/admin/brands/' + id, data),
  updateStatus: (id: number, status: string) => put<BrandDTO>('/admin/brands/' + id + '/status', { status }),
  remove: (id: number) => del<void>('/admin/brands/' + id),
};

export const adminOrderService = {
  list: (params?: Record<string, string>) => get<PageResponse<OrderDTO>>('/admin/orders', { params }),
  detail: (id: number) => get<OrderDTO>('/admin/orders/' + id),
  updateStatus: (id: number, status: string) => put<OrderDTO>('/admin/orders/' + id + '/status', { status }),
  updatePaymentStatus: (id: number, paymentStatus: string) => put<OrderDTO>('/admin/orders/' + id + '/payment-status', { paymentStatus }),
  confirm: (id: number) => put<OrderDTO>('/admin/orders/' + id + '/confirm'),
  updateDelivery: (id: number, status: string) => put<OrderDTO>('/admin/orders/' + id + '/delivery', { status }),
};

export const adminUserService = {
  list: (params?: Record<string, string>) => get<PageResponse<UserDTO>>('/admin/users', { params }),
  detail: (id: number) => get<UserDTO>('/admin/users/' + id),
  updateStatus: (id: number, status: string) => put<UserDTO>('/admin/users/' + id + '/status', { status }),
};

export const adminReviewService = {
  list: (params?: Record<string, string>) => get<PageResponse<ReviewDTO>>('/admin/reviews', { params }),
  updateStatus: (id: number, status: string) => put<ReviewDTO>('/admin/reviews/' + id + '/status', { status }),
  remove: (id: number) => del<void>('/admin/reviews/' + id),
};

export const adminPromotionService = {
  list: (params?: Record<string, string>) => get<PageResponse<PromotionDTO>>('/admin/promotions', { params }),
  detail: (id: number) => get<PromotionDTO>('/admin/promotions/' + id),
  create: (data: PromotionRequest) => post<PromotionDTO>('/admin/promotions', data),
  update: (id: number, data: PromotionRequest) => put<PromotionDTO>('/admin/promotions/' + id, data),
  remove: (id: number) => del<void>('/admin/promotions/' + id),
};

export const adminBannerService = {
  list: (params?: Record<string, string>) => get<PageResponse<BannerDTO>>('/admin/banners', { params }),
  create: (data: BannerRequest) => post<BannerDTO>('/admin/banners', data),
  update: (id: number, data: BannerRequest) => put<BannerDTO>('/admin/banners/' + id, data),
  remove: (id: number) => del<void>('/admin/banners/' + id),
};

export const adminStatisticsService = {
  revenue: (period: string, from?: string, to?: string) => {
    const params: Record<string, string> = { period };
    if (from) params.from = from;
    if (to) params.to = to;
    return get<RevenueStats>('/admin/statistics/revenue', { params });
  },
  orders: (from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return get<OrderStats>('/admin/statistics/orders', { params });
  },
  topSelling: (limit = 10, from?: string, to?: string) => {
    const params: Record<string, string> = { limit: String(limit) };
    if (from) params.from = from;
    if (to) params.to = to;
    return get<TopSellingPhone[]>('/admin/statistics/top-selling', { params });
  },
};

// Settings
export const settingsService = {
  get: () => get<Record<string, string>>('/settings'),
  adminList: () => get<SettingsDTO[]>('/admin/settings'),
  adminUpdate: (values: Record<string, string>) => put<Record<string, string>>('/admin/settings', values),
};
