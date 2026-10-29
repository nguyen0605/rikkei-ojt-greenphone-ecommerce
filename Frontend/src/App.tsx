import AppRoutes from './routes/AppRoutes';
import SettingsLoader from '@/components/common/SettingsLoader';

export default function App() {
  return (
    <SettingsLoader>
      <AppRoutes />
    </SettingsLoader>
  );
}
