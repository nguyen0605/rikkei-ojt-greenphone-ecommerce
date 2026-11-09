import type { ReviewDTO, ReviewFilterType } from '@/types/api';

/**
 * Ẩn một phần tên khách hàng để bảo vệ quyền riêng tư theo chuẩn Ecommerce (CellphoneS, Shopee).
 * Ví dụ:
 * - "Nguyễn Văn An" -> "Nguyễn V***"
 * - "nguyen" -> "ngu***"
 * - "thinhtattoo2006@gmail.com" -> "thin***"
 * - "0827242427" -> "KH***"
 * - null / "" -> "Khách hàng"
 */
export function maskCustomerName(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'Khách hàng';
  const trimmed = name.trim();
  if (!trimmed) return 'Khách hàng';

  // Nếu người dùng hiển thị là email, chỉ lấy phần username phía trước
  const base = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;

  // Nếu là số điện thoại hoặc chuỗi số dài, ẩn thay thế bằng KH
  const cleaned = base.replace(/(\+?84|0)\d{8,10}/g, 'KH');

  // Nếu có từ 2 từ trở lên (họ tên tiếng Việt: "Nguyễn Văn An")
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const firstWord = words[0];
    const secondInitial = words[1].charAt(0).toUpperCase();
    return `${firstWord} ${secondInitial}***`;
  }

  if (cleaned.length <= 2) {
    return `${cleaned.charAt(0)}***`;
  }

  // Nếu chỉ có 1 từ (ví dụ "nguyen" -> "ngu***")
  const visibleChars = Math.min(4, Math.max(2, Math.floor(cleaned.length / 2)));
  return `${cleaned.slice(0, visibleChars)}***`;
}

/**
 * Tính tỷ lệ phần trăm của từng mức sao trên tổng số đánh giá.
 * Tránh lỗi chia cho 0 khi chưa có đánh giá nào.
 */
export function calculateStarPercentage(count: number, total: number): number {
  if (!total || total <= 0 || !count || count <= 0) return 0;
  const pct = (count / total) * 100;
  return Number.isFinite(pct) ? Math.min(100, Math.max(0, Math.round(pct * 10) / 10)) : 0;
}

/**
 * Định dạng thời gian đánh giá theo định dạng ngày tháng Việt Nam (DD/MM/YYYY)
 */
export function formatReviewDate(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Kiểm tra xem đánh giá có huy hiệu "Đã mua hàng tại GreenPhone" hay không.
 * Chỉ hiển thị khi Backend xác nhận đã mua qua orderDetailId hoặc isPurchased = true.
 */
export function isVerifiedBuyer(review: Partial<ReviewDTO>): boolean {
  if (review.isPurchased === true) return true;
  if (typeof review.orderDetailId === 'number' && review.orderDetailId > 0) return true;
  return false;
}

/**
 * Lọc danh sách đánh giá theo bộ lọc đã chọn (Tất cả, 1-5 sao, Có hình ảnh).
 */
export function filterReviews(reviews: ReviewDTO[] = [], filter: ReviewFilterType): ReviewDTO[] {
  if (!Array.isArray(reviews)) return [];
  if (filter === 'ALL') return reviews;
  if (filter === 'WITH_IMAGE') {
    return reviews.filter((r) => Array.isArray(r.images) && r.images.length > 0);
  }
  if (typeof filter === 'number' && filter >= 1 && filter <= 5) {
    return reviews.filter((r) => r.rating === filter);
  }
  return reviews;
}

