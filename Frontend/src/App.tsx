import AppRoutes from './routes/AppRoutes';
import SettingsLoader from '@/components/common/SettingsLoader';
import SessionHydrator from '@/components/common/SessionHydrator';
import CartHydrator from '@/components/common/CartHydrator';
import WishlistHydrator from '@/components/common/WishlistHydrator';
import ScrollToTop from '@/components/common/ScrollToTop';

export default function App() {
  return (
    <SettingsLoader>
      <ScrollToTop />
      <SessionHydrator />
      <CartHydrator />
      <WishlistHydrator />
      <AppRoutes />
    </SettingsLoader>
  );
}
