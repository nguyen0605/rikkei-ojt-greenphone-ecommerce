/**
 * Checkout Geocoding & Address Autocomplete Service (OpenStreetMap / Leaflet compatible)
 * Hỗ trợ tìm kiếm, gợi ý địa chỉ tức thời (Google Maps style) và reverse geocoding
 * Không phụ thuộc Mapbox token, tuân thủ chính sách sử dụng, không bị chặn mạng tại VN.
 */

import { findMatchingProvince, parseAddressComponents } from '@/utils/provinces';
import { findDistrictByWard, getProvinceFromCoords } from '@/utils/vietnamAdministrative';

export interface AddressSuggestion {
  id: string;
  place_name: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  source: 'photon' | 'dictionary' | 'nominatim';
  components?: {
    province?: string;
    district?: string;
    ward?: string;
    streetAddress?: string;
  };
}

/**
 * Kiểm tra tính hợp lệ của tọa độ địa lý:
 * - Latitude trong khoảng [-90, 90]
 * - Longitude trong khoảng [-180, 180]
 */
export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
interface KnownLocation {
  name: string;
  keywords: string[];
  lat: number;
  lng: number;
  province?: string;
  district?: string;
  ward?: string;
}

/**
 * Danh mục địa danh, dự án, khu đô thị, quận/huyện phổ biến tại Việt Nam
 * Cho phép phản hồi tức thời (0ms latency), không phụ thuộc mạng, hỗ trợ tìm kiếm theo khu vực và số nhà/tên đường.
 */
