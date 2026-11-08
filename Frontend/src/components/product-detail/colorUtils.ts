export const COLOR_NAME_TO_HEX: Record<string, string> = {
  // Apple Titanium
  'titan tự nhiên': '#C0C0C0',
  'natural titanium': '#9F9C96',
  'titan đen': '#2C2C2C',
  'black titanium': '#2C2C2C',
  'titan trắng': '#F2F2F2',
  'white titanium': '#F2F2F2',
  'titan xanh': '#3B4856',
  'blue titanium': '#3B4856',
  'titan xám': '#6E6E6E',
  'gray titanium': '#6E6E6E',

  // Basic colors (Vietnamese & English)
  'đen': '#1F1F1F',
  'black': '#1F1F1F',
  'đen midnight': '#2E2E2E',
  'midnight': '#2E2E2E',
  'trắng': '#F8F8F8',
  'white': '#F8F8F8',
  'bạc': '#E5E7EB',
  'silver': '#E5E7EB',
  'xám': '#6B7280',
  'gray': '#6B7280',
  'grey': '#6B7280',

  // Vibrant colors
  'xanh mint': '#A8E6CF',
  'mint': '#A8E6CF',
  'hồng': '#FFB6C1',
  'pink': '#FFB6C1',
  'tím': '#8B5CF6',
  'tím lilac': '#C8A2C8',
  'lilac': '#C8A2C8',
  'purple': '#8B5CF6',
  'xanh dương': '#4A90D9',
  'blue': '#4A90D9',
  'xanh forest': '#228B22',
  'forest green': '#228B22',
  'xanh lá': '#22C55E',
  'green': '#22C55E',
  'xanh navy': '#1F3A5F',
  'navy': '#1F3A5F',
  'vàng': '#E8C547',
  'yellow': '#E8C547',
  'gold': '#D4AF37',
  'đỏ': '#EF4444',
  'red': '#EF4444',
  'cam': '#F97316',
  'orange': '#F97316',
};

/**
 * Returns a valid HEX color code for a given color name or explicit hex value.
 * Safely falls back to neutral gray (#9CA3AF) if unrecognized.
 */
export function getColorHex(colorName: string, explicitHex?: string | null): string {
  if (explicitHex && /^#([0-9A-Fa-f]{3}){1,2}$/.test(explicitHex.trim())) {
    return explicitHex.trim();
  }
  if (!colorName) return '#9CA3AF';

  const normalized = colorName.trim().toLowerCase();
  if (COLOR_NAME_TO_HEX[normalized]) {
    return COLOR_NAME_TO_HEX[normalized];
  }

  // Substring matching for compound names
  for (const [key, hex] of Object.entries(COLOR_NAME_TO_HEX)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return hex;
    }
  }

  return '#9CA3AF';
}
