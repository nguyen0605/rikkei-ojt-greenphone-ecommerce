import AppRoutes from './routes/AppRoutes';
import SettingsLoader from '@/components/common/SettingsLoader';
import CartHydrator from '@/components/common/CartHydrator';

export default function App() {
  return (
    <SettingsLoader>
      <CartHydrator />
      <AppRoutes />
    </SettingsLoader>
  );
}
