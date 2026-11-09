import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hooks';
import { promotionService } from '@/services';
import type { UserPromotionDTO } from '@/types/api';

export function useMyPromotions() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return useQuery<UserPromotionDTO[]>({
    queryKey: ['promotions', 'my'],
    queryFn: () => promotionService.myPromotions(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}
