/**
 * App route paths constants
 */

export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/san-pham',
  PRODUCT_DETAIL: (id = ':id') => `/san-pham/${id}`,
  VOUCHERS: '/khuyen-mai',
  SEARCH: '/tim-kiem',
  CART: '/gio-hang',
  CHECKOUT: '/thanh-toan',
  CHECKOUT_PAYMENT: (id = ':orderId') => `/thanh-toan/${id}`,
  CHECKOUT_SUCCESS: '/thanh-toan/hoan-tat',
  WISHLIST: '/yeu-thich',
  // Legal
  DIEU_KHOAN: '/dieu-khoan',
  CHINH_SACH_BAO_MAT: '/chinh-sach-bao-mat',
  // Auth
  LOGIN: '/dang-nhap',
  REGISTER: '/dang-ky',
  FORGOT_PASSWORD: '/quen-mat-khau',
  VERIFY_OTP: '/xac-thuc-otp',
  ADMIN_LOGIN: '/admin/dang-nhap',
  // Customer account
  ACCOUNT: '/tai-khoan',
  ACCOUNT_PROFILE: '/tai-khoan/thong-tin',
  ACCOUNT_ORDERS: '/tai-khoan/don-hang',
  ACCOUNT_REVIEWS: '/tai-khoan/danh-gia',
  ACCOUNT_WISHLIST: '/tai-khoan/yeu-thich',
  ACCOUNT_CHANGE_PASSWORD: '/tai-khoan/doi-mat-khau',
  // Admin
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_PRODUCTS: '/admin/san-pham',
  ADMIN_BRANDS: '/admin/hang',
  ADMIN_OPTIONS: '/admin/tuy-chon',
  ADMIN_ORDERS: '/admin/don-hang',
  ADMIN_CUSTOMERS: '/admin/khach-hang',
  ADMIN_REVIEWS: '/admin/danh-gia',
  ADMIN_PROMOTIONS: '/admin/khuyen-mai',
  ADMIN_BANNERS: '/admin/banner',
  ADMIN_SETTINGS: '/admin/cai-dat',
  NOT_FOUND: '*',
} as const;

export const BREADCRUMB_LABELS: Record<string, string> = {
  '/': 'Trang chủ',
  '/san-pham': 'Sản phẩm',
  '/khuyen-mai': 'Khuyến mãi',
  '/tim-kiem': 'Tìm kiếm',
  '/gio-hang': 'Giỏ hàng',
  '/thanh-toan': 'Thanh toán',
  '/dieu-khoan': 'Điều khoản',
  '/chinh-sach-bao-mat': 'Chính sách bảo mật',
  '/dang-nhap': 'Đăng nhập',
  '/dang-ky': 'Đăng ký',
  '/quen-mat-khau': 'Quên mật khẩu',
  '/tai-khoan': 'Tài khoản',
};