export const KNOWN_VN_LOCATIONS: KnownLocation[] = [
  // TP. Hồ Chí Minh - TP. Thủ Đức & Khu đô thị lớn
  {
    name: 'Đường Anh Đào 1, Vinhomes Grand Park, Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh',
    keywords: ['anh dao 1', 'anh đào 1', 'duong anh dao 1', 'đường anh đào 1', 'anh dao', 'anh đào', 'vinhomes grand park', 'grand park', 'long binh'],
    lat: 10.8464,
    lng: 106.8365,
    province: 'TP. Hồ Chí Minh',
    district: 'Thành phố Thủ Đức',
    ward: 'Phường Long Bình',
  },
  {
    name: 'Đường Anh Đào 2, Vinhomes Grand Park, Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh',
    keywords: ['anh dao 2', 'anh đào 2', 'duong anh dao 2', 'đường anh đào 2', 'vinhomes grand park'],
    lat: 10.8468,
    lng: 106.8372,
    province: 'TP. Hồ Chí Minh',
    district: 'Thành phố Thủ Đức',
    ward: 'Phường Long Bình',
  },
  {
    name: 'Vinhomes Grand Park, Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh',
    keywords: ['vinhomes grand park', 'grand park', 'vinhome grand park', 'kdt grand park', 'khu do thi grand park', 'origami', 'the origami', 'rainbow', 'the rainbow', 'beverly', 'the beverly', 'manhattan', 'the manhattan', 's9.02', 's902', 's10', 'phuoc thien', 'phước thiện', 'nguyen xien', 'nguyễn xiển'],
    lat: 10.8465,
    lng: 106.8365,
    province: 'TP. Hồ Chí Minh',
    district: 'Thành phố Thủ Đức',
    ward: 'Phường Long Bình',
  },
  {
    name: 'Phân khu The Origami - Vinhomes Grand Park, Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh',
    keywords: ['the origami', 'origami', 'khu the origami', 's7', 's8', 's9', 's9.02', 's902', 's10', 'vinhomes grand park'],
    lat: 10.8475,
    lng: 106.8380,
    province: 'TP. Hồ Chí Minh',
    district: 'Thành phố Thủ Đức',
    ward: 'Phường Long Bình',
  },
  {
    name: 'Phân khu The Rainbow - Vinhomes Grand Park, Phường Long Thạnh Mỹ, TP. Thủ Đức, TP. Hồ Chí Minh',
    keywords: ['the rainbow', 'rainbow', 'khu the rainbow', 's1', 's2', 's3', 's5', 'vinhomes grand park'],
    lat: 10.8420,
    lng: 106.8340,
    province: 'TP. Hồ Chí Minh',
    district: 'Thành phố Thủ Đức',
    ward: 'Phường Long Thạnh Mỹ',
  },
  {
    name: 'Đường Nguyễn Xiển, Phường Long Thạnh Mỹ, TP. Thủ Đức, TP. Hồ Chí Minh',
    keywords: ['nguyen xien', 'nguyễn xiển', 'duong nguyen xien', 'đường nguyễn xiển', 'long thanh my', 'long thạnh mỹ'],
    lat: 10.8430,
    lng: 106.8320,
    province: 'TP. Hồ Chí Minh',
    district: 'Thành phố Thủ Đức',
    ward: 'Phường Long Thạnh Mỹ',
  },
  {
    name: 'Đường Phước Thiện, Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh',
    keywords: ['phuoc thien', 'phước thiện', 'duong phuoc thien', 'đường phước thiện', 'long binh', 'long bình'],
    lat: 10.8520,
    lng: 106.8410,
    province: 'TP. Hồ Chí Minh',
    district: 'Thành phố Thủ Đức',
    ward: 'Phường Long Bình',
  },
  {
    name: '97 Man Thiện, Phường Tăng Nhơn Phú, TP. Thủ Đức, TP. Hồ Chí Minh',
    keywords: ['97 man thien', '97 man thiện', '97', 'man thien', 'man thiện', 'tang nhon phu', 'tăng nhơn phú'],
    lat: 10.8477,
    lng: 106.7857,
    province: 'TP. Hồ Chí Minh',
    district: 'Thành phố Thủ Đức',
    ward: 'Phường Tăng Nhơn Phú A',
  },
  {
    name: 'Khu Công Nghệ Cao (SHTP), Đường D1, Long Thạnh Mỹ, TP. Thủ Đức, TP. Hồ Chí Minh',
    keywords: ['khu cong nghe cao', 'shtp', 'duong d1', 'đường d1', 'long thanh my', 'fpt software', 'samsung'],
    lat: 10.8540,
    lng: 106.7910,
    province: 'TP. Hồ Chí Minh',
    district: 'Thành phố Thủ Đức',
    ward: 'Phường Long Thạnh Mỹ',
  },
  {
    name: 'Làng Đại học Quốc gia TP.HCM, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    keywords: ['lang dai hoc', 'làng đại học', 'dhqg', 'linh trung', 'dai hoc quoc gia', 'ktx khu a', 'ktx khu b'],
    lat: 10.8752,
    lng: 106.7997,
    province: 'TP. Hồ Chí Minh',
    district: 'Thành phố Thủ Đức',
    ward: 'Phường Linh Trung',
  },
  {
    name: 'Masteri Thảo Điền, 159 Xa Lộ Hà Nội, Phường Thảo Điền, TP. Thủ Đức, TP. Hồ Chí Minh',
    keywords: ['masteri thao dien', 'masteri thảo điền', 'masteri', 'thao dien', 'thảo điền', 'xa lo ha noi', 'xa lộ hà nội', 'vo nguyen giap'],
    lat: 10.8037,
    lng: 106.7410,
    province: 'TP. Hồ Chí Minh',
    district: 'Thành phố Thủ Đức',
    ward: 'Phường Thảo Điền',
  },
  {
    name: 'Khu Đô Thị Sala, 10 Mai Chí Thọ, Phường An Lợi Đông, TP. Thủ Đức, TP. Hồ Chí Minh',
    keywords: ['sala', 'kdt sala', 'khu do thi sala', 'mai chi tho', 'mai chí thọ', 'an loi dong', 'an lợi đông', 'thu thiem', 'thủ thiêm'],
    lat: 10.7725,
    lng: 106.7215,
    province: 'TP. Hồ Chí Minh',
    district: 'Thành phố Thủ Đức',
    ward: 'Phường An Lợi Đông',
  },
  {
    name: 'Tòa nhà Landmark 81 & Vinhomes Central Park, 208 Nguyễn Hữu Cảnh, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
    keywords: ['landmark 81', 'landmark', 'vinhomes central park', 'central park', '208 nguyen huu canh', 'nguyễn hữu cảnh', 'phuong 22', 'binh thanh', 'bình thạnh'],
    lat: 10.7950,
    lng: 106.7218,
    province: 'TP. Hồ Chí Minh',
    district: 'Bình Thạnh',
    ward: 'Phường 22',
  },
  {
    name: 'Khu đô thị Phú Mỹ Hưng, Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh',
    keywords: ['phu my hung', 'phú mỹ hưng', 'nguyen van linh', 'nguyễn văn linh', 'crescent mall', 'tan phong', 'tân phong', 'quan 7', 'quận 7'],
    lat: 10.7290,
    lng: 106.7120,
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 7',
    ward: 'Phường Tân Phong',
  },
  {
    name: 'Sân bay Quốc tế Tân Sơn Nhất, Phường 2, Quận Tân Bình, TP. Hồ Chí Minh',
    keywords: ['san bay tan son nhat', 'sân bay tân sơn nhất', 'tan son nhat', 'tân sơn nhất', 'truong son', 'trường sơn', 'tan binh', 'tân bình'],
    lat: 10.8185,
    lng: 106.6588,
    province: 'TP. Hồ Chí Minh',
    district: 'Tân Bình',
    ward: 'Phường 2',
  },
  {
    name: 'Phố đi bộ Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    keywords: ['nguyen hue', 'nguyễn huệ', 'pho di bo nguyen hue', 'phố đi bộ', 'ben nghe', 'bến nghé', 'quan 1', 'quận 1'],
    lat: 10.7743,
    lng: 106.7032,
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
  },
  {
    name: 'Chợ Bến Thành, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    keywords: ['cho ben thanh', 'chợ bến thành', 'ben thanh', 'bến thành', 'le loi', 'lê lợi', 'quan 1', 'quận 1'],
    lat: 10.7726,
    lng: 106.6980,
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Thành',
  },
  {
    name: 'Aeon Mall Tân Phú Celadon, 30 Bờ Bao Tân Thắng, Sơn Kỳ, Tân Phú, TP. Hồ Chí Minh',
    keywords: ['aeon mall tan phu', 'aeon tan phu', 'bo bao tan thang', 'bờ bao tân thắng', 'celadon', 'son ky', 'sơn kỳ', 'tan phu', 'tân phú'],
    lat: 10.8015,
    lng: 106.6165,
    province: 'TP. Hồ Chí Minh',
    district: 'Tân Phú',
    ward: 'Phường Sơn Kỳ',
  },
  {
    name: 'Aeon Mall Bình Tân, Số 1 Đường Số 17A, Bình Trị Đông B, Bình Tân, TP. Hồ Chí Minh',
    keywords: ['aeon mall binh tan', 'aeon binh tan', 'duong so 17a', 'binh tri dong b', 'bình trị đông b', 'binh tan', 'bình tân'],
    lat: 10.7428,
    lng: 106.6115,
    province: 'TP. Hồ Chí Minh',
    district: 'Bình Tân',
    ward: 'Phường Bình Trị Đông B',
  },

  // Quận / Huyện TP. Hồ Chí Minh
  { name: 'Quận 1, TP. Hồ Chí Minh', keywords: ['quan 1', 'quận 1', 'q1', 'q.1', 'ben nghe', 'bến nghé'], lat: 10.7769, lng: 106.7009, province: 'TP. Hồ Chí Minh', district: 'Quận 1' },
  { name: 'Quận 3, TP. Hồ Chí Minh', keywords: ['quan 3', 'quận 3', 'q3', 'q.3'], lat: 10.7844, lng: 106.6844, province: 'TP. Hồ Chí Minh', district: 'Quận 3' },
  { name: 'Quận 4, TP. Hồ Chí Minh', keywords: ['quan 4', 'quận 4', 'q4', 'q.4'], lat: 10.7600, lng: 106.7042, province: 'TP. Hồ Chí Minh', district: 'Quận 4' },
  { name: 'Quận 5, TP. Hồ Chí Minh', keywords: ['quan 5', 'quận 5', 'q5', 'q.5'], lat: 10.7554, lng: 106.6667, province: 'TP. Hồ Chí Minh', district: 'Quận 5' },
  { name: 'Quận 6, TP. Hồ Chí Minh', keywords: ['quan 6', 'quận 6', 'q6', 'q.6'], lat: 10.7483, lng: 106.6353, province: 'TP. Hồ Chí Minh', district: 'Quận 6' },
  { name: 'Quận 7, TP. Hồ Chí Minh', keywords: ['quan 7', 'quận 7', 'q7', 'q.7'], lat: 10.7340, lng: 106.7218, province: 'TP. Hồ Chí Minh', district: 'Quận 7' },
  { name: 'Quận 8, TP. Hồ Chí Minh', keywords: ['quan 8', 'quận 8', 'q8', 'q.8'], lat: 10.7242, lng: 106.6286, province: 'TP. Hồ Chí Minh', district: 'Quận 8' },
  { name: 'Quận 10, TP. Hồ Chí Minh', keywords: ['quan 10', 'quận 10', 'q10', 'q.10'], lat: 10.7716, lng: 106.6672, province: 'TP. Hồ Chí Minh', district: 'Quận 10' },
  { name: 'Quận 11, TP. Hồ Chí Minh', keywords: ['quan 11', 'quận 11', 'q11', 'q.11'], lat: 10.7631, lng: 106.6508, province: 'TP. Hồ Chí Minh', district: 'Quận 11' },
  { name: 'Quận 12, TP. Hồ Chí Minh', keywords: ['quan 12', 'quận 12', 'q12', 'q.12'], lat: 10.8672, lng: 106.6414, province: 'TP. Hồ Chí Minh', district: 'Quận 12' },
  { name: 'Quận Bình Thạnh, TP. Hồ Chí Minh', keywords: ['binh thanh', 'bình thạnh'], lat: 10.8031, lng: 106.7006, province: 'TP. Hồ Chí Minh', district: 'Bình Thạnh' },
  { name: 'Quận Tân Bình, TP. Hồ Chí Minh', keywords: ['tan binh', 'tân bình'], lat: 10.7992, lng: 106.6531, province: 'TP. Hồ Chí Minh', district: 'Tân Bình' },
  { name: 'Quận Tân Phú, TP. Hồ Chí Minh', keywords: ['tan phu', 'tân phú'], lat: 10.7901, lng: 106.6284, province: 'TP. Hồ Chí Minh', district: 'Tân Phú' },
  { name: 'Quận Phú Nhuận, TP. Hồ Chí Minh', keywords: ['phu nhuan', 'phú nhuận'], lat: 10.7992, lng: 106.6803, province: 'TP. Hồ Chí Minh', district: 'Phú Nhuận' },
  { name: 'Quận Gò Vấp, TP. Hồ Chí Minh', keywords: ['go vap', 'gò vấp'], lat: 10.8388, lng: 106.6653, province: 'TP. Hồ Chí Minh', district: 'Gò Vấp' },
  { name: 'Quận Bình Tân, TP. Hồ Chí Minh', keywords: ['binh tan', 'bình tân'], lat: 10.7654, lng: 106.6039, province: 'TP. Hồ Chí Minh', district: 'Bình Tân' },
  { name: 'TP. Thủ Đức, TP. Hồ Chí Minh', keywords: ['thu duc', 'thủ đức', 'tp thu duc', 'quan 9', 'quận 9', 'quan 2', 'quận 2'], lat: 10.8494, lng: 106.7537, province: 'TP. Hồ Chí Minh', district: 'Thành phố Thủ Đức' },

  // Hà Nội - Dự án & Khu đô thị lớn
  {
    name: 'Vinhomes Ocean Park 1, Đa Tốn, Huyện Gia Lâm, Hà Nội',
    keywords: ['vinhomes ocean park', 'ocean park', 'ocean park 1', 'gia lam', 'gia lâm', 'da ton', 'đa tốn', 'sao bien', 'san ho', 'hai au', 'ngoc trai', 'sapphire', 'zenpark'],
    lat: 20.9925,
    lng: 105.9450,
    province: 'Hà Nội',
    district: 'Gia Lâm',
    ward: 'Xã Đa Tốn',
  },
  {
    name: 'Vinhomes Smart City, Phường Tây Mỗ, Quận Nam Từ Liêm, Hà Nội',
    keywords: ['vinhomes smart city', 'smart city', 'tay mo', 'tây mỗ', 'dai mo', 'đại mỗ', 'nam tu liem', 'nam từ liêm', 'sapphire', 'tonkin', 'miami', 'sakura'],
    lat: 20.9995,
    lng: 105.7485,
    province: 'Hà Nội',
    district: 'Nam Từ Liêm',
    ward: 'Phường Tây Mỗ',
  },
  {
    name: 'Vinhomes Royal City, 72A Nguyễn Trãi, Phường Thượng Đình, Quận Thanh Xuân, Hà Nội',
    keywords: ['royal city', 'vinhomes royal city', '72a nguyen trai', 'nguyen trai', 'nguyễn trãi', 'thuong dinh', 'thượng đình', 'thanh xuan', 'thanh xuân'],
    lat: 20.9995,
    lng: 105.8165,
    province: 'Hà Nội',
    district: 'Thanh Xuân',
    ward: 'Phường Thượng Đình',
  },
  {
    name: 'Vinhomes Times City, 458 Minh Khai, Phường Vĩnh Tuy, Quận Hai Bà Trưng, Hà Nội',
    keywords: ['times city', 'vinhomes times city', '458 minh khai', 'minh khai', 'vinh tuy', 'vĩnh tuy', 'hai ba trung', 'hai bà trưng'],
    lat: 20.9950,
    lng: 105.8670,
    province: 'Hà Nội',
    district: 'Hai Bà Trưng',
    ward: 'Phường Vĩnh Tuy',
  },
  {
    name: 'Vinhomes Riverside, Phường Phúc Đồng, Quận Long Biên, Hà Nội',
    keywords: ['vinhomes riverside', 'riverside', 'the harmony', 'harmony', 'phuc dong', 'phúc đồng', 'viet hung', 'việt hưng', 'long bien', 'long biên'],
    lat: 21.0450,
    lng: 105.9120,
    province: 'Hà Nội',
    district: 'Long Biên',
    ward: 'Phường Phúc Đồng',
  },
  {
    name: 'Keangnam Landmark 72, Đường Phạm Hùng, Phường Mễ Trì, Quận Nam Từ Liêm, Hà Nội',
    keywords: ['keangnam', 'landmark 72', 'pham hung', 'phạm hùng', 'me tri', 'mễ trì', 'nam tu liem', 'nam từ liêm'],
    lat: 21.0170,
    lng: 105.7835,
    province: 'Hà Nội',
    district: 'Nam Từ Liêm',
    ward: 'Phường Mễ Trì',
  },
  {
    name: 'Lotte Center Hà Nội, 54 Liễu Giai, Phường Cống Vị, Quận Ba Đình, Hà Nội',
    keywords: ['lotte center', 'lotte lieu giai', '54 lieu giai', 'lieu giai', 'liễu giai', 'cong vi', 'cống vị', 'ba dinh', 'ba đình'],
    lat: 21.0325,
    lng: 105.8125,
    province: 'Hà Nội',
    district: 'Ba Đình',
    ward: 'Phường Cống Vị',
  },
  {
    name: 'Sân vận động Quốc gia Mỹ Đình, Lê Đức Thọ, Phường Mỹ Đình 1, Quận Nam Từ Liêm, Hà Nội',
    keywords: ['san van dong my dinh', 'my dinh', 'mỹ đình', 'le duc tho', 'lê đức thọ', 'my dinh 1', 'nam tu liem'],
    lat: 21.0205,
    lng: 105.7640,
    province: 'Hà Nội',
    district: 'Nam Từ Liêm',
    ward: 'Phường Mỹ Đình 1',
  },
  {
    name: '144 Xuân Thủy, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
    keywords: ['144 xuan thuy', 'xuan thuy', 'xuân thủy', 'dich vong hau', 'dịch vọng hậu', 'cau giay', 'cầu giấy', 'dhqg ha noi', 'dai hoc quoc gia'],
    lat: 21.0370,
    lng: 105.7820,
    province: 'Hà Nội',
    district: 'Cầu Giấy',
    ward: 'Phường Dịch Vọng Hậu',
  },
  {
    name: 'Hồ Hoàn Kiếm (Hồ Gươm), Phường Hàng Trống, Quận Hoàn Kiếm, Hà Nội',
    keywords: ['ho guom', 'hồ gươm', 'ho hoan kiem', 'hồ hoàn kiếm', 'trang tien', 'tràng tiền', 'dinh tien hoang', 'hoan kiem', 'hoàn kiếm'],
    lat: 21.0287,
    lng: 105.8524,
    province: 'Hà Nội',
    district: 'Hoàn Kiếm',
    ward: 'Phường Hàng Trống',
  },
  {
    name: 'Khu đô thị Linh Đàm, Phường Hoàng Liệt, Quận Hoàng Mai, Hà Nội',
    keywords: ['linh dam', 'linh đàm', 'ban dao linh dam', 'hoang liet', 'hoàng liệt', 'hoang mai', 'hoàng mai'],
    lat: 20.9675,
    lng: 105.8270,
    province: 'Hà Nội',
    district: 'Hoàng Mai',
    ward: 'Phường Hoàng Liệt',
  },
  {
    name: 'Khu đô thị Ciputra (Nam Thăng Long), Phường Xuân Đỉnh, Quận Bắc Từ Liêm, Hà Nội',
    keywords: ['ciputra', 'nam thang long', 'nam thăng long', 'xuan dinh', 'xuân đỉnh', 'tay ho', 'tây hồ', 'bac tu liem', 'bắc từ liêm'],
    lat: 21.0770,
    lng: 105.7950,
    province: 'Hà Nội',
    district: 'Bắc Từ Liêm',
    ward: 'Phường Xuân Đỉnh',
  },
  {
    name: 'Khu đô thị Starlake Tây Hồ Tây, Phường Xuân Tảo, Quận Bắc Từ Liêm, Hà Nội',
    keywords: ['starlake', 'tay ho tay', 'tây hồ tây', 'xuan tao', 'xuân tảo', 'bac tu liem', 'bắc từ liêm'],
    lat: 21.0580,
    lng: 105.7980,
    province: 'Hà Nội',
    district: 'Bắc Từ Liêm',
    ward: 'Phường Xuân Tảo',
  },
  {
    name: 'Sân bay Quốc tế Nội Bài, Xã Phú Minh, Huyện Sóc Sơn, Hà Nội',
    keywords: ['san bay noi bai', 'sân bay nội bài', 'noi bai', 'nội bài', 'soc son', 'sóc sơn', 'phu minh'],
    lat: 21.2187,
    lng: 105.8042,
    province: 'Hà Nội',
    district: 'Sóc Sơn',
    ward: 'Xã Phú Minh',
  },

  // Quận / Huyện Hà Nội
  { name: 'Quận Cầu Giấy, Hà Nội', keywords: ['cau giay', 'cầu giấy', 'cg'], lat: 21.0362, lng: 105.7906, province: 'Hà Nội', district: 'Cầu Giấy' },
  { name: 'Quận Đống Đa, Hà Nội', keywords: ['dong da', 'đống đa'], lat: 21.0181, lng: 105.8299, province: 'Hà Nội', district: 'Đống Đa' },
  { name: 'Quận Ba Đình, Hà Nội', keywords: ['ba dinh', 'ba đình'], lat: 21.0341, lng: 105.8342, province: 'Hà Nội', district: 'Ba Đình' },
  { name: 'Quận Hoàn Kiếm, Hà Nội', keywords: ['hoan kiem', 'hoàn kiếm', 'hk'], lat: 21.0285, lng: 105.8542, province: 'Hà Nội', district: 'Hoàn Kiếm' },
  { name: 'Quận Hai Bà Trưng, Hà Nội', keywords: ['hai ba trung', 'hai bà trưng', 'hbt'], lat: 21.0094, lng: 105.8582, province: 'Hà Nội', district: 'Hai Bà Trưng' },
  { name: 'Quận Thanh Xuân, Hà Nội', keywords: ['thanh xuan', 'thanh xuân'], lat: 20.9937, lng: 105.8117, province: 'Hà Nội', district: 'Thanh Xuân' },
  { name: 'Quận Tây Hồ, Hà Nội', keywords: ['tay ho', 'tây hồ'], lat: 21.0716, lng: 105.8228, province: 'Hà Nội', district: 'Tây Hồ' },
  { name: 'Quận Hoàng Mai, Hà Nội', keywords: ['hoang mai', 'hoàng mai'], lat: 20.9754, lng: 105.8457, province: 'Hà Nội', district: 'Hoàng Mai' },
  { name: 'Quận Long Biên, Hà Nội', keywords: ['long bien', 'long biên'], lat: 21.0365, lng: 105.8906, province: 'Hà Nội', district: 'Long Biên' },
  { name: 'Quận Hà Đông, Hà Nội', keywords: ['ha dong', 'hà đông'], lat: 20.9723, lng: 105.7774, province: 'Hà Nội', district: 'Hà Đông' },
  { name: 'Quận Nam Từ Liêm, Hà Nội', keywords: ['nam tu liem', 'nam từ liêm'], lat: 21.0167, lng: 105.7644, province: 'Hà Nội', district: 'Nam Từ Liêm' },
  { name: 'Quận Bắc Từ Liêm, Hà Nội', keywords: ['bac tu liem', 'bắc từ liêm'], lat: 21.0667, lng: 105.7594, province: 'Hà Nội', district: 'Bắc Từ Liêm' },
  { name: 'Huyện Gia Lâm, Hà Nội', keywords: ['gia lam', 'gia lâm'], lat: 21.0232, lng: 105.9412, province: 'Hà Nội', district: 'Gia Lâm' },
  { name: 'Huyện Đông Anh, Hà Nội', keywords: ['dong anh', 'đông anh'], lat: 21.1394, lng: 105.8486, province: 'Hà Nội', district: 'Đông Anh' },
  { name: 'Huyện Thanh Trì, Hà Nội', keywords: ['thanh tri', 'thanh trì'], lat: 20.9483, lng: 105.8519, province: 'Hà Nội', district: 'Thanh Trì' },

  // Đà Nẵng
  {
    name: 'Cầu Rồng, Phường Phước Ninh, Quận Hải Châu, Đà Nẵng',
    keywords: ['cau rong', 'cầu rồng', 'phuoc ninh', 'phước ninh', 'hai chau', 'hải châu'],
    lat: 16.0610,
    lng: 108.2270,
    province: 'Đà Nẵng',
    district: 'Hải Châu',
    ward: 'Phường Phước Ninh',
  },
  {
    name: 'Bãi biển Mỹ Khê, Phường Phước Mỹ, Quận Sơn Trà, Đà Nẵng',
    keywords: ['my khe', 'mỹ khê', 'bai bien my khe', 'phuoc my', 'phước mỹ', 'son tra', 'sơn trà'],
    lat: 16.0600,
    lng: 108.2470,
    province: 'Đà Nẵng',
    district: 'Sơn Trà',
    ward: 'Phường Phước Mỹ',
  },
  { name: 'Quận Hải Châu, Đà Nẵng', keywords: ['hai chau', 'hải châu'], lat: 16.0544, lng: 108.2208, province: 'Đà Nẵng', district: 'Hải Châu' },
  { name: 'Quận Thanh Khê, Đà Nẵng', keywords: ['thanh khe', 'thanh khê'], lat: 16.0617, lng: 108.1884, province: 'Đà Nẵng', district: 'Thanh Khê' },
  { name: 'Quận Sơn Trà, Đà Nẵng', keywords: ['son tra', 'sơn trà'], lat: 16.0913, lng: 108.2562, province: 'Đà Nẵng', district: 'Sơn Trà' },
  { name: 'Quận Ngũ Hành Sơn, Đà Nẵng', keywords: ['ngu hanh son', 'ngũ hành sơn'], lat: 16.0274, lng: 108.2536, province: 'Đà Nẵng', district: 'Ngũ Hành Sơn' },
  { name: 'Quận Cẩm Lệ, Đà Nẵng', keywords: ['cam le', 'cẩm lệ'], lat: 15.9988, lng: 108.1969, province: 'Đà Nẵng', district: 'Cẩm Lệ' },
  { name: 'Quận Liên Chiểu, Đà Nẵng', keywords: ['lien chieu', 'liên chiểu'], lat: 16.0827, lng: 108.1408, province: 'Đà Nẵng', district: 'Liên Chiểu' },

  // Các tỉnh thành phố lớn khác
  { name: 'Thành phố Hải Phòng', keywords: ['hai phong', 'hải phòng'], lat: 20.8449, lng: 106.6881, province: 'Hải Phòng' },
  { name: 'Thành phố Cần Thơ', keywords: ['can tho', 'cần thơ'], lat: 10.0452, lng: 105.7469, province: 'Cần Thơ' },
  { name: 'Thành phố Biên Hòa, Đồng Nai', keywords: ['bien hoa', 'biên hòa', 'dong nai', 'đồng nai'], lat: 10.9574, lng: 106.8427, province: 'Đồng Nai', district: 'Biên Hòa' },
  { name: 'Thành phố Thủ Dầu Một, Bình Dương', keywords: ['thu dau mot', 'thủ dầu một', 'binh duong', 'bình dương'], lat: 10.9805, lng: 106.6519, province: 'Bình Dương', district: 'Thủ Dầu Một' },
  { name: 'Thành phố Dĩ An, Bình Dương', keywords: ['di an', 'dĩ an', 'binh duong', 'bình dương'], lat: 10.9068, lng: 106.7720, province: 'Bình Dương', district: 'Dĩ An' },
  { name: 'Thành phố Thuận An, Bình Dương', keywords: ['thuan an', 'thuận an', 'binh duong', 'bình dương'], lat: 10.9250, lng: 106.6980, province: 'Bình Dương', district: 'Thuận An' },
  { name: 'Thành phố Huế, Thừa Thiên Huế', keywords: ['hue', 'huế', 'thua thien hue'], lat: 16.4637, lng: 107.5909, province: 'Thừa Thiên Huế' },
  { name: 'Thành phố Nha Trang, Khánh Hòa', keywords: ['nha trang', 'khanh hoa', 'khánh hòa'], lat: 12.2388, lng: 109.1967, province: 'Khánh Hòa' },
  { name: 'Thành phố Vũng Tàu, Bà Rịa - Vũng Tàu', keywords: ['vung tau', 'vũng tàu'], lat: 10.3460, lng: 107.0843, province: 'Bà Rịa - Vũng Tàu' },
];

