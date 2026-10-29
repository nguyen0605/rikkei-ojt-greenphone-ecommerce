/**
 * App-wide constants
 */

export const APP_NAME = 'GreenPhone';
export const APP_TAGLINE = 'Điện đến vị tin';
export const APP_DESCRIPTION =
  'GreenPhone - Điểm đến tin cậy cho điện thoại chính hãng. Cam kết mang đến sản phẩm chất lượng và dịch vụ vượt trội.';

export const CONTACT = {
  hotline: '1900 1234',
  email: 'support@greenphone.vn',
  address: '123 Đường Láng, Đống Đa, Hà Nội, Việt Nam',
  hours: 'Thứ 2 - Chủ nhật: 8:00 - 22:00',
};

export const SOCIAL_LINKS = {
  facebook: 'https://facebook.com',
  instagram: 'https://instagram.com',
  youtube: 'https://youtube.com',
  tiktok: 'https://tiktok.com',
};

export const PRICE_RANGES = [
  { min: 0, max: 5_000_000, label: 'Dưới 5 triệu' },
  { min: 5_000_000, max: 10_000_000, label: '5 - 10 triệu' },
  { min: 10_000_000, max: 20_000_000, label: '10 - 20 triệu' },
  { min: 20_000_000, max: 30_000_000, label: '20 - 30 triệu' },
  { min: 30_000_000, max: 50_000_000, label: '30 - 50 triệu' },
  { min: 50_000_000, max: Infinity, label: 'Trên 50 triệu' },
];

export const RAM_OPTIONS = ['4GB', '6GB', '8GB', '12GB', '16GB'];
export const STORAGE_OPTIONS = ['64GB', '128GB', '256GB', '512GB', '1TB'];

export const PRODUCT_FEATURES_FILTERS = [
  '5G',
  'Sạc nhanh',
  'Camera AI',
  'Chống nước',
  'Màn hình 120Hz',
];
