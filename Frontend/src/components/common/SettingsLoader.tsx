import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hooks';
import { setSettings } from '@/store/slices/settingsSlice';
import { settingsService } from '@/services';

/**
 * Fetches public shop settings (shipping fee, free-shipping threshold) once
 * and pushes them into redux so cart/checkout totals can use the live values.
 */
export default function SettingsLoader({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { data } = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => settingsService.get(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data) {
      dispatch(setSettings(data));
    }
  }, [data, dispatch]);

  return <>{children}</>;
}