/**
 * Chuẩn hóa chuỗi tiếng Việt không dấu, chữ thường để tìm kiếm linh hoạt
 */
export function normalizeVietnamese(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * Cache in-memory kết quả tìm kiếm và reverse geocoding để tránh gọi API lặp lại
 */
const searchMemoryCache = new Map<string, AddressSuggestion[]>();
const reverseMemoryCache = new Map<string, string>();

// Request sequence counter để ngăn race condition
let latestSearchRequestId = 0;

/**
 * Helper gọi fetch có timeout an toàn (mặc định 4000ms) để chống treo giao diện
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 4000
): Promise<Response> {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  let signal = timeoutController.signal;
  if (options.signal) {
    if ('any' in AbortSignal && typeof AbortSignal.any === 'function') {
      signal = AbortSignal.any([options.signal, timeoutController.signal]);
    } else {
      const merged = new AbortController();
      const onAbort = () => merged.abort();
      options.signal.addEventListener('abort', onAbort, { once: true });
      timeoutController.signal.addEventListener('abort', onAbort, { once: true });
      signal = merged.signal;
    }
  }

  try {
    return await fetch(url, { ...options, signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tìm kiếm gợi ý từ từ điển nội bộ (offline, tức thời, hỗ trợ tìm kiếm phân đoạn theo khu vực & dự án)
 */
export function searchLocalDictionary(query: string, maxResults = 5): AddressSuggestion[] {
  const normalized = normalizeVietnamese(query);
  if (!normalized || normalized.length < 2) return [];

  const querySegments = normalized
    .split(/[,;\-–|•]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

  const queryTokens = normalized
    .split(/[\s,;\-–|•]+/)
    .filter((w) => w.length >= 2 && !['duong', 'pho', 'quan', 'huyen', 'phuong', 'xa', 'tp', 'thanh', 'pho'].includes(w));

  const scoredMatches: { item: KnownLocation; score: number }[] = [];

  for (const item of KNOWN_VN_LOCATIONS) {
    const normName = normalizeVietnamese(item.name);
    let score = 0;

    // 1. Khớp nguyên chuỗi query
    if (normName === normalized) {
      score += 150;
    } else if (normName.includes(normalized)) {
      score += 100;
    } else if (normalized.includes(normName)) {
      score += 90;
    }

    // 2. Khớp từng phân đoạn (ví dụ: "Đường Anh Đào 1", "Vinhomes Grand Park")
    for (const seg of querySegments) {
      if (normName.includes(seg)) {
        score += 40;
      }
      for (const kw of item.keywords) {
        const normKw = normalizeVietnamese(kw);
        if (normKw === seg) {
          score += 50;
        } else if (seg.includes(normKw)) {
          score += 35;
        } else if (normKw.includes(seg)) {
          score += 25;
        }
      }
    }

    // 3. Khớp các từ khóa (keywords)
    for (const kw of item.keywords) {
      const normKw = normalizeVietnamese(kw);
      if (normalized.includes(normKw)) {
        score += 30;
      } else if (normKw.includes(normalized)) {
        score += 20;
      }
    }

    // 4. Khớp các tokens riêng lẻ
    if (queryTokens.length > 0) {
      const matched = queryTokens.filter((token) => normName.includes(token));
      score += matched.length * 5;
    }

    if (score >= 20) {
      scoredMatches.push({ item, score });
    }
  }

  scoredMatches.sort((a, b) => b.score - a.score);

  return scoredMatches.slice(0, maxResults).map(({ item }) => ({
    id: `dict-${item.lat}-${item.lng}`,
    place_name: item.name,
    title: item.name.split(',')[0] || item.name,
    subtitle: item.name.split(',').slice(1).join(',').trim() || 'Việt Nam',
    lat: item.lat,
    lng: item.lng,
    source: 'dictionary',
    components: {
      province: item.province,
      district: item.district,
      ward: item.ward,
      streetAddress: item.name.split(',')[0] || '',
    },
  }));
}

interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    osm_id?: number;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    postcode?: string;
  };
}

