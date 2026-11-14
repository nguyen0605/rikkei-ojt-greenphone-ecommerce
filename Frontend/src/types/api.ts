// API response types matching backend DTOs

export interface ApiResponse<T> {
  status: number;
  message: string;
  errorCode?: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// Auth
export interface StaffDTO {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateStaffRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}

export interface UpdateStaffRoleRequest {
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phone: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface AuthResponse {
  userId: number;
  token: string;
  fullName: string;
  email: string;
  role: string;
  expiresIn: number;
}

// Phone
export interface PhoneDTO {
  id: number;
  brandId: number;
  brandName: string;
  name: string;
  description: string;
  screen: string;
  os: string;
  chip: string;
  rearCamera: string;
  frontCamera: string;
  battery: string;
  warranty: string;
  status: string;
  mainImageUrl: string;
  variantCount: number;
  avgRating: number;
  lowestPrice: number | null;
}

export interface PhoneDetailDTO extends PhoneDTO {
  images: PhoneImageDTO[];
  variants: PhoneVariantDTO[];
  reviewCount: number;
}

export interface PhoneVariantDTO {
  id: number;
  phoneId: number;
  ramItemId: number;
  storageItemId: number;
  colorItemId: number;
  ram: string;
  storage: string;
  color: string;
  price: number;
  discountPrice: number | null;
  stockQuantity: number;
  sku: string;
  status: string;
}

export interface InventoryHistoryItemDTO {
  id: number;
  changeType: 'IMPORT' | 'EXPORT' | 'ADJUSTMENT';
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reason: string;
  changedByUserId: number | null;
  changedByName: string;
  createdAt: string;
}

export interface InventoryHistoryDTO {
  variantId: number;
  currentStock: number;
  entries: InventoryHistoryItemDTO[];
}

export interface InventoryStockMovementRequest {
  changeType: 'IMPORT' | 'EXPORT';
  quantity: number;
  reason: string;
}

export interface PhoneImageDTO {
  id: number;
  phoneId: number;
  imageUrl: string;
  isMain: boolean;
  sortOrder?: number;
}

// Brand
export interface BrandDTO {
  id: number;
  name: string;
  logoUrl: string;
  status: string;
}

// Banner
export interface BannerDTO {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string;
  status: string;
  sortOrder?: number;
  position?: string;
}

// Review
export interface ReviewDTO {
  id: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  phoneId: number;
  orderDetailId?: number;
  rating: number;
  content: string;
  status: string;
  createdAt: string;
  isPurchased?: boolean;
  images?: string[];
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}

export type ReviewFilterType = 'ALL' | 5 | 4 | 3 | 2 | 1 | 'WITH_IMAGE';

export interface ReviewQueryParams {
  page?: number | string;
  size?: number | string;
  rating?: number | string;
  hasImage?: boolean | string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

// Cart
export interface CartItemDTO {
  id: number;
  phoneVariantId: number;
  phoneId: number;
  phoneName: string;
  ram: string;
  storage: string;
  color: string;
  imageUrl: string;
  price: number;
  discountPrice: number | null;
  quantity: number;
  subtotal: number;
}

export interface CartDTO {
  id: number;
  userId: number;
  items: CartItemDTO[];
  totalAmount: number;
  totalItems: number;
}

export interface CartItemRequest {
  phoneVariantId: number;
  quantity: number;
}

export interface CartSyncRequest {
  items: CartItemRequest[];
}

// Order
export interface OrderItemRequest {
  phoneVariantId: number;
  quantity: number;
}

export interface OrderRequest {
  receiverName: string;
  receiverPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  note: string;
  userPromotionId: number | null;
  buyNow?: boolean;
  latitude?: number;
  longitude?: number;
  items: OrderItemRequest[];
}

export interface OrderDetailDTO {
  id: number;
  phoneVariantId: number;
  productName: string;
  ram: string;
  storage: string;
  color: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  reviewed?: boolean;
}

export interface OrderDTO {
  id: number;
  userId: number;
  userName: string;
  receiverName: string;
  receiverPhone: string;
  shippingAddress: string;
  totalAmount: number;
  discountAmount: number;
  shippingFee?: number;
  finalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  note: string;
  promotionCode: string;
  createdAt: string;
  updatedAt?: string;
  orderDetails: OrderDetailDTO[];
}

export interface OrderHistoryDTO {
  id: number;
  orderId: number;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface AdminOrderDetailDTO extends OrderDTO {
  histories?: OrderHistoryDTO[];
  shipments?: ShipmentDTO[];
  payments?: PaymentDTO[];
}

// Shipment
export interface ShipmentHistoryDTO {
  id: number;
  status: string;
  hubLocation: string;
  shipperNote: string;
  createdAt: string;
}

export interface ShipmentDTO {
  id: number;
  orderId: number;
  receiverName: string;
  receiverPhone: string;
  shippingAddress: string;
  trackingNumber: string;
  carrierCode: string;
  shippingFee: number;
  codAmount: number;
  status: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
  histories?: ShipmentHistoryDTO[];
}

// Payment
export interface PaymentDTO {
  id: number;
  orderId: number;
  paymentProvider: string;
  transactionCode: string;
  amount: number;
  paidAt: string;
}

/** Full bank-transfer payment info for the QR screen (GET /api/payments/qr/{orderId}). */
export interface PaymentQRInfo {
  orderId: number;
  qrUrl: string;
  accountNumber: string;
  accountHolder: string;
  bankCode: string;
  transferContent: string;
  amount: number;
  expiresAt: string; // ISO datetime
}

// Promotion
export interface PromotionDTO {
  id: number;
  code: string;
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount: number;
  minOrderValue: number;
  quantity: number;
  claimedQuantity?: number;
  usedQuantity?: number;
  startDate: string;
  endDate: string;
  status: string;
}

export interface UserPromotionDTO {
  id: number;
  userId: number;
  promotionId: number;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount: number;
  minOrderAmount: number;
  startDate: string;
  endDate: string;
  status: string;
  receivedAt: string;
  usedAt: string | null;
}

/** Returned by GET /api/promotions/available — includes calculated fields */
export interface AvailablePromotionDTO {
  id: number;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  calculatedDiscount: number;
  minOrderValue: number;
  eligible: boolean;
  endDate: string;
}

// User
export interface UserDTO {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  avatar?: string;
  role: string;
  status: string;
}

export interface UserProfileRequest {
  fullName: string;
  phone: string;
  address?: string;
  avatar?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export type AddressLabel = 'HOME' | 'OFFICE' | 'FAMILY' | 'OTHER';

export interface AddressItem {
  id: string | number;
  receiverName: string;
  receiverPhone: string;
  province: string;
  district?: string;
  ward?: string;
  streetAddress: string;
  label?: AddressLabel | string;
  latitude?: number;
  longitude?: number;
  note?: string;
  isDefault: boolean;
  createdAt?: string;
}

export interface AddressRequest {
  receiverName: string;
  receiverPhone: string;
  province: string;
  district?: string;
  ward?: string;
  streetAddress: string;
  label?: AddressLabel | string;
  latitude?: number;
  longitude?: number;
  note?: string;
  isDefault?: boolean;
}

// Statistics
export interface RevenueStats {
  totalRevenue: number;
  totalOrders: number;
  period: string;
  startDate: string;
  endDate: string;
}

export interface OrderStats {
  totalOrders: number;
  confirmedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  deliveredOrders: number;
  period: string;
}

export interface TopSellingPhone {
  phoneId: number;
  phoneName: string;
  brandName: string;
  soldQuantity: number;
  mainImageUrl: string;
}

// Option catalog — category (RAM/STORAGE/COLOR/FEATURE) + items
export interface OptionDTO {
  id: number;
  type: string;
  label: string;
  enabled: boolean;
  maxItems: number;
  sortOrder: number;
}

export interface OptionRequest {
  type: string;
  label: string;
  enabled?: boolean;
  maxItems?: number;
  sortOrder?: number;
}

export interface OptionItemDTO {
  id: number;
  optionId: number;
  optionType: string;
  value: string;
  hexColor: string | null;
  sortOrder: number;
}

export interface OptionItemRequest {
  optionId?: number;
  value: string;
  hexColor?: string | null;
  sortOrder?: number;
}

export interface OptionTreeDTO extends OptionDTO {
  items: OptionItemDTO[];
}

// Admin requests
export interface PhoneRequest {
  brandId: number;
  name: string;
  description: string;
  screen: string;
  os: string;
  chip: string;
  rearCamera: string;
  frontCamera: string;
  battery: string;
  warranty: string;
}

export interface PhoneVariantRequest {
  ramItemId: number;
  storageItemId: number;
  colorItemId: number;
  price: number;
  discountPrice: number | null;
  stockQuantity: number;
}

export interface BrandRequest {
  name: string;
  logoUrl: string;
}

export interface BannerRequest {
  title: string;
  imageUrl: string;
  linkUrl: string;
  status?: string;
  sortOrder?: number;
  position?: string;
}

export interface PromotionRequest {
  code: string;
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderValue?: number | null;
  quantity?: number;
  startDate: string;
  endDate: string;
  status?: string;
}

// Settings
export interface SettingsDTO {
  id: number;
  settingKey: string;
  settingValue: string;
  description: string | null;
}

// Admin Returns & Refunds
export type ReturnStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type ReturnType = 'EXCHANGE' | 'REFUND';

export interface ReturnResponseDTO {
  id: number;
  returnCode: string;
  orderId: number;
  orderTrackingNumber: string | null;
  phoneVariantId: number;
  phoneName: string | null;
  variantSku: string | null;
  imeiNumber?: string | null;
  userId: number;
  customerName: string | null;
  customerPhone: string | null;
  reason: string;
  errorDescription: string;
  proofImages: string[];
  type: ReturnType;
  status: ReturnStatus;
  refundAmount: number;
  adminNote: string | null;
  reviewedBy: number | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnReviewRequest {
  adminNote?: string;
  newImeiNumber?: string;
}

// Admin Warranty Claims
export type ClaimStatus =
  | 'SUBMITTED'
  | 'IN_INSPECTION'
  | 'REPAIRING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export type HardwareIssueType =
  | 'SCREEN'
  | 'BATTERY'
  | 'MOTHERBOARD'
  | 'CAMERA'
  | 'SPEAKER'
  | 'OTHER';

export interface WarrantyClaimHistoryDTO {
  id: number;
  fromStatus: ClaimStatus | null;
  toStatus: ClaimStatus;
  action: string;
  note: string | null;
  performedByName: string | null;
  createdAt: string;
}

export interface WarrantyClaimResponseDTO {
  id: number;
  claimCode: string;
  warrantyId: number;
  imeiNumber: string;
  productName: string | null;
  customerName: string | null;
  customerPhone: string | null;
  hardwareIssueType: HardwareIssueType;
  issueDescription: string;
  status: ClaimStatus;
  isUnderWarranty: boolean | null;
  repairCost: number | null;
  resolution: string | null;
  rejectionReason: string | null;
  customerNote: string | null;
  createdByName: string | null;
  receivedByName: string | null;
  receivedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  warrantyEndDate: string | null;
  warrantyStatus: string | null;
  histories: WarrantyClaimHistoryDTO[];
}

export interface WarrantyClaimCreateRequest {
  imeiNumber: string;
  hardwareIssueType: HardwareIssueType;
  issueDescription: string;
  repairCost?: number;
  customerNote?: string;
  receivedByName?: string;
}

export interface UpdateClaimStatusRequest {
  status: ClaimStatus;
  resolution?: string;
  note?: string;
  performedByName?: string;
}
