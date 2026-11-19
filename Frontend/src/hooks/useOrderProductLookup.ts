import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { phoneService } from '@/services';
import type { PhoneDTO, OrderDetailDTO } from '@/types/api';

export interface ResolvedProductInfo {
  phoneId?: number;
  imageUrl?: string;
  isInactive: boolean;
  navUrl?: string;
  slug?: string;
}

/**
 * Normalizes a string for fuzzy matching (lowercase, trimmed, strip redundant spaces).
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics for robust matching
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates an SEO-friendly URL slug from product name.
 */
export function generateProductSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Custom hook to resolve product details (actual image, phoneId, active/inactive status, navUrl)
 * for order items in Client and Admin views without N+1 API calls.
 *
 * Uses TanStack Query with 5-minute cache time so a single catalog request is shared
 * across all orders and order items on the page.
 */
export function useOrderProductLookup() {
  const { data: phonePage } = useQuery({
    queryKey: ['phones-lookup-catalog'],
    queryFn: () => phoneService.list({ size: '100' }),
    staleTime: 5 * 60 * 1000,
  });

  const phones = useMemo(() => phonePage?.content || [], [phonePage]);

  // Sort candidate phones by name length descending so specific names (e.g. "iPhone 15 Pro Max")
  // match before shorter prefix names (e.g. "iPhone 15").
  const sortedPhones = useMemo(() => {
    return [...phones].sort((a, b) => b.name.length - a.name.length);
  }, [phones]);

  const resolveItem = (item: OrderDetailDTO): ResolvedProductInfo => {
    const directPhoneId = item.phoneId ?? (item as { phoneId?: number }).phoneId;
    const directImageUrl = item.imageUrl ?? (item as { imageUrl?: string }).imageUrl;
    const directProductStatus = item.productStatus ?? (item as { productStatus?: string }).productStatus;

    let matchedPhone: PhoneDTO | undefined;

    // 1. Match by direct phoneId if present in active catalog
    if (directPhoneId) {
      matchedPhone = phones.find((p) => p.id === directPhoneId);
    }

    // 2. Strict match by productName: only if NOT matched and NO direct imageUrl
    if (!matchedPhone && !directImageUrl && item.productName) {
      const normalizedItem = normalizeText(item.productName);

      matchedPhone = sortedPhones.find((p) => {
        const normalizedP = normalizeText(p.name);
        if (normalizedItem === normalizedP) return true;
        // Only allow word-boundary prefix match if the rest is NOT a sub-model differentiator (ultra, pro, max...)
        if (normalizedItem.startsWith(normalizedP + ' ')) {
          const rest = normalizedItem.slice(normalizedP.length + 1).trim();
          const firstRestWord = rest.split(' ')[0];
          const differentiators = ['ultra', 'pro', 'max', 'plus', 'fe', 'lite', 'flip', 'fold', 'se'];
          if (differentiators.includes(firstRestWord)) {
            return false; // e.g. "Xiaomi 14 Ultra" must NOT match "Xiaomi 14"
          }
          return true;
        }
        return false;
      });
    }

    const phoneId = directPhoneId || matchedPhone?.id;
    // CRITICAL: Always prioritize directImageUrl snapshot from order detail.
    // If phone is inactive / not in catalog, NEVER fallback to another phone's image!
    const imageUrl = directImageUrl || matchedPhone?.mainImageUrl;

    // A product is inactive if directProductStatus is INACTIVE, or matched phone is INACTIVE,
    // or if directPhoneId was provided but phone is not in active catalog
    const isInactive =
      directProductStatus === 'INACTIVE' ||
      (matchedPhone ? matchedPhone.status === 'INACTIVE' : Boolean(directPhoneId && !matchedPhone));

    const slug = matchedPhone?.name
      ? generateProductSlug(matchedPhone.name)
      : item.productName
        ? generateProductSlug(item.productName)
        : undefined;

    // Valid navigation URL requires a valid phoneId and an active product
    // Uses canonical query parameter `variantId` (avoiding redundant `variant` parameter in modern URLs)
    const navUrl =
      phoneId && !isInactive
        ? `/san-pham/${phoneId}?variantId=${item.phoneVariantId}${
            slug ? `&slug=${slug}` : ''
          }`
        : undefined;

    return {
      phoneId,
      imageUrl,
      isInactive,
      navUrl,
      slug,
    };
  };

  return { resolveItem, phones };
}