/**
 * Chuẩn hóa kết quả từ Photon OpenStreetMap API thành AddressSuggestion
 */
function mapPhotonFeatureToSuggestion(f: PhotonFeature): AddressSuggestion | null {
  const props = f.properties;
  const [lng, lat] = f.geometry.coordinates;

  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  // Lấy các thành phần địa chỉ
  const name = props.name || '';
  const street = props.street || '';
  const houseNumber = props.housenumber || '';
  const locality = props.locality || '';
  const district = props.district || '';
  const city = props.city || props.state || '';
  const country = props.country || 'Việt Nam';

  // Xác định tiêu đề chính (Title)
  let title = '';
  if (houseNumber && street) {
    title = `${houseNumber} ${street}`;
    if (name && name !== title && name !== street) {
      title = `${name} (${title})`;
    }
  } else if (street) {
    title = street;
    if (name && name !== street) {
      title = `${name}, ${street}`;
    }
  } else if (name) {
    title = name;
  } else {
    title = district || city || 'Địa chỉ được chọn';
  }

  // Xác định phụ đề hành chính (Subtitle)
  const subParts = [locality, district, city, country].filter(
    (p, i, arr) => p && arr.indexOf(p) === i && !title.includes(p)
  );
  const subtitle = subParts.join(', ') || 'Việt Nam';

  // Tạo place_name hoàn chỉnh
  const placeNameParts = [title, subtitle].filter(Boolean);
  const place_name = placeNameParts.join(', ');

  return {
    id: `photon-${props.osm_id || `${lat}-${lng}`}`,
    place_name,
    title,
    subtitle,
    lat,
    lng,
    source: 'photon',
    components: {
      province: city || props.state,
      district: district,
      ward: locality,
      streetAddress: houseNumber && street ? `${houseNumber} ${street}` : title,
    },
  };
}

