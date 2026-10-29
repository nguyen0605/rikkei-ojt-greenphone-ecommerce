/**
 * Formatting utilities
 */

/**
 * Format số tiền VND
 * @example formatVND(33990000) => "33.990.000đ"
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

/**
 * Format số với dấu phân cách hàng nghìn
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * Format rating hiển thị
 * @example formatRating(4.7) => "4.7"
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * Tính % giảm giá
 */
export function calcDiscountPercent(
  originalPrice: number,
  currentPrice: number,
): number {
  if (originalPrice <= currentPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

/**
 * Rút gọn text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Format số lượng đã bán
 * @example formatSold(1234) => "1.2k"
 */
export function formatSold(count: number): string {
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M';
  if (count >= 1_000) return (count / 1_000).toFixed(1) + 'k';
  return count.toString();
}

/**
 * Format date dd/mm/yyyy
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
