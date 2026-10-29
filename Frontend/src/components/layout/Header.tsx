import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Badge, Dropdown, type MenuProps } from 'antd';
import {
  ShoppingCart,
  LogOut,
  Package,
  UserCircle,
  ChevronDown,
  LogIn,
  LayoutDashboard,
  Star,
} from 'lucide-react';
import BrandLogo from '@/components/common/BrandLogo';
import HeaderSearch from '@/components/layout/HeaderSearch';
import BrandDropdown from '@/components/layout/BrandDropdown';
const navItems = [{ key: 'home', label: 'Trang chủ', href: '/' }, { key: 'products', label: 'Sản phẩm', href: '/san-pham' }, { key: 'vouchers', label: 'Khuyến mãi', href: '/khuyen-mai' }];
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectCartTotalItems } from '@/store/selectors/cartSelectors';
import { logout } from '@/store/slices/authSlice';
import { cn } from '@/utils';
import { ROUTES } from '@/routes/routePaths';

export default function Header() {
  const cartCount = useAppSelector(selectCartTotalItems);
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate(ROUTES.HOME);
  };

  const userMenuItems: MenuProps['items'] = isAuthenticated
    ? [
        {
          key: 'header',
          type: 'group',
          label: (
            <div className="px-1 py-2">
              <div className="text-sm font-semibold text-gray-900">
                {user?.fullName}
              </div>
              <div className="text-xs text-gray-500">{user?.email}</div>
            </div>
          ),
        },
        { type: 'divider' },
        ...(user?.role === 'ADMIN'
          ? [
              {
                key: 'admin',
                icon: <LayoutDashboard className="h-4 w-4" />,
                label: <Link to={ROUTES.ADMIN}>Quản trị viên</Link>,
              },
            ]
          : []),
        {
          key: 'profile',
          icon: <UserCircle className="h-4 w-4" />,
          label: <Link to={ROUTES.ACCOUNT_PROFILE}>Tài khoản của tôi</Link>,
        },
        {
          key: 'orders',
          icon: <Package className="h-4 w-4" />,
          label: <Link to={ROUTES.ACCOUNT_ORDERS}>Đơn hàng của tôi</Link>,
        },
        {
          key: 'reviews',
          icon: <Star className="h-4 w-4" />,
          label: <Link to={ROUTES.ACCOUNT_REVIEWS}>Đánh giá sản phẩm</Link>,
        },
        { type: 'divider' },
        {
          key: 'logout',
          icon: <LogOut className="h-4 w-4" />,
          label: 'Đăng xuất',
          danger: true,
          onClick: handleLogout,
        },
      ]
    : [];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm">
      {/* Row 1: Logo | Brand | Search | Actions */}
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <BrandLogo size="md" />

        <div className="ml-4 hidden shrink-0 md:block">
          <BrandDropdown />
        </div>

        <div className="relative min-w-0 flex-1">
          <HeaderSearch className="mx-auto block w-full max-w-xl" />
        </div>

        {/* Actions — order: Cart → Login/User */}
        <div className="flex items-center gap-2">
          {/* Cart */}
          <Link
            to="/gio-hang"
            className="relative rounded-full p-2 text-gray-700 transition-colors hover:bg-green-50 hover:text-green-600"
            aria-label="Giỏ hàng"
          >
            <Badge count={cartCount} size="small" offset={[-2, 2]}>
              <ShoppingCart className="h-5 w-5" />
            </Badge>
          </Link>

          {/* User dropdown / login link */}
          {isAuthenticated && user ? (
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={['click']}
              placement="bottomRight"
              arrow
            >
              <button
                className="flex items-center gap-1.5 rounded-full p-1 pr-2 text-gray-700 transition-colors hover:bg-green-50 hover:text-green-600"
                aria-label="Tài khoản"
              >
                <img
                  src={
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=22c55e&color=fff`
                  }
                  alt={user.fullName}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-green-100"
                />
                <ChevronDown className="hidden h-3.5 w-3.5 sm:block" />
              </button>
            </Dropdown>
          ) : (
            <Link
              to={ROUTES.LOGIN}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-green-600"
              aria-label="Đăng nhập"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>

      {/* Row 2: Navigation */}
      <div className="border-t border-gray-100">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              return (
                <NavLink
                  key={item.key}
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    cn(
                      'group relative px-4 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'text-green-600'
                        : 'text-gray-700 hover:text-green-600',
                    )
                  }
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-green-600 opacity-0 transition-opacity group-aria-[current=page]:opacity-100"
                  />
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