/**
 * Tìm kiếm gợi ý địa chỉ thời gian thực (Address Autocomplete)
 * Kết hợp Photon OpenStreetMap + Từ điển nội bộ
 * Hỗ trợ từ khóa ngắn (ví dụ: '97', 'cau giay', 'man thien')
 */
export async function searchAddressSuggestions(
  query: string,
  signal?: AbortSignal,
  focusCoords?: { lat: number; lng: number }
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = `${trimmed.toLowerCase()}__${focusCoords ? `${focusCoords.lat.toFixed(2)},${focusCoords.lng.toFixed(2)}` : 'default'}`;
  if (searchMemoryCache.has(cacheKey)) {
    return searchMemoryCache.get(cacheKey)!;
  }

  const thisRequestId = ++latestSearchRequestId;

  // 1. Quét nhanh từ điển địa phương (0ms)
  const localResults = searchLocalDictionary(trimmed, 4);

  // 2. Gọi Photon OpenStreetMap Autocomplete API (chuyên dụng cho search-as-you-type)
  let photonResults: AddressSuggestion[] = [];
  try {
    // Tọa độ focus mặc định (Hà Nội hoặc TP.HCM tùy focusCoords)
    const lat = focusCoords?.lat ?? 10.7769; // Mặc định TP.HCM / Hà Nội
    const lon = focusCoords?.lng ?? 106.7009;

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      trimmed
    )}&lat=${lat}&lon=${lon}&limit=8`;

    const res = await fetchWithTimeout(url, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    }, 4000);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.features)) {
        const mapped = (data.features as PhotonFeature[])
          .map(mapPhotonFeatureToSuggestion)
          .filter((item): item is AddressSuggestion => item !== null);

        // Lọc ưu tiên địa chỉ tại Việt Nam hoặc các nước lân cận nếu có
        photonResults = mapped.filter(
          (m) =>
            m.subtitle.includes('Việt Nam') ||
            m.place_name.includes('Việt Nam') ||
            m.lat >= 8.5 && m.lat <= 23.5 && m.lng >= 102.0 && m.lng <= 110.0
        );
      }
    }
  } catch {
    // Bỏ qua lỗi mạng / abort; fallback sang localResults
  }

  // Kiểm tra race condition: nếu có request mới hơn đã được phát đi, không ghi đè
  if (thisRequestId !== latestSearchRequestId) {
    return [];
  }

  // 3. Kết hợp kết quả: ưu tiên kết quả Photon chi tiết (số nhà, tên đường), bổ sung địa danh từ điển
  const combined: AddressSuggestion[] = [];
  const seenCoords = new Set<string>();

  for (const item of [...photonResults, ...localResults]) {
    const coordKey = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
    if (!seenCoords.has(coordKey)) {
      seenCoords.add(coordKey);
      combined.push(item);
    }
    if (combined.length >= 6) break;
  }

  // Nếu người dùng nhập thuần số (ví dụ '97'), và không có kết quả phù hợp từ mạng
  // Thêm gợi ý mang tính hướng dẫn tiện lợi
  if (combined.length === 0 && /^\d+$/.test(trimmed)) {
    combined.push({
      id: `prompt-${trimmed}`,
      place_name: `Số ${trimmed}... (tiếp tục nhập tên đường hoặc địa chỉ)`,
      title: `Số ${trimmed}`,
      subtitle: 'Vui lòng nhập thêm tên đường (ví dụ: ' + trimmed + ' Man Thiện)',
      lat: focusCoords?.lat ?? 10.8477,
      lng: focusCoords?.lng ?? 106.7857,
      source: 'dictionary',
    });
  }

  searchMemoryCache.set(cacheKey, combined);
  return combined;
}

/**
 * Reverse geocoding chi tiết: Lấy đầy đủ thông tin địa chỉ và các thành phần cấu trúc (components)
 */
export async function reverseGeocodeDetails(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<AddressSuggestion | null> {
  // 1. Thử qua OpenStreetMap Nominatim Reverse Geocoding (độ chính xác cao, đầy đủ các cấp hành chính VN)
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetchWithTimeout(
      url,
      {
        signal,
        headers: {
          Accept: 'application/json',
        },
      },
      3500
    );

    if (res.ok) {
      const data = await res.json();
      // Hỗ trợ cả định dạng Nominatim ({ address }) lẫn Photon ({ features })
      if (Array.isArray(data.features) && data.features.length > 0) {
        const suggestion = mapPhotonFeatureToSuggestion(data.features[0]);
        if (suggestion) {
          return suggestion;
        }
      }

      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || addr.pedestrian || addr.footway || addr.path || addr.street || '';
        const houseNumber = addr.house_number || '';
        const residential = addr.residential || addr.neighbourhood || addr.subdivision || '';
        const rawWard = addr.suburb || addr.quarter || addr.village || addr.commune || addr.neighbourhood || '';
        const rawDistrict = addr.city_district || addr.district || addr.county || addr.town || '';
        const rawProvince = addr.city || addr.province || addr.state || '';

        const resolvedProv =
          findMatchingProvince(rawProvince) ||
          findMatchingProvince(data.display_name) ||
          getProvinceFromCoords(lat, lng) ||
          'TP. Hồ Chí Minh';

        let resolvedWard = rawWard;
        let resolvedDist = rawDistrict;

        // Nếu thiếu quận/huyện nhưng có phường/xã, tự tra cứu quận/huyện trực thuộc
        if (!resolvedDist && resolvedProv && resolvedWard) {
          resolvedDist = findDistrictByWard(resolvedProv, resolvedWard) || '';
        }

        // Nếu thiếu phường/xã hoặc quận/huyện, phân tích display_name
        if (!resolvedDist || !resolvedWard) {
          const parsed = parseAddressComponents(data.display_name || '');
          if (!resolvedDist && parsed.district) resolvedDist = parsed.district;
          if (!resolvedWard && parsed.ward) resolvedWard = parsed.ward;
        }

        let streetAddress = '';
        if (houseNumber && road) {
          streetAddress = `${houseNumber} ${road}`;
        } else if (road && residential && !road.includes(residential)) {
          streetAddress = `${road}, ${residential}`;
        } else if (road) {
          streetAddress = road;
        } else if (residential) {
          streetAddress = residential;
        } else if (data.name && data.name !== resolvedWard && data.name !== resolvedDist) {
          streetAddress = data.name;
        } else {
          streetAddress = data.display_name?.split(',')[0] || '';
        }

        return {
          id: `nominatim-${data.place_id || `${lat}-${lng}`}`,
          place_name: data.display_name,
          title: streetAddress || resolvedWard || resolvedDist || 'Vị trí hiện tại',
          subtitle: [resolvedWard, resolvedDist, resolvedProv].filter(Boolean).join(', ') || 'Việt Nam',
          lat,
          lng,
          source: 'nominatim',
          components: {
            province: resolvedProv,
            district: resolvedDist,
            ward: resolvedWard,
            streetAddress,
          },
        };
      }
    }
  } catch {
    // Tiếp tục fallback sang Photon
  }

  // 2. Thử qua Photon Reverse Geocoding
  try {
    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const res = await fetchWithTimeout(
      url,
      {
        signal,
        headers: {
          Accept: 'application/json',
        },
      },
      3500
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.features) && data.features.length > 0) {
        const suggestion = mapPhotonFeatureToSuggestion(data.features[0]);
        if (suggestion) {
          const resolvedProv =
            findMatchingProvince(suggestion.components?.province) ||
            findMatchingProvince(suggestion.place_name) ||
            getProvinceFromCoords(lat, lng);

          let resolvedDist = suggestion.components?.district || '';
          const resolvedWard = suggestion.components?.ward || '';

          if (!resolvedDist && resolvedProv && resolvedWard) {
            resolvedDist = findDistrictByWard(resolvedProv, resolvedWard) || '';
          }

          if (suggestion.components) {
            suggestion.components.province = resolvedProv || suggestion.components.province;
            suggestion.components.district = resolvedDist || suggestion.components.district;
          }

          return suggestion;
        }
      }
    }
  } catch {
    // Tiếp tục fallback sang từ điển nội bộ
  }

  // 3. Fallback: Tìm địa danh gần nhất trong từ điển nội bộ
  let nearestItem: KnownLocation | null = null;
  let minDistance = 0.15; // ~15km
  for (const item of KNOWN_VN_LOCATIONS) {
    const dLat = Math.abs(item.lat - lat);
    const dLng = Math.abs(item.lng - lng);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestItem = item;
    }
  }

  const provFromCoord = getProvinceFromCoords(lat, lng);
  const resolvedProv = nearestItem?.province || provFromCoord || 'TP. Hồ Chí Minh';
  const resolvedDist = nearestItem?.district || (resolvedProv === 'TP. Hồ Chí Minh' ? 'Thành phố Thủ Đức' : '');

  if (nearestItem) {
    return {
      id: `dict-${nearestItem.lat}-${nearestItem.lng}`,
      place_name: nearestItem.name,
      title: nearestItem.name.split(',')[0] || nearestItem.name,
      subtitle: nearestItem.name.split(',').slice(1).join(',').trim() || 'Việt Nam',
      lat: nearestItem.lat,
      lng: nearestItem.lng,
      source: 'dictionary',
      components: {
        province: resolvedProv,
        district: resolvedDist,
        streetAddress: nearestItem.name.split(',')[0] || '',
      },
    };
  }

  // 4. Fallback cuối cùng: Tự động gắn tỉnh/thành phố theo vùng tọa độ
  return {
    id: `coords-${lat.toFixed(4)}-${lng.toFixed(4)}`,
    place_name: `Vị trí tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    title: `Vị trí tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    subtitle: resolvedProv || 'Việt Nam',
    lat,
    lng,
    source: 'dictionary',
    components: {
      province: resolvedProv,
      district: resolvedDist,
      streetAddress: `Khu vực tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    },
  };
}

