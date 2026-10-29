// API response types matching backend DTOs

export interface ApiResponse<T> {
  status: number;
  message: string;
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
}

// Review
export interface ReviewDTO {
  id: number;
  userId: number;
  userName: string;
  phoneId: number;
  rating: number;
  content: string;
  status: string;
  createdAt: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
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
  finalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  note: string;
  promotionCode: string;
  createdAt: string;
  orderDetails: OrderDetailDTO[];
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
  role: string;
  status: string;
}

export interface UserProfileRequest {
  fullName: string;
  phone: string;
  address: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
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
}

export interface PromotionRequest {
  code: string;
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount: number;
  minOrderValue: number;
  quantity: number;
  startDate: string;
  endDate: string;
}

// Settings
export interface SettingsDTO {
  id: number;
  settingKey: string;
  settingValue: string;
  description: string | null;
}
