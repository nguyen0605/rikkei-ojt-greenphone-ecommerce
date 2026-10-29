import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined, PhoneOutlined, TagOutlined, ShoppingCartOutlined,
  UserOutlined, StarOutlined, GiftOutlined, PictureOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SettingOutlined,
  MenuOutlined, TagsOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import RequireAuth from '@/components/auth/RequireAuth';
import { useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';

/* Hallmark · macrostructure: Workbench · tone: modern-minimal · anchor hue: green (#16a34a)
 * nav: N3 side-rail · genre: modern-minimal
 * Palette inherited from design.md — Inter, accent ≤ 5%, pill CTAs, fade+slide page reveal.
 */

const menu = [
  { to: '/admin', label: 'Tổng quan', icon: <DashboardOutlined />, end: true },
  { to: '/admin/don-hang', label: 'Đơn hàng', icon: <ShoppingCartOutlined /> },
  { to: '/admin/san-pham', label: 'Sản phẩm', icon: <PhoneOutlined /> },
  { to: '/admin/hang', label: 'Hãng', icon: <TagOutlined /> },
  { to: '/admin/tuy-chon', label: 'Tùy chọn', icon: <TagsOutlined /> },
  { to: '/admin/khach-hang', label: 'Khách hàng', icon: <UserOutlined /> },
  { to: '/admin/danh-gia', label: 'Đánh giá', icon: <StarOutlined /> },
  { to: '/admin/khuyen-mai', label: 'Khuyến mãi', icon: <GiftOutlined /> },
  { to: '/admin/banner', label: 'Banner', icon: <PictureOutlined /> },
  { to: '/admin/cai-dat', label: 'Cài đặt', icon: <SettingOutlined /> },
];

const MAIN_GROUP = menu.slice(0, 1);
const CATALOG_GROUP = menu.slice(1, 6);
const PROMO_GROUP = menu.slice(6, 9);
const SYSTEM_GROUP = menu.slice(9);

function NavItem({ m, collapsed, onNavigate }: { m: (typeof menu)[number]; collapsed: boolean; onNavigate: (path: string) => void }) {
  return (
    <NavLink
      key={m.to}
      to={m.to}
      end={m.end}
      onClick={() => onNavigate(m.to)}
      className={({ isActive }) =>
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ' +
        (isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-ink-2 hover:bg-bg-muted hover:text-ink')
      }
    >
      {({ isActive }) => (
        <>
          {/* Active accent bar */}
          <span
            className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary-600 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`}
          />
          <span className={`text-[15px] leading-none ${isActive ? 'text-primary-600' : 'text-ink-2 group-hover:text-primary-600'}`}>
            {m.icon}
          </span>
          {!collapsed && <span className="truncate">{m.label}</span>}
        </>
      )}
    </NavLink>
  );
}

function NavGroup({ title, items, collapsed, onNavigate }: { title: string; items: typeof menu; collapsed: boolean; onNavigate: (path: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      {!collapsed && (
        <div className="px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-2/70">
          {title}
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((m) => <NavItem key={m.to} m={m} collapsed={collapsed} onNavigate={onNavigate} />)}
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  // Mobile: drawer state (sidebar hidden by default, opens as overlay)
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const go = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <RequireAuth role="ADMIN">
      <div className="flex min-h-screen bg-bg-soft">
        {/* Mobile topbar */}
        <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-rule bg-white px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-bg-muted"
            aria-label="Mở menu"
          >
            <MenuOutlined className="text-base" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GreenPhone" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-sm font-bold text-ink">GreenPhone Admin</span>
          </div>
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-rule bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
            collapsed ? 'lg:w-[68px]' : 'lg:w-60'
          } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-rule px-4">
            <img src="/logo.png" alt="GreenPhone" className="h-10 w-10 shrink-0 rounded-xl object-contain shadow-sm" />
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-bold leading-tight text-ink">GreenPhone</div>
                <div className="text-[11px] leading-tight text-ink-2">Admin Console</div>
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <div className="flex justify-end px-3 pt-2">
            <Button
              type="text"
              size="small"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="!text-ink-2 hover:!text-primary-600"
              aria-label={collapsed ? 'Mở menu' : 'Thu gọn menu'}
            />
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <NavGroup title="Chung" items={MAIN_GROUP} collapsed={collapsed} onNavigate={go} />
            <NavGroup title="Danh mục" items={CATALOG_GROUP} collapsed={collapsed} onNavigate={go} />
            <NavGroup title="Khuyến mãi" items={PROMO_GROUP} collapsed={collapsed} onNavigate={go} />
            <NavGroup title="Hệ thống" items={SYSTEM_GROUP} collapsed={collapsed} onNavigate={go} />
          </nav>

          {/* Footer */}
          <div className="border-t border-rule p-3">
            <button
              onClick={() => { handleLogout(); setMobileOpen(false); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogoutOutlined className="text-[15px] leading-none" />
              {!collapsed && 'Đăng xuất'}
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 pt-14 lg:pt-0">
          <div className="animate-[slide-up_0.2s_ease-out] p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
