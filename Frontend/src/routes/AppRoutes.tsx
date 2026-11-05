import { lazy, Suspense, type ReactElement } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spin } from 'antd';
import DefaultLayout from '@/layouts/DefaultLayout';
import CheckoutLayout from '@/layouts/CheckoutLayout';
import AccountLayout from '@/layouts/AccountLayout';
import AdminLayout from '@/layouts/AdminLayout';
import AuthLayout from '@/pages/auth/AuthLayout';
import { ROUTES } from './routePaths';

const HomePage = lazy(() => import('@/pages/HomePage'));
const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const VouchersPage = lazy(() => import('@/pages/VouchersPage'));
const CartPage = lazy(() => import('@/pages/cart/CartPage'));
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
const AccountOrdersPage = lazy(() => import('@/pages/account/AccountOrdersPage'));
const AccountOrderDetailPage = lazy(() => import('@/pages/account/AccountOrderDetailPage'));
const AccountReviewsPage = lazy(() => import('@/pages/account/AccountReviewsPage'));
const AccountPasswordPage = lazy(() => import('@/pages/account/AccountPasswordPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage'));
const AdminBrandsPage = lazy(() => import('@/pages/admin/AdminBrandsPage'));
const AdminOptionsPage = lazy(() => import('@/pages/admin/AdminOptionsPage'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminReviewsPage = lazy(() => import('@/pages/admin/AdminReviewsPage'));
const AdminPromotionsPage = lazy(() => import('@/pages/admin/AdminPromotionsPage'));
const AdminBannersPage = lazy(() => import('@/pages/admin/AdminBannersPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Spin size="large" />
  </div>
);

const withSuspense = (Component: React.LazyExoticComponent<() => ReactElement | null>) => (
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
        <Route path={ROUTES.REGISTER} element={withSuspense(RegisterPage)} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={withSuspense(ForgotPasswordPage)} />
        <Route path={ROUTES.VERIFY_OTP} element={withSuspense(VerifyOTPPage)} />
      </Route>

      {/* Account Layout */}
      <Route element={<AccountLayout />}>
        <Route path={ROUTES.ACCOUNT_PROFILE} element={withSuspense(AccountProfilePage)} />
        <Route path={ROUTES.ACCOUNT_ORDERS} element={withSuspense(AccountOrdersPage)} />
        <Route path="/tai-khoan/don-hang/:id" element={withSuspense(AccountOrderDetailPage)} />
        <Route path={ROUTES.ACCOUNT_REVIEWS} element={withSuspense(AccountReviewsPage)} />
        <Route path={ROUTES.ACCOUNT_CHANGE_PASSWORD} element={withSuspense(AccountPasswordPage)} />
      </Route>

      {/* Admin Layout */}
      <Route element={<AdminLayout />}>
        <Route path={ROUTES.ADMIN} element={withSuspense(AdminDashboardPage)} />
        <Route path={ROUTES.ADMIN_PRODUCTS} element={withSuspense(AdminProductsPage)} />
        <Route path={ROUTES.ADMIN_BRANDS} element={withSuspense(AdminBrandsPage)} />
        <Route path={ROUTES.ADMIN_OPTIONS} element={withSuspense(AdminOptionsPage)} />
        <Route path={ROUTES.ADMIN_ORDERS} element={withSuspense(AdminOrdersPage)} />
        <Route path={ROUTES.ADMIN_CUSTOMERS} element={withSuspense(AdminUsersPage)} />
        <Route path={ROUTES.ADMIN_REVIEWS} element={withSuspense(AdminReviewsPage)} />
        <Route path={ROUTES.ADMIN_PROMOTIONS} element={withSuspense(AdminPromotionsPage)} />
        <Route path={ROUTES.ADMIN_BANNERS} element={withSuspense(AdminBannersPage)} />
        <Route path={ROUTES.ADMIN_SETTINGS} element={withSuspense(AdminSettingsPage)} />
      </Route>
    </Routes>
  );
}
