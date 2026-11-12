import type { CartItem, Product } from '@/types';
import type { PhoneVariantDTO } from '@/types/api';

/**
 * Builds an isolated CartItem payload for Buy Now checkout without mutating the user's cart.
 */
export function createBuyNowCartItem(
  product: Product,
  variant: PhoneVariantDTO,
  quantity = 1,
): CartItem {
  return {
    id: `buy-now-${variant.id}`,
    productId: product.id,
    variantId: variant.id,
    product,
    quantity,
    maxStock: variant.stockQuantity,
    selectedColor: variant.color,
    selectedStorage: variant.storage,
    addedAt: new Date().toISOString(),
  };
}