/**
 * Reverse geocoding: Lấy tên địa chỉ tương ứng từ tọa độ [lat, lng]
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<string | null> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (reverseMemoryCache.has(cacheKey)) {
    return reverseMemoryCache.get(cacheKey)!;
  }

  const details = await reverseGeocodeDetails(lat, lng, signal);
  if (details && details.place_name) {
    reverseMemoryCache.set(cacheKey, details.place_name);
    return details.place_name;
  }

  return `Vị trí tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

/**
 * Lấy tọa độ trung tâm gần đúng của tỉnh/thành phố phục vụ điều chỉnh camera bản đồ
 */
export function getProvinceCoords(provinceName?: string): [number, number] | null {
  if (!provinceName) return null;
  const norm = normalizeVietnamese(provinceName);
  for (const item of KNOWN_VN_LOCATIONS) {
    if (item.province && normalizeVietnamese(item.province) === norm) {
      return [item.lat, item.lng];
    }
  }
  for (const item of KNOWN_VN_LOCATIONS) {
    if (normalizeVietnamese(item.name).includes(norm)) {
      return [item.lat, item.lng];
    }
  }
  return null;
}

export interface AddressComponents {
  streetAddress?: string;
  ward?: string;
  district?: string;
  province?: string;
}

/**
 * Trích xuất các cụm từ khóa tìm kiếm ứng viên từ địa chỉ thô và các thành phần
 */
