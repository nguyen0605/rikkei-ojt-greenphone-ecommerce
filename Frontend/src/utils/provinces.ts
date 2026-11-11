/**
 * Danh sách 63 Tỉnh / Thành phố Việt Nam chuẩn
 */
export const VIETNAM_PROVINCES: string[] = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'An Giang',
  'Bà Rịa - Vũng Tàu',
  'Bắc Giang',
  'Bắc Kạn',
  'Bạc Liêu',
  'Bắc Ninh',
  'Bến Tre',
  'Bình Định',
  'Bình Dương',
  'Bình Phước',
  'Bình Thuận',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Đắk Nông',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Giang',
  'Hà Nam',
  'Hà Tĩnh',
  'Hải Dương',
  'Hậu Giang',
  'Hòa Bình',
  'Hưng Yên',
  'Khánh Hòa',
  'Kiên Giang',
  'Kon Tum',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Long An',
  'Nam Định',
  'Nghệ An',
  'Ninh Bình',
  'Ninh Thuận',
  'Phú Thọ',
  'Phú Yên',
  'Quảng Bình',
  'Quảng Nam',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sóc Trăng',
  'Sơn La',
  'Tây Ninh',
  'Thái Bình',
  'Thái Nguyên',
  'Thanh Hóa',
  'Thừa Thiên Huế',
  'Tiền Giang',
  'Trà Vinh',
  'Tuyên Quang',
  'Vĩnh Long',
  'Vĩnh Phúc',
  'Yên Bái',
];

/**
 * Chuẩn hóa tên tỉnh/thành phố để so khớp linh hoạt
 */
function cleanProvinceName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/^(thanh pho|tinh|tp\.?)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tìm tỉnh/thành phố chuẩn từ chuỗi văn bản bất kỳ (Photon, OpenStreetMap, v.v.)
 * Khắc phục triệt để lỗi không khớp 'Thành phố Hồ Chí Minh' với 'TP. Hồ Chí Minh'
 */
export function findMatchingProvince(rawProvince: string | undefined | null): string | undefined {
  if (!rawProvince) return undefined;
  const cleaned = cleanProvinceName(rawProvince);
  if (!cleaned) return undefined;

  return VIETNAM_PROVINCES.find((p) => {
    const pClean = cleanProvinceName(p);
    return (
      pClean === cleaned ||
      pClean.includes(cleaned) ||
      cleaned.includes(pClean) ||
      (cleaned.includes('ho chi minh') && p.includes('Hồ Chí Minh')) ||
      (cleaned.includes('ha noi') && p.includes('Hà Nội')) ||
      (cleaned.includes('da nang') && p.includes('Đà Nẵng'))
    );
  });
}

/**
 * Phân tích và trích xuất phường, quận/huyện, tỉnh/thành từ chuỗi địa chỉ tự do
 */
export function parseAddressComponents(raw: string): { ward?: string; district?: string; province?: string } {
  if (!raw) return {};
  const res: { ward?: string; district?: string; province?: string } = {};

  const matchedProv = findMatchingProvince(raw);
  if (matchedProv) res.province = matchedProv;

  // Trích xuất Phường / Xã / Thị trấn
  const wardMatch = raw.match(/(?:^|[,•\s])(?:Phường|Xã|Thị trấn|P\.)\s*([^,•]+)/i);
  if (wardMatch) {
    res.ward = wardMatch[0].replace(/^[,•\s]+/, '').trim();
  }

  // Trích xuất Quận / Huyện / Thị xã / TP (trừ các TP cấp trực thuộc trung ương)
  const distMatch = raw.match(/(?:^|[,•\s])(?:Quận|Huyện|Thị xã|Tp\.|Thành phố|Q\.)\s*([^,•]+)/i);
  if (distMatch) {
    const text = distMatch[0].replace(/^[,•\s]+/, '').trim();
    if (
      !/thành phố hồ chí minh|tp\.?\s*hồ chí minh|thành phố hà nội|thành phố đà nẵng|thành phố hải phòng|thành phố cần thơ/i.test(
        text
      )
    ) {
      res.district = text;
    }
  }

  return res;
}


