import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Truck, Heart, Ticket, Leaf, type LucideIcon } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BrandLogo from '@/components/common/BrandLogo';
import { cn } from '@/utils';

interface AuthLayoutConfig {
  title: string;
  subtitle: string;
  heroImage?: string;
  features?: { Icon: LucideIcon; label: string; desc: string }[];
}

interface AuthLayoutContextValue {
  config: AuthLayoutConfig;
  setConfig: (cfg: AuthLayoutConfig) => void;
}

const defaultFeatures = [
  {
    Icon: Truck as LucideIcon,
    label: 'Theo dõi đơn hàng',
    desc: 'Cập nhật trạng thái đơn hàng mọi lúc, mọi nơi',
  },
  {
    Icon: Heart as LucideIcon,
    label: 'Lưu sản phẩm yêu thích',
    desc: 'Dễ dàng lưu lại những sản phẩm bạn quan tâm',
  },
  {
    Icon: Ticket as LucideIcon,
    label: 'Nhận voucher độc quyền',
    desc: 'Ưu đãi dành riêng cho thành viên GreenPhone',
  },
];

const defaultConfig: AuthLayoutConfig = {
  title: 'Chào mừng đến với GreenPhone',
  subtitle:
    'Đăng nhập để tiếp tục hành trình mua sắm thông minh tại GreenPhone.',
  heroImage: '',
  features: defaultFeatures,
};

const AuthLayoutContext = createContext<AuthLayoutContextValue | null>(null);

export function useAuthLayout() {
  const ctx = useContext(AuthLayoutContext);
  if (!ctx)
    throw new Error('useAuthLayout must be used within <AuthLayout>');
  return ctx;
}

interface AuthLayoutProps {
  initial?: AuthLayoutConfig;
}

export default function AuthLayout({
  initial = defaultConfig,
}: AuthLayoutProps) {
  const [config, setConfig] = useState<AuthLayoutConfig>(initial);

  const value = useMemo(
    () => ({ config, setConfig }),
    [config],
  );

  const features = config.features ?? defaultFeatures;

  return (
    <AuthLayoutContext.Provider value={value}>
      <div className="flex min-h-screen flex-col bg-white">
        {/* Header */}
        <Header />

        {/* Main content area with image background */}
        <main className="relative flex-1">
          {/* Full-area background image */}
          {config.heroImage && (
            <img
              src={config.heroImage}
              alt="GreenPhone"
              className="absolute inset-0 z-0 h-full w-full object-cover"
            />
          )}
          {/* Soft gradient overlay (very subtle) */}
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-white/30 via-transparent to-emerald-100/20" />

          {/* Content grid overlaid on image */}
          <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem-280px)] max-w-[1500px] grid-cols-1 items-stretch gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-8 lg:px-10 lg:py-12">
            {/* Left — text content */}
            <div className="hidden flex-col justify-center self-stretch text-gray-900 lg:flex">

            </div>

            {/* Right — form card floats on top of image, shifted ~60px left from right edge */}
            <div className="flex items-stretch justify-center self-stretch lg:justify-end lg:pr-[60px]">
              <div className="flex w-full max-w-lg flex-col rounded-3xl bg-white/95 p-8 shadow-2xl ring-1 ring-white/60 backdrop-blur-md md:p-10 min-h-[560px]">
                <Outlet />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </AuthLayoutContext.Provider>
  );
}