function extractGeocodeCandidates(
  address: string,
  components?: AddressComponents
): string[] {
  const candidates: string[] = [];

  if (components) {
    const { streetAddress, ward, district, province } = components;
    // Tách các phân đoạn nếu địa chỉ chứa nhiều phần (ví dụ: "Đường Anh Đào 1, Vinhomes Grand Park")
    const segments = (streetAddress || '')
      .split(/[,;\-–|•]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);

    for (const seg of segments) {
      if (province) {
        if (ward && district) {
          candidates.push([seg, ward, district, province].filter(Boolean).join(', '));
        }
        if (district) {
          candidates.push([seg, district, province].filter(Boolean).join(', '));
        }
        if (ward) {
          candidates.push([seg, ward, province].filter(Boolean).join(', '));
        }
        candidates.push([seg, province].filter(Boolean).join(', '));
      } else {
        if (ward && district) {
          candidates.push([seg, ward, district].filter(Boolean).join(', '));
        }
        if (district) {
          candidates.push([seg, district].filter(Boolean).join(', '));
        }
        candidates.push(seg);
      }
    }

    if (streetAddress) {
      const cleanStreet = streetAddress.split(/[•\-–|;]/)[0].replace(/\s+/g, ' ').trim();
      if (cleanStreet && !segments.includes(cleanStreet)) {
        if (province) {
          candidates.push([cleanStreet, district, province].filter(Boolean).join(', '));
        }
        candidates.push(cleanStreet);
      }
      if (province) {
        candidates.push([streetAddress, district, province].filter(Boolean).join(', '));
        candidates.push([streetAddress, province].filter(Boolean).join(', '));
      }
      candidates.push(streetAddress);
    } else {
      // Chỉ khi người dùng KHÔNG nhập số nhà, tên đường thì mới tìm theo khu vực
      if (ward && district) {
        candidates.push([ward, district, province].filter(Boolean).join(', '));
      }
      if (district) {
        candidates.push([district, province].filter(Boolean).join(', '));
      }
      if (province) {
        candidates.push(province);
      }
    }
  }

  // Phân rã chuỗi địa chỉ thô
  const rawParts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (rawParts.length >= 2) {
    const mainStreet = rawParts[0].split(/[•\-–|;]/)[0].replace(/\s+/g, ' ').trim();
    const city = rawParts[rawParts.length - 1];
    const dist = rawParts.length >= 3 ? rawParts[rawParts.length - 2] : '';
    if (mainStreet) {
      candidates.push([mainStreet, dist, city].filter(Boolean).join(', '));
      if (!components?.province) {
        candidates.push(mainStreet);
      }
    }
  }

  const cleanRaw = address.replace(/[•|]/g, ' ').replace(/\s+/g, ' ').trim();
  if (components?.province && !cleanRaw.toLowerCase().includes(components.province.toLowerCase())) {
    candidates.push(`${cleanRaw}, ${components.province}`);
  } else {
    candidates.push(cleanRaw);
  }

  // Deduplicate and filter out empty / too short
  return Array.from(new Set(candidates.filter((c) => c && c.length >= 2)));
}

