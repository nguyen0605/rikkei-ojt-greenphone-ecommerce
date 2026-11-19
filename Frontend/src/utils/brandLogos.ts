/**
 * Cloudflare R2 Object Storage Brand Logos Configuration
 * Centralized mapping for all official phone brands to secure R2 storage.
 */

export const CLOUDFLARE_R2_BASE = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev';

export const BRAND_R2_LOGOS: Record<string, string> = {
  apple: `${CLOUDFLARE_R2_BASE}/brands/Apple.webp`,
  samsung: `${CLOUDFLARE_R2_BASE}/brands/samsung.avif`,
  oppo: `${CLOUDFLARE_R2_BASE}/brands/OPPO.webp`,
  xiaomi: `${CLOUDFLARE_R2_BASE}/brands/Xiaomi.webp`,
  asus: `${CLOUDFLARE_R2_BASE}/brands/ASUS_Logo_1.png`,
  oneplus: `${CLOUDFLARE_R2_BASE}/brands/oneplus.svg.webp`,
  'google pixel': `${CLOUDFLARE_R2_BASE}/brands/google-pixel.svg`,
  google: `${CLOUDFLARE_R2_BASE}/brands/google-pixel.svg`,
  sony: `${CLOUDFLARE_R2_BASE}/brands/sony.svg`,
};

/**
 * Returns the secure Cloudflare R2 URL for a brand logo.
 * Always prioritizes official Cloudflare R2 assets over legacy DB or Cloudinary URLs.
 */
export function getBrandLogoUrl(brandName?: string | null, rawLogoUrl?: string | null): string {
  if (brandName) {
    const key = brandName.trim().toLowerCase();
    if (BRAND_R2_LOGOS[key]) {
      return BRAND_R2_LOGOS[key];
    }
    if (key.includes('google')) {
      return BRAND_R2_LOGOS['google pixel'];
    }
    if (key.includes('asus')) {
      return BRAND_R2_LOGOS.asus;
    }
    if (key.includes('oneplus')) {
      return BRAND_R2_LOGOS.oneplus;
    }
    if (key.includes('apple')) {
      return BRAND_R2_LOGOS.apple;
    }
    if (key.includes('samsung')) {
      return BRAND_R2_LOGOS.samsung;
    }
    if (key.includes('xiaomi')) {
      return BRAND_R2_LOGOS.xiaomi;
    }
    if (key.includes('oppo')) {
      return BRAND_R2_LOGOS.oppo;
    }
    if (key.includes('sony')) {
      return BRAND_R2_LOGOS.sony;
    }
  }

  // If raw logo is already on Cloudflare R2, use it
  if (rawLogoUrl && rawLogoUrl.startsWith(CLOUDFLARE_R2_BASE)) {
    return rawLogoUrl;
  }

  // Fallback to provided URL if any
  return rawLogoUrl || '';
}
