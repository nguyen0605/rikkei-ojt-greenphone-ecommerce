import { NavLink, Outlet } from 'react-router-dom';
import {
  UserOutlined, ShoppingOutlined, LockOutlined, ArrowLeftOutlined, StarOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';
import RequireAuth from '@/components/auth/RequireAuth';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const links = [
  { to: '/tai-khoan/thong-tin', label: 'Thông tin tài khoản', icon: <UserOutlined /> },
  { to: '/tai-khoan/don-hang', label: 'Đơn hàng của tôi', icon: <ShoppingOutlined /> },
  { to: '/tai-khoan/danh-gia', label: 'Đánh giá sản phẩm', icon: <StarOutlined /> },
  { to: '/tai-khoan/doi-mat-khau', label: 'Đổi mật khẩu', icon: <LockOutlined /> },
];

export default function AccountLayout() {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-50/50 to-white">
        <Header />
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="mb-8">
            <NavLink to="/" className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-green-600">
              <ArrowLeftOutlined /> Trang chủ
            </NavLink>
            <h1 className="text-2xl font-bold text-gray-900">Tài khoản của tôi</h1>
            <p className="mt-1 text-sm text-gray-500">Quản lý thông tin cá nhân và đơn hàng</p>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Sidebar nav */}
            <nav className="w-full shrink-0 lg:w-64">
              {/* Profile card */}
              <div className="mb-4 rounded-2xl bg-gradient-to-r from-green-600 to-green-700 p-5 text-white shadow-lg shadow-green-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-xl font-bold ring-2 ring-white/40">
                    {(user?.fullName || 'U')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{user?.fullName || 'Khách hàng'}</div>
                    <div className="truncate text-xs text-green-100">{user?.email || ''}</div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="space-y-0.5 p-2">
                  {links.map((l) => (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      end
                      className={({ isActive }) =>
                        'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ' +
                        (isActive
                          ? 'bg-green-600 text-white shadow-md shadow-green-200'
                          : 'text-gray-600 hover:bg-green-50 hover:text-green-700')
                      }
                    >
                      <span className="text-base">{l.icon}</span>
                      <span>{l.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* Mini stats */}
              <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Hỗ trợ</div>
                <div className="mt-2 space-y-2 text-sm text-gray-600">
                  <p className="flex items-center gap-2"><span className="text-green-600">☎</span> 1900.1234</p>
                  <p className="flex items-center gap-2"><span className="text-green-600">✉</span> hotro@greenphone.vn</p>
                </div>
              </div>
            </nav>

            {/* Main content */}
            <main className="min-w-0 flex-1">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
        <Footer />
      </div>
    </RequireAuth>
  );
}
