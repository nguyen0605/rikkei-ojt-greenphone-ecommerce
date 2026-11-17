import { Drawer } from 'antd';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  X,
  Home,
  Smartphone,
  ArrowLeftRight,
  Tag,
  ShieldCheck,
  UserCircle,
  Package,
  Heart,
  Star,
  LayoutDashboard,
  LogOut,
  LogIn,
  UserPlus,
  ChevronRight,
} from 'lucide-react';
import BrandLogo from '@/components/common/BrandLogo';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { clearCart } from '@/store/slices/cartSlice';
import { clearWishlist } from '@/store/slices/wishlistSlice';
import { resetCheckout } from '@/store/slices/checkoutSlice';
import { ROUTES } from '@/routes/routePaths';
import { cn } from '@/utils';

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  compareCount?: number;
}

const navLinks = [
  { key: 'home', label: 'Trang chủ', href: '/', icon: Home },
  { key: 'products', label: 'Sản phẩm', href: '/san-pham', icon: Smartphone },
  { key: 'compare', label: 'So sánh', href: '/so-sanh', icon: ArrowLeftRight },
  { key: 'vouchers', label: 'Khuyến mãi', href: '/khuyen-mai', icon: Tag },
  { key: 'warranty', label: 'Tra cứu bảo hành', href: '/tra-cuu-bao-hanh', icon: ShieldCheck, highlight: true },
];

export default function MobileNavDrawer({
  open,
  onClose,
  compareCount = 0,
}: MobileNavDrawerProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const wishlistCount = useAppSelector((state) =>
    state.auth?.isAuthenticated ? (state.wishlist?.items?.length ?? 0) : 0
  );

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
    dispatch(clearWishlist());
    dispatch(resetCheckout());
    onClose();
    navigate(ROUTES.HOME);
  };

  return (
    <Drawer
      placement="left"
      open={open}
      onClose={onClose}
      closable={false}
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
        wrapper: { maxWidth: '85vw', width: 310 },
      }}
    >
      {/* Drawer Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
        <div onClick={onClose} className="cursor-pointer">
          <BrandLogo size="sm" />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none transition-colors"
          aria-label="Đóng menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* User Account Section */}
        {isAuthenticated && user ? (
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user.fullName || 'User'
                )}&background=22c55e&color=fff`}
                alt={user.fullName}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-green-100"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-gray-900">
                  {user.fullName}
                </div>
                <div className="truncate text-xs text-gray-500">{user.email}</div>
                {user.role === 'ADMIN' && (
                  <span className="mt-0.5 inline-block rounded bg-green-100 px-1.5 py-0.2 text-[10px] font-bold text-green-700">
                    ADMIN
                  </span>
                )}
              </div>
            </div>

            {/* Quick account links */}
            <div className="border-t border-gray-200/60 pt-2 space-y-1">
              {user.role === 'ADMIN' && (
                <Link
                  to={ROUTES.ADMIN}
                  onClick={onClose}
                  className="flex h-11 items-center gap-3 rounded-lg px-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 text-green-600" />
                  <span>Quản trị viên</span>
                </Link>
              )}
              <Link
                to={ROUTES.ACCOUNT_PROFILE}
                onClick={onClose}
                className="flex h-11 items-center gap-3 rounded-lg px-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
              >
                <UserCircle className="h-4 w-4 text-gray-500" />
                <span>Tài khoản của tôi</span>
              </Link>
              <Link
                to={ROUTES.ACCOUNT_ORDERS}
                onClick={onClose}
                className="flex h-11 items-center gap-3 rounded-lg px-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
              >
                <Package className="h-4 w-4 text-gray-500" />
                <span>Đơn hàng của tôi</span>
              </Link>
              <Link
                to={ROUTES.ACCOUNT_WISHLIST}
                onClick={onClose}
                className="flex h-11 items-center justify-between rounded-lg px-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>Sản phẩm yêu thích</span>
                </div>
                {wishlistCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                to={ROUTES.ACCOUNT_REVIEWS}
                onClick={onClose}
                className="flex h-11 items-center gap-3 rounded-lg px-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
              >
                <Star className="h-4 w-4 text-amber-500" />
                <span>Đánh giá sản phẩm</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-11 w-full items-center gap-3 rounded-lg px-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-green-50/50 p-3.5">
            <p className="mb-2 text-xs text-gray-600">
              Đăng nhập để nhận ưu đãi và đồng bộ đơn hàng
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to={ROUTES.LOGIN}
                onClick={onClose}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-green-700 transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Đăng nhập</span>
              </Link>
              <Link
                to={ROUTES.REGISTER}
                onClick={onClose}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Đăng ký</span>
              </Link>
            </div>
          </div>
        )}

        {/* Main Navigation Links */}
        <div className="space-y-1">
          <div className="px-2 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400">
            Danh mục chính
          </div>
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.href}
                end={item.href === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex h-12 items-center justify-between rounded-xl px-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-green-50 font-semibold text-green-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-green-600'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      item.highlight
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.key === 'compare' && compareCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[11px] font-bold text-white">
                      {compareCount}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Hot
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="border-t border-gray-100 bg-gray-50/50 p-4 text-center">
        <p className="text-xs text-gray-500">Hotline hỗ trợ: 1900 xxxx (8h - 22h)</p>
        <p className="mt-0.5 text-[10px] text-gray-400">GreenPhone Ecommerce v1.0</p>
      </div>
    </Drawer>
  );
}
