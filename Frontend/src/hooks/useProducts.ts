import { useQuery } from '@tanstack/react-query';
import { phoneService } from '@/services';

export function usePhones(params?: Record<string, string>) {
  return useQuery({ queryKey: ['phones', params], queryFn: () => phoneService.list(params) });
}

export function usePhone(id: number) {
  return useQuery({ queryKey: ['phone', id], queryFn: () => phoneService.detail(id), enabled: !!id });
}

export function useBrands() {
  return useQuery({ queryKey: ['brands'], queryFn: () => import('@/services').then(m => m.brandService.list()) });
}
