import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import DefaultLayout from '@/layouts/DefaultLayout';
import CheckoutLayout from '@/layouts/CheckoutLayout';
import AccountLayout from '@/layouts/AccountLayout';
import AdminLayout from '@/layouts/AdminLayout';
import AuthLayout from '@/pages/auth/AuthLayout';
import RequireRole from '@/components/auth/RequireRole';
import { ROUTES } from './routePaths';

const HomePage = lazy(() => import('@/pages/HomePage'));
const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const VouchersPage = lazy(() => import('@/pages/VouchersPage'));
const CartPage = lazy(() => import('@/pages/cart/CartPage'));
const WishlistPage = lazy(() => import('@/pages/customer/WishlistPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const PaymentPage = lazy(() => import('@/pages/PaymentPage'));
const CheckoutSuccessPage = lazy(() => import('@/pages/CheckoutSuccessPage'));
const TermsPage = lazy(() => import('@/pages/terms/TermsPageShell'));
const PrivacyPage = lazy(() => import('@/pages/terms/PrivacyPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const VerifyOTPPage = lazy(() => import('@/pages/auth/VerifyOTPPage'));
const AccountProfilePage = lazy(() => import('@/pages/account/AccountProfilePage'));
const NotificationCenterPage = lazy(() => import('@/pages/account/NotificationCenterPage'));
const AddressBookPage = lazy(() => import('@/pages/account/AddressBookPage'));
const AccountOrdersPage = lazy(() => import('@/pages/account/AccountOrdersPage'));
const AccountOrderDetailPage = lazy(() => import('@/pages/account/AccountOrderDetailPage'));
const AccountReviewsPage = lazy(() => import('@/pages/account/AccountReviewsPage'));
const AccountPasswordPage = lazy(() => import('@/pages/account/AccountPasswordPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage'));
const AdminInventoryPage = lazy(() => import('@/pages/admin/AdminInventoryPage'));
const AdminWarehousesPage = lazy(() => import('@/pages/admin/inventory/AdminWarehousesPage'));
const AdminWarehouseDetailPage = lazy(() => import('@/pages/admin/inventory/AdminWarehouseDetailPage'));
const AdminBrandsPage = lazy(() => import('@/pages/admin/AdminBrandsPage'));
const AdminOptionsPage = lazy(() => import('@/pages/admin/AdminOptionsPage'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const AdminReturnsPage = lazy(() => import('@/pages/admin/AdminReturnsPage'));
const AdminWarrantyClaimsPage = lazy(() => import('@/pages/admin/AdminWarrantyClaimsPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminReviewsPage = lazy(() => import('@/pages/admin/AdminReviewsPage'));
const AdminPromotionsPage = lazy(() => import('@/pages/admin/marketing/AdminVoucherPage'));
const AdminBannersPage = lazy(() => import('@/pages/admin/marketing/AdminBannerPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));
const AdminStaffPage = lazy(() => import('@/pages/admin/AdminStaffPage'));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Spin size="large" />
  </div>
);

const withSuspense = (Component: LazyExoticComponent<ComponentType<any>>) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Default Layout */}
      <Route element={<DefaultLayout />}>
        <Route path={ROUTES.HOME} element={withSuspense(HomePage)} />
        <Route path={ROUTES.PRODUCTS} element={withSuspense(ProductsPage)} />
        <Route path={ROUTES.PRODUCT_DETAIL()} element={withSuspense(ProductDetailPage)} />
        <Route path={ROUTES.VOUCHERS} element={withSuspense(VouchersPage)} />
        <Route path={ROUTES.CART} element={withSuspense(CartPage)} />
        <Route path={ROUTES.WISHLIST} element={<Navigate to={ROUTES.ACCOUNT_WISHLIST} replace />} />
        <Route path="/wishlist" element={<Navigate to={ROUTES.ACCOUNT_WISHLIST} replace />} />
        <Route path={ROUTES.DIEU_KHOAN} element={withSuspense(TermsPage)} />
        <Route path={ROUTES.CHINH_SACH_BAO_MAT} element={withSuspense(PrivacyPage)} />
        <Route path="*" element={withSuspense(NotFoundPage)} />
      </Route>

      {/* Checkout Layout */}
      <Route element={<CheckoutLayout />}>
        <Route path={ROUTES.CHECKOUT} element={withSuspense(CheckoutPage)} />
        <Route path={ROUTES.CHECKOUT_PAYMENT()} element={withSuspense(PaymentPage)} />
        <Route path={ROUTES.CHECKOUT_SUCCESS} element={withSuspense(CheckoutSuccessPage)} />
      </Route>

      {/* Auth Layout */}
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.LOGIN} element={withSuspense(LoginPage)} />
        <Route path={ROUTES.ADMIN_LOGIN} element={withSuspense(LoginPage)} />
        <Route path={ROUTES.REGISTER} element={withSuspense(RegisterPage)} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={withSuspense(ForgotPasswordPage)} />
        <Route path={ROUTES.VERIFY_OTP} element={withSuspense(VerifyOTPPage)} />
      </Route>

      {/* Account Layout */}
      <Route element={<AccountLayout />}>
        <Route path={ROUTES.ACCOUNT} element={<Navigate to={ROUTES.ACCOUNT_PROFILE} replace />} />
        <Route path={ROUTES.ACCOUNT_PROFILE} element={withSuspense(AccountProfilePage)} />
        <Route path={ROUTES.ACCOUNT_NOTIFICATIONS} element={withSuspense(NotificationCenterPage)} />
        <Route path={ROUTES.ACCOUNT_ADDRESSES} element={withSuspense(AddressBookPage)} />
        <Route path={ROUTES.ACCOUNT_ORDERS} element={withSuspense(AccountOrdersPage)} />
        <Route path="/tai-khoan/don-hang/:id" element={withSuspense(AccountOrderDetailPage)} />
        <Route path={ROUTES.ACCOUNT_REVIEWS} element={withSuspense(AccountReviewsPage)} />
        <Route path={ROUTES.ACCOUNT_WISHLIST} element={withSuspense(WishlistPage)} />
        <Route path={ROUTES.ACCOUNT_CHANGE_PASSWORD} element={withSuspense(AccountPasswordPage)} />
        {/* Aliases for English /account routes */}
        <Route path="/account" element={<Navigate to={ROUTES.ACCOUNT_PROFILE} replace />} />
        <Route path="/account/profile" element={<Navigate to={ROUTES.ACCOUNT_PROFILE} replace />} />
        <Route path="/account/addresses" element={<Navigate to={ROUTES.ACCOUNT_ADDRESSES} replace />} />
        <Route path="/account/orders" element={<Navigate to={ROUTES.ACCOUNT_ORDERS} replace />} />
        <Route path="/account/wishlist" element={<Navigate to={ROUTES.ACCOUNT_WISHLIST} replace />} />
        <Route path="/account/change-password" element={<Navigate to={ROUTES.ACCOUNT_CHANGE_PASSWORD} replace />} />
      </Route>

      {/* Admin Layout */}
      <Route element={<AdminLayout />}>
        <Route path={ROUTES.ADMIN} element={withSuspense(AdminDashboardPage)} />
        <Route path={ROUTES.ADMIN_PRODUCTS} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_MARKETING']}>{withSuspense(AdminProductsPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_INVENTORY} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_WAREHOUSE']}>{withSuspense(AdminInventoryPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_WAREHOUSES} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_WAREHOUSE']}>{withSuspense(AdminWarehousesPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_WAREHOUSE_DETAIL} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_WAREHOUSE']}>{withSuspense(AdminWarehouseDetailPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_BRANDS} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_MARKETING']}>{withSuspense(AdminBrandsPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_OPTIONS} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_MARKETING']}>{withSuspense(AdminOptionsPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_ORDERS} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_SALES', 'ROLE_WAREHOUSE']}>{withSuspense(AdminOrdersPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_RETURNS} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_WAREHOUSE', 'ROLE_SALES']}>{withSuspense(AdminReturnsPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_WARRANTY_CLAIMS} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_WAREHOUSE']}>{withSuspense(AdminWarrantyClaimsPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_CUSTOMERS} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_SALES']}>{withSuspense(AdminUsersPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_STAFF} element={<RequireRole allowedRoles={['ROLE_ADMIN']}>{withSuspense(AdminStaffPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_REVIEWS} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_MARKETING', 'ROLE_SALES']}>{withSuspense(AdminReviewsPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_PROMOTIONS} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_MARKETING']}>{withSuspense(AdminPromotionsPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_VOUCHERS} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_MARKETING']}>{withSuspense(AdminPromotionsPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_BANNERS} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_MARKETING']}>{withSuspense(AdminBannersPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_BANNERS_ALT} element={<RequireRole allowedRoles={['ROLE_ADMIN', 'ROLE_MARKETING']}>{withSuspense(AdminBannersPage)}</RequireRole>} />
        <Route path={ROUTES.ADMIN_SETTINGS} element={<RequireRole allowedRoles={['ROLE_ADMIN']}>{withSuspense(AdminSettingsPage)}</RequireRole>} />
      </Route>
    </Routes>
  );
}