/**
 * Kiểm tra xem kết quả geocoding có thực sự tìm thấy tuyến đường / số nhà mà người dùng nhập hay không.
 * Tránh trường hợp dịch vụ bản đồ (như Photon) bỏ qua tên đường không tồn tại và chỉ trả về trung tâm quận/huyện.
 */
export function isStreetMatched(inputStreet: string, suggestion: AddressSuggestion): boolean {
  if (!inputStreet || !inputStreet.trim()) return true;

  const normInput = normalizeVietnamese(inputStreet);
  if (!normInput) return true;

  const normPlace = normalizeVietnamese(suggestion.place_name || '');
  const normTitle = normalizeVietnamese(suggestion.title || '');
  const normStreet = normalizeVietnamese(suggestion.components?.streetAddress || '');
  const combinedResult = `${normPlace} ${normTitle} ${normStreet}`;

  // 1. Toàn bộ chuỗi người dùng nằm trong kết quả hoặc ngược lại
  if (combinedResult.includes(normInput) || normInput.includes(normTitle)) {
    return true;
  }

  // 2. Nếu người dùng nhập địa chỉ gồm nhiều phân đoạn (ví dụ: "Đường Anh Đào 1, Vinhomes Grand Park")
  const segments = normInput
    .split(/[,;\-–|•]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

  if (segments.length > 1) {
    for (const seg of segments) {
      const cleanSeg = seg
        .replace(/^(so|nha|toa|can|so nha)\s+/g, '')
        .replace(/^[\d\w\/-]+\s+/, '')
        .replace(/^(duong|pho|ngo|hem|ngach|khu do thi|kdt|khu|phan khu)\s+/g, '')
        .trim();

      if (cleanSeg.length >= 2 && combinedResult.includes(cleanSeg)) {
        return true;
      }

      const segTokens = cleanSeg
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !['duong', 'pho', 'quan', 'huyen', 'phuong', 'xa', 'thi', 'tran'].includes(w));

      if (segTokens.length > 0) {
        const matched = segTokens.filter((token) => combinedResult.includes(token));
        if (matched.length / segTokens.length >= 0.75 && (matched.length >= 2 || segTokens.length === 1)) {
          return true;
        }
      }
    }
  }

  // 3. Bỏ qua các tiền tố như số nhà, 'so', 'duong', 'pho', 'ngo', 'hem', 'ngach'
  const cleanInput = normInput
    .replace(/^(so|nha|toa|can|so nha)\s+/g, '')
    .replace(/^[\d\w\/-]+\s+/, '')
    .replace(/^(duong|pho|ngo|hem|ngach|khu do thi|kdt|ap|thon)\s+/g, '')
    .trim();

  if (cleanInput.length >= 2 && combinedResult.includes(cleanInput)) {
    return true;
  }

  // 4. Kiểm tra các từ khóa đặc trưng của tên đường
  const inputTokens = cleanInput
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !['duong', 'pho', 'quan', 'huyen', 'phuong', 'xa', 'thi', 'tran'].includes(w));

  if (inputTokens.length > 0) {
    const matchedTokens = inputTokens.filter((token) => combinedResult.includes(token));
    if (inputTokens.length === 1) {
      return inputTokens[0].length >= 3 && matchedTokens.length === 1;
    }
    // Đối với tên đường nhiều từ khóa (ví dụ "long an cầu giấy" gồm 4 từ khóa)
    // Bắt buộc phải khớp tối thiểu 75% số từ khóa VÀ tối thiểu 2 từ khóa
    // Tuyệt đối không chấp nhận chỉ khớp 1 từ đơn lẻ (như từ 'long' trong 'long an cầu giấy')
    const ratio = matchedTokens.length / inputTokens.length;
    return ratio >= 0.75 && matchedTokens.length >= 2;
  }

  return false;
}

/**
 * Thử định vị tọa độ từ một chuỗi địa chỉ có sẵn và các thành phần cấu trúc
 */
export async function geocodeInitialAddress(
  address: string,
  components?: AddressComponents
): Promise<{
  lat: number;
  lng: number;
  displayName: string;
  components?: AddressSuggestion['components'];
} | null> {
  const trimmed = address.trim();
  if (!trimmed || trimmed.length < 2) return null;

  const expectedProv = components?.province ? findMatchingProvince(components.province) : undefined;
  const candidates = extractGeocodeCandidates(trimmed, components);

  // Helper kiểm tra tính hợp lệ và nhất quán của suggestion đối với các thành phần địa chỉ
  const isSuggestionConsistent = (s: AddressSuggestion): boolean => {
    if (s.id.startsWith('prompt-')) return false;

    // 1. KIỂM TRA TỈNH/THÀNH PHỐ (Province Consistency Check):
    if (expectedProv) {
      const resultProv =
        findMatchingProvince(s.components?.province) ||
        findMatchingProvince(s.place_name) ||
        findMatchingProvince(s.subtitle);

      // Nếu kết quả trả về thuộc một tỉnh/thành phố khác với expectedProv, CHẮC CHẮN LOẠI BỎ!
      if (resultProv && resultProv !== expectedProv) {
        return false;
      }

      // Xác minh thêm: địa chỉ hiển thị hoặc phụ đề phải chứa thông tin tỉnh đã chọn nếu không có resultProv
      const normExpected = normalizeVietnamese(expectedProv);
      const normPlace = normalizeVietnamese(s.place_name || '');
      const normSub = normalizeVietnamese(s.subtitle || '');
      if (
        !normPlace.includes(normExpected) &&
        !normSub.includes(normExpected) &&
        resultProv !== expectedProv
      ) {
        return false;
      }
    }

    // 2. KIỂM TRA ĐỊA CHỈ ĐƯỜNG (Street Match):
    if (components?.streetAddress && !isStreetMatched(components.streetAddress, s)) {
      return false;
    }

    return true;
  };

  // 1. Quét nhanh từ điển nội bộ trước (0ms latency, không phụ thuộc mạng, hỗ trợ địa bàn & dự án phổ biến)
  for (const q of candidates) {
    const localMatches = searchLocalDictionary(q, 5);
    const validLocal = localMatches.find(isSuggestionConsistent);
    if (validLocal) {
      return {
        lat: validLocal.lat,
        lng: validLocal.lng,
        displayName: validLocal.place_name,
        components: validLocal.components,
      };
    }
  }

  // 2. Thử tìm kiếm chi tiết qua Photon Autocomplete cho từng ứng viên (từ chi tiết đến tổng quát)
  for (const q of candidates) {
    try {
      const focusCoords = expectedProv ? getProvinceCoords(expectedProv) : undefined;
      const suggestions = await searchAddressSuggestions(
        q,
        undefined,
        focusCoords ? { lat: focusCoords[0], lng: focusCoords[1] } : undefined
      );
      const valid = suggestions.find(isSuggestionConsistent);
      if (valid) {
        return {
          lat: valid.lat,
          lng: valid.lng,
          displayName: valid.place_name,
          components: valid.components,
        };
      }
    } catch {
      // Tiếp tục ứng viên tiếp theo
    }
  }

  return null;
}
