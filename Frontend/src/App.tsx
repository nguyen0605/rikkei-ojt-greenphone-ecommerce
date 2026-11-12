import AppRoutes from './routes/AppRoutes';
import SettingsLoader from '@/components/common/SettingsLoader';
import CartHydrator from '@/components/common/CartHydrator';
import WishlistHydrator from '@/components/common/WishlistHydrator';

export default function App() {
  return (
    <SettingsLoader>
      <CartHydrator />
      <WishlistHydrator />
      <AppRoutes />
    </SettingsLoader>
  );
}
