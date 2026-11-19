import { describe, it, expect } from 'vitest';
import { getBrandLogoUrl, BRAND_R2_LOGOS, CLOUDFLARE_R2_BASE } from '../brandLogos';

describe('brandLogos utils', () => {
  const R2_BRAND_BASE_URL = `${CLOUDFLARE_R2_BASE}/brands`;

  it('should return official R2 logo for ASUS with correct filename', () => {
    const url = getBrandLogoUrl('ASUS', 'https://example.com/old-asus.svg');
    expect(url).toBe(`${R2_BRAND_BASE_URL}/ASUS_Logo_1.png`);
  });

  it('should return official R2 logo for OnePlus with correct filename', () => {
    const url = getBrandLogoUrl('OnePlus', 'https://example.com/old-oneplus.svg');
    expect(url).toBe(`${R2_BRAND_BASE_URL}/oneplus.svg.webp`);
  });

  it('should return official R2 logo for Apple, Samsung, Xiaomi, OPPO, Google Pixel, Sony', () => {
    expect(getBrandLogoUrl('Apple')).toBe(`${R2_BRAND_BASE_URL}/Apple.webp`);
    expect(getBrandLogoUrl('Samsung')).toBe(`${R2_BRAND_BASE_URL}/samsung.avif`);
    expect(getBrandLogoUrl('Xiaomi')).toBe(`${R2_BRAND_BASE_URL}/Xiaomi.webp`);
    expect(getBrandLogoUrl('OPPO')).toBe(`${R2_BRAND_BASE_URL}/OPPO.webp`);
    expect(getBrandLogoUrl('Google Pixel')).toBe(`${R2_BRAND_BASE_URL}/google-pixel.svg`);
    expect(getBrandLogoUrl('Sony')).toBe(`${R2_BRAND_BASE_URL}/sony.svg`);
  });

  it('should fallback to rawLogoUrl for unknown brands if provided', () => {
    const customUrl = 'https://custom-brand.com/logo.png';
    expect(getBrandLogoUrl('CustomPhone', customUrl)).toBe(customUrl);
  });

  it('should return empty string if brand is unknown and no rawLogoUrl', () => {
    expect(getBrandLogoUrl('UnknownBrand', '')).toBe('');
  });
});
