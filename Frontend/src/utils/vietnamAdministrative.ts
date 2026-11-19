/**
 * Vietnam Administrative Divisions Data & Cascading Helpers
 * Cung cấp danh mục Quận / Huyện theo Tỉnh / Thành phố và Phường / Xã theo Quận / Huyện.
 * Hỗ trợ gợi ý tự động (Autocomplete) và kiểm tra tính hợp lệ của địa chỉ giao hàng.
 */

import { VIETNAM_PROVINCES, findMatchingProvince, parseAddressComponents } from './provinces';

export interface DistrictData {
  name: string;
  wards: string[];
}

export interface ProvinceData {
  districts: DistrictData[];
}

export function normalizeAdminName(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/^(thanh pho|tp\.?|tinh|quan|q\.?|huyen|h\.?|thi xa|tx\.?|phuong|p\.?|xa|thi tran|tt\.?)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Dữ liệu hành chính chi tiết cho các Tỉnh/Thành phố lớn và trọng điểm
 */
export const VIETNAM_ADMINISTRATIVE_DATA: Record<string, ProvinceData> = {
  'TP. Hồ Chí Minh': {
    districts: [
      {
        name: 'Thành phố Thủ Đức',
        wards: [
          'Phường Hiệp Phú',
          'Phường Long Bình',
          'Phường Long Phước',
          'Phường Long Thạnh Mỹ',
          'Phường Long Trường',
          'Phường Phú Hữu',
          'Phường Phước Bình',
          'Phường Phước Long A',
          'Phường Phước Long B',
          'Phường Tân Phú',
          'Phường Tăng Nhơn Phú A',
          'Phường Tăng Nhơn Phú B',
          'Phường Trường Thạnh',
          'Phường An Khánh',
          'Phường An Lợi Đông',
          'Phường An Phú',
          'Phường Bình An',
          'Phường Bình Khánh',
          'Phường Bình Trưng Đông',
          'Phường Bình Trưng Tây',
          'Phường Cát Lái',
          'Phường Thạnh Mỹ Lợi',
          'Phường Thảo Điền',
          'Phường Thủ Thiêm',
          'Phường Bình Chiểu',
          'Phường Bình Thọ',
          'Phường Hiệp Bình Chánh',
          'Phường Hiệp Bình Phước',
          'Phường Linh Chiểu',
          'Phường Linh Đông',
          'Phường Linh Tây',
          'Phường Linh Trung',
          'Phường Linh Xuân',
          'Phường Tam Bình',
          'Phường Tam Phú',
          'Phường Trường Thọ',
        ],
      },
      {
        name: 'Quận 1',
        wards: [
          'Phường Bến Nghé',
          'Phường Bến Thành',
          'Phường Cầu Kho',
          'Phường Cầu Ông Lãnh',
          'Phường Cô Giang',
          'Phường Đa Kao',
          'Phường Nguyễn Cư Trinh',
          'Phường Nguyễn Thái Bình',
          'Phường Phạm Ngũ Lão',
          'Phường Tân Định',
        ],
      },
      {
        name: 'Quận 3',
        wards: [
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường Võ Thị Sáu',
        ],
      },
      {
        name: 'Quận 4',
        wards: [
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 6',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 13',
          'Phường 14',
          'Phường 15',
          'Phường 16',
          'Phường 18',
        ],
      },
      {
        name: 'Quận 5',
        wards: [
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
        ],
      },
      {
        name: 'Quận 6',
        wards: [
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
        ],
      },
      {
        name: 'Quận 7',
        wards: [
          'Phường Bình Thuận',
          'Phường Phú Mỹ',
          'Phường Phú Thuận',
          'Phường Tân Hưng',
          'Phường Tân Kiểng',
          'Phường Tân Phong',
          'Phường Tân Phú',
          'Phường Tân Quy',
          'Phường Tân Thuận Đông',
          'Phường Tân Thuận Tây',
        ],
      },
      {
        name: 'Quận 8',
        wards: [
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường 15',
          'Phường 16',
        ],
      },
      {
        name: 'Quận 10',
        wards: [
          'Phường 1',
          'Phường 2',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường 15',
        ],
      },
      {
        name: 'Quận 11',
        wards: [
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường 15',
          'Phường 16',
        ],
      },
      {
        name: 'Quận 12',
        wards: [
          'Phường An Phú Đông',
          'Phường Đông Hưng Thuận',
          'Phường Hiệp Thành',
          'Phường Tân Chánh Hiệp',
          'Phường Tân Hưng Thuận',
          'Phường Tân Thới Hiệp',
          'Phường Tân Thới Nhất',
          'Phường Thạnh Lộc',
          'Phường Thạnh Xuân',
          'Phường Thới An',
          'Phường Trung Mỹ Tây',
        ],
      },
      {
        name: 'Quận Bình Thạnh',
        wards: [
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường 15',
          'Phường 17',
          'Phường 19',
          'Phường 21',
          'Phường 22',
          'Phường 24',
          'Phường 25',
          'Phường 26',
          'Phường 27',
          'Phường 28',
        ],
      },
      {
        name: 'Quận Gò Vấp',
        wards: [
          'Phường 1',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường 15',
          'Phường 16',
          'Phường 17',
        ],
      },
      {
        name: 'Quận Phú Nhuận',
        wards: [
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 13',
          'Phường 15',
          'Phường 17',
        ],
      },
      {
        name: 'Quận Tân Bình',
        wards: [
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường 15',
        ],
      },
      {
        name: 'Quận Tân Phú',
        wards: [
          'Phường Hiệp Tân',
          'Phường Hòa Thạnh',
          'Phường Phú Thạnh',
          'Phường Phú Thọ Hòa',
          'Phường Phú Trung',
          'Phường Sơn Kỳ',
          'Phường Tân Quý',
          'Phường Tân Sơn Nhì',
          'Phường Tân Thành',
          'Phường Tân Thới Hòa',
          'Phường Tây Thạnh',
        ],
      },
      {
        name: 'Quận Bình Tân',
        wards: [
          'Phường An Lạc',
          'Phường An Lạc A',
          'Phường Bình Hưng Hòa',
          'Phường Bình Hưng Hòa A',
          'Phường Bình Hưng Hòa B',
          'Phường Bình Trị Đông',
          'Phường Bình Trị Đông A',
          'Phường Bình Trị Đông B',
          'Phường Tân Tạo',
          'Phường Tân Tạo A',
        ],
      },
      {
        name: 'Huyện Bình Chánh',
        wards: [
          'Thị trấn Tân Túc',
          'Xã An Phú Tây',
          'Xã Bình Chánh',
          'Xã Bình Hưng',
          'Xã Bình Lợi',
          'Xã Đa Phước',
          'Xã Hưng Long',
          'Xã Lê Minh Xuân',
          'Xã Phạm Văn Hai',
          'Xã Phong Phú',
          'Xã Quy Đức',
          'Xã Tân Kiên',
          'Xã Tân Nhựt',
          'Xã Tân Quý Tây',
          'Xã Vĩnh Lộc A',
          'Xã Vĩnh Lộc B',
        ],
      },
      {
        name: 'Huyện Hóc Môn',
        wards: [
          'Thị trấn Hóc Môn',
          'Xã Bà Điểm',
          'Xã Đông Thạnh',
          'Xã Nhị Bình',
          'Xã Tân Hiệp',
          'Xã Tân Thới Nhì',
          'Xã Tân Xuân',
          'Xã Thới Tam Thôn',
          'Xã Trung Chánh',
          'Xã Xuân Thới Đông',
          'Xã Xuân Thới Sơn',
          'Xã Xuân Thới Thượng',
        ],
      },
      {
        name: 'Huyện Củ Chi',
        wards: [
          'Thị trấn Củ Chi',
          'Xã An Nhơn Tây',
          'Xã An Phú',
          'Xã Bình Mỹ',
          'Xã Hòa Phú',
          'Xã Nhuận Đức',
          'Xã Phạm Văn Cội',
          'Xã Phú Hòa Đông',
          'Xã Phú Mỹ Hưng',
          'Xã Tân An Hội',
          'Xã Tân Phú Trung',
          'Xã Tân Thạnh Đông',
          'Xã Tân Thạnh Tây',
          'Xã Tân Thông Hội',
          'Xã Thái Mỹ',
          'Xã Trung An',
          'Xã Trung Lập Hạ',
          'Xã Trung Lập Thượng',
        ],
      },
      {
        name: 'Huyện Nhà Bè',
        wards: [
          'Thị trấn Nhà Bè',
          'Xã Hiệp Phước',
          'Xã Long Thới',
          'Xã Nhơn Đức',
          'Xã Phú Xuân',
          'Xã Phước Kiển',
          'Xã Phước Lộc',
        ],
      },
      {
        name: 'Huyện Cần Giờ',
        wards: [
          'Thị trấn Cần Thạnh',
          'Xã An Thới Đông',
          'Xã Bình Khánh',
          'Xã Long Hòa',
          'Xã Lý Nhơn',
          'Xã Tam Thôn Hiệp',
          'Xã Thạnh An',
        ],
      },
    ],
  },
  'Hà Nội': {
    districts: [
      {
        name: 'Quận Cầu Giấy',
        wards: [
          'Phường Dịch Vọng',
          'Phường Dịch Vọng Hậu',
          'Phường Mai Dịch',
          'Phường Nghĩa Đô',
          'Phường Nghĩa Tân',
          'Phường Quan Hoa',
          'Phường Trung Hòa',
          'Phường Yên Hòa',
        ],
      },
      {
        name: 'Quận Đống Đa',
        wards: [
          'Phường Cát Linh',
          'Phường Hàng Bột',
          'Phường Khâm Thiên',
          'Phường Khương Thượng',
          'Phường Kim Liên',
          'Phường Láng Hạ',
          'Phường Láng Thượng',
          'Phường Nam Đồng',
          'Phường Ngã Tư Sở',
          'Phường Ô Chợ Dừa',
          'Phường Phương Liên',
          'Phường Phương Mai',
          'Phường Quang Trung',
          'Phường Quốc Tử Giám',
          'Phường Thịnh Quang',
          'Phường Thổ Quan',
          'Phường Trung Liệt',
          'Phường Trung Phụng',
          'Phường Trung Tự',
          'Phường Văn Chương',
          'Phường Văn Miếu',
        ],
      },
      {
        name: 'Quận Ba Đình',
        wards: [
          'Phường Cống Vị',
          'Phường Điện Biên',
          'Phường Đội Cấn',
          'Phường Giảng Võ',
          'Phường Kim Mã',
          'Phường Liễu Giai',
          'Phường Ngọc Hà',
          'Phường Ngọc Khánh',
          'Phường Nguyễn Trung Trực',
          'Phường Phúc Xá',
          'Phường Quán Thánh',
          'Phường Thành Công',
          'Phường Trúc Bạch',
          'Phường Vĩnh Phúc',
        ],
      },
      {
        name: 'Quận Hoàn Kiếm',
        wards: [
          'Phường Chương Dương',
          'Phường Cửa Đông',
          'Phường Cửa Nam',
          'Phường Đồng Xuân',
          'Phường Hàng Bạc',
          'Phường Hàng Bài',
          'Phường Hàng Bồ',
          'Phường Hàng Bông',
          'Phường Hàng Buồm',
          'Phường Hàng Đào',
          'Phường Hàng Gai',
          'Phường Hàng Mã',
          'Phường Hàng Trống',
          'Phường Lý Thái Tổ',
          'Phường Phan Chu Trinh',
          'Phường Phúc Tân',
          'Phường Tràng Tiền',
          'Phường Trần Hưng Đạo',
        ],
      },
      {
        name: 'Quận Hai Bà Trưng',
        wards: [
          'Phường Bách Khoa',
          'Phường Bạch Đằng',
          'Phường Bạch Mai',
          'Phường Cầu Dền',
          'Phường Đống Mác',
          'Phường Đồng Nhân',
          'Phường Đồng Tâm',
          'Phường Lê Đại Hành',
          'Phường Minh Khai',
          'Phường Nguyễn Du',
          'Phường Phạm Đình Hổ',
          'Phường Phố Huế',
          'Phường Quỳnh Lôi',
          'Phường Quỳnh Mai',
          'Phường Thanh Lương',
          'Phường Thanh Nhàn',
          'Phường Trương Định',
          'Phường Vĩnh Tuy',
        ],
      },
      {
        name: 'Quận Thanh Xuân',
        wards: [
          'Phường Hạ Đình',
          'Phường Khương Đình',
          'Phường Khương Mai',
          'Phường Khương Trung',
          'Phường Kim Giang',
          'Phường Phương Liệt',
          'Phường Thanh Xuân Bắc',
          'Phường Thanh Xuân Nam',
          'Phường Thanh Xuân Trung',
          'Phường Thượng Đình',
          'Phường Nhân Chính',
        ],
      },
      {
        name: 'Quận Tây Hồ',
        wards: [
          'Phường Bưởi',
          'Phường Nhật Tân',
          'Phường Phú Thượng',
          'Phường Quảng An',
          'Phường Thụy Khuê',
          'Phường Tứ Liên',
          'Phường Xuân La',
          'Phường Yên Phụ',
        ],
      },
      {
        name: 'Quận Hoàng Mai',
        wards: [
          'Phường Đại Kim',
          'Phường Định Công',
          'Phường Giáp Bát',
          'Phường Hoàng Liệt',
          'Phường Hoàng Văn Thụ',
          'Phường Lĩnh Nam',
          'Phường Mai Động',
          'Phường Tân Mai',
          'Phường Thanh Trì',
          'Phường Thịnh Liệt',
          'Phường Trần Phú',
          'Phường Tương Mai',
          'Phường Vĩnh Hưng',
          'Phường Yên Sở',
        ],
      },
      {
        name: 'Quận Long Biên',
        wards: [
          'Phường Bồ Đề',
          'Phường Cự Khối',
          'Phường Đức Giang',
          'Phường Gia Thụy',
          'Phường Giang Biên',
          'Phường Long Biên',
          'Phường Ngọc Lâm',
          'Phường Ngọc Thụy',
          'Phường Phúc Đồng',
          'Phường Phúc Lợi',
          'Phường Sài Đồng',
          'Phường Thạch Bàn',
          'Phường Thượng Thanh',
          'Phường Việt Hưng',
        ],
      },
      {
        name: 'Quận Nam Từ Liêm',
        wards: [
          'Phường Cầu Diễn',
          'Phường Đại Mỗ',
          'Phường Mễ Trì',
          'Phường Mỹ Đình 1',
          'Phường Mỹ Đình 2',
          'Phường Phú Đô',
          'Phường Phương Canh',
          'Phường Tây Mỗ',
          'Phường Trung Văn',
          'Phường Xuân Phương',
        ],
      },
      {
        name: 'Quận Bắc Từ Liêm',
        wards: [
          'Phường Cổ Nhuế 1',
          'Phường Cổ Nhuế 2',
          'Phường Đông Ngạc',
          'Phường Đức Thắng',
          'Phường Liên Mạc',
          'Phường Minh Khai',
          'Phường Phú Diễn',
          'Phường Phúc Diễn',
          'Phường Tây Tựu',
          'Phường Thượng Cát',
          'Phường Thụy Phương',
          'Phường Xuân Đỉnh',
          'Phường Xuân Tảo',
        ],
      },
      {
        name: 'Quận Hà Đông',
        wards: [
          'Phường Biên Giang',
          'Phường Đồng Mai',
          'Phường Dương Nội',
          'Phường Hà Cầu',
          'Phường Kiến Hưng',
          'Phường La Khê',
          'Phường Mộ Lao',
          'Phường Nguyễn Trãi',
          'Phường Phú La',
          'Phường Phú Lãm',
          'Phường Phú Lương',
          'Phường Phúc La',
          'Phường Quang Trung',
          'Phường Vạn Phúc',
          'Phường Văn Quán',
          'Phường Yên Nghĩa',
          'Phường Yết Kiêu',
        ],
      },
      {
        name: 'Huyện Gia Lâm',
        wards: [
          'Thị trấn Trâu Quỳ',
          'Thị trấn Yên Viên',
          'Xã Bát Tràng',
          'Xã Cổ Bi',
          'Xã Đa Tốn',
          'Xã Đặng Xá',
          'Xã Đình Xuyên',
          'Xã Đông Dư',
          'Xã Dương Hà',
          'Xã Dương Quang',
          'Xã Dương Xá',
          'Xã Kiêu Kỵ',
          'Xã Kim Lan',
          'Xã Kim Sơn',
          'Xã Lệ Chi',
          'Xã Ninh Hiệp',
          'Xã Phù Đổng',
          'Xã Phú Thị',
          'Xã Văn Đức',
          'Xã Yên Thường',
          'Xã Yên Viên',
        ],
      },
      {
        name: 'Huyện Đông Anh',
        wards: [
          'Thị trấn Đông Anh',
          'Xã Bắc Hồng',
          'Xã Cổ Loa',
          'Xã Đại Mạch',
          'Xã Đông Hội',
          'Xã Dục Tú',
          'Xã Hải Bối',
          'Xã Kim Chung',
          'Xã Kim Nỗ',
          'Xã Liên Hà',
          'Xã Mai Lâm',
          'Xã Nam Hồng',
          'Xã Nguyên Khê',
          'Xã Tàm Xá',
          'Xã Thụy Lâm',
          'Xã Tiên Dương',
          'Xã Uy Nỗ',
          'Xã Vân Hà',
          'Xã Vân Nội',
          'Xã Việt Hùng',
          'Xã Vĩnh Ngọc',
          'Xã Võng La',
          'Xã Xuân Canh',
          'Xã Xuân Nộn',
        ],
      },
      {
        name: 'Huyện Thanh Trì',
        wards: [
          'Thị trấn Văn Điển',
          'Xã Đại Áng',
          'Xã Đông Mỹ',
          'Xã Duyên Hà',
          'Xã Hữu Hòa',
          'Xã Liên Ninh',
          'Xã Ngọc Hồi',
          'Xã Ngũ Hiệp',
          'Xã Tả Thanh Oai',
          'Xã Tam Hiệp',
          'Xã Tân Triều',
          'Xã Thanh Liệt',
          'Xã Tứ Hiệp',
          'Xã Vạn Phúc',
          'Xã Vĩnh Quỳnh',
          'Xã Yên Mỹ',
        ],
      },
      {
        name: 'Huyện Hoài Đức',
        wards: [
          'Thị trấn Trạm Trôi',
          'Xã An Khánh',
          'Xã An Thượng',
          'Xã Cát Quế',
          'Xã Di Trạch',
          'Xã Dương Liễu',
          'Xã Đắc Sở',
          'Xã Đông La',
          'Xã Đức Giang',
          'Xã Đức Thượng',
          'Xã Kim Chung',
          'Xã La Phù',
          'Xã Lại Yên',
          'Xã Minh Khai',
          'Xã Song Phương',
          'Xã Sơn Đồng',
          'Xã Tiền Yên',
          'Xã Vân Canh',
          'Xã Vân Côn',
          'Xã Yên Sở',
        ],
      },
    ],
  },
  'Đà Nẵng': {
    districts: [
      {
        name: 'Quận Hải Châu',
        wards: [
          'Phường Bình Hiên',
          'Phường Bình Thuận',
          'Phường Hải Châu I',
          'Phường Hải Châu II',
          'Phường Hòa Cường Bắc',
          'Phường Hòa Cường Nam',
          'Phường Hòa Thuận Đông',
          'Phường Hòa Thuận Tây',
          'Phường Nam Dương',
          'Phường Phước Ninh',
          'Phường Thạch Thang',
          'Phường Thanh Bình',
          'Phường Thuận Phước',
        ],
      },
      {
        name: 'Quận Thanh Khê',
        wards: [
          'Phường An Khê',
          'Phường Chính Gián',
          'Phường Hòa Khê',
          'Phường Tam Thuận',
          'Phường Tân Chính',
          'Phường Thạc Gián',
          'Phường Thanh Khê Đông',
          'Phường Thanh Khê Tây',
          'Phường Vĩnh Trung',
          'Phường Xuân Hà',
        ],
      },
      {
        name: 'Quận Sơn Trà',
        wards: [
          'Phường An Hải Bắc',
          'Phường An Hải Đông',
          'Phường An Hải Tây',
          'Phường Mân Thái',
          'Phường Nại Hiên Đông',
          'Phường Phước Mỹ',
          'Phường Thọ Quang',
        ],
      },
      {
        name: 'Quận Ngũ Hành Sơn',
        wards: [
          'Phường Hòa Hải',
          'Phường Hòa Quý',
          'Phường Khuê Mỹ',
          'Phường Mỹ An',
        ],
      },
      {
        name: 'Quận Liên Chiểu',
        wards: [
          'Phường Hòa Hiệp Bắc',
          'Phường Hòa Hiệp Nam',
          'Phường Hòa Khánh Bắc',
          'Phường Hòa Khánh Nam',
          'Phường Hòa Minh',
        ],
      },
      {
        name: 'Quận Cẩm Lệ',
        wards: [
          'Phường Hòa An',
          'Phường Hòa Phát',
          'Phường Hòa Thọ Đông',
          'Phường Hòa Thọ Tây',
          'Phường Hòa Xuân',
          'Phường Khuê Trung',
        ],
      },
      {
        name: 'Huyện Hòa Vang',
        wards: [
          'Xã Hòa Bắc',
          'Xã Hòa Châu',
          'Xã Hòa Khương',
          'Xã Hòa Liên',
          'Xã Hòa Nhơn',
          'Xã Hòa Ninh',
          'Xã Hòa Phong',
          'Xã Hòa Phú',
          'Xã Hòa Phước',
          'Xã Hòa Sơn',
          'Xã Hòa Tiến',
        ],
      },
    ],
  },
  'Hải Phòng': {
    districts: [
      { name: 'Quận Hồng Bàng', wards: ['Phường Hoàng Văn Thụ', 'Phường Phan Bội Châu', 'Phường Minh Khai', 'Phường Quán Toan'] },
      { name: 'Quận Ngô Quyền', wards: ['Phường Lạch Tray', 'Phường Máy Tơ', 'Phường Cầu Đất', 'Phường Lê Lợi'] },
      { name: 'Quận Lê Chân', wards: ['Phường An Dương', 'Phường Dư Hàng', 'Phường Hàng Kênh', 'Phường Vĩnh Niệm'] },
      { name: 'Quận Hải An', wards: ['Phường Đằng Hải', 'Phường Đằng Lâm', 'Phường Đông Hải 1', 'Phường Nam Hải'] },
      { name: 'Quận Kiến An', wards: ['Phường Bắc Sơn', 'Phường Quán Trữ', 'Phường Trần Thành Ngọ', 'Phường Văn Đẩu'] },
      { name: 'Quận Đồ Sơn', wards: ['Phường Vạn Hương', 'Phường Hải Sơn', 'Phường Minh Đức', 'Phường Bàng La'] },
      { name: 'Quận Dương Kinh', wards: ['Phường Anh Dũng', 'Phường Đa Phúc', 'Phường Hải Thành', 'Phường Tân Thành'] },
      { name: 'Huyện Thủy Nguyên', wards: ['Thị trấn Núi Đèo', 'Xã An Lư', 'Xã Hoàng Động', 'Xã Kênh Giang', 'Xã Lưu Kiếm'] },
      { name: 'Huyện An Dương', wards: ['Thị trấn An Dương', 'Xã An Đồng', 'Xã An Hòa', 'Xã Hồng Phong', 'Xã Nam Sơn'] },
    ],
  },
  'Cần Thơ': {
    districts: [
      { name: 'Quận Ninh Kiều', wards: ['Phường An Cư', 'Phường An Hòa', 'Phường An Khánh', 'Phường Cái Khế', 'Phường Tân An', 'Phường Xuân Khánh'] },
      { name: 'Quận Bình Thủy', wards: ['Phường An Thới', 'Phường Bình Thủy', 'Phường Bùi Hữu Nghĩa', 'Phường Trà An', 'Phường Trà Nóc'] },
      { name: 'Quận Cái Răng', wards: ['Phường Ba Láng', 'Phường Hưng Phú', 'Phường Hưng Thạnh', 'Phường Lê Bình', 'Phường Phú Thứ'] },
      { name: 'Quận Ô Môn', wards: ['Phường Châu Văn Liêm', 'Phường Phước Thới', 'Phường Thới An', 'Phường Thới Hòa'] },
      { name: 'Quận Thốt Nốt', wards: ['Phường Thốt Nốt', 'Phường Thuận An', 'Phường Tân Hưng', 'Phường Trung Nhất'] },
      { name: 'Huyện Phong Điền', wards: ['Thị trấn Phong Điền', 'Xã Giai Xuân', 'Xã Mỹ Khánh', 'Xã Nhơn Ái'] },
    ],
  },
  'Đồng Nai': {
    districts: [
      { name: 'Thành phố Biên Hòa', wards: ['Phường An Bình', 'Phường Bình Đa', 'Phường Bửu Long', 'Phường Hố Nai', 'Phường Tam Hiệp', 'Phường Tân Hiệp', 'Phường Tân Mai', 'Phường Tân Phong', 'Phường Trảng Dài'] },
      { name: 'Thành phố Long Khánh', wards: ['Phường Xuân An', 'Phường Xuân Bình', 'Phường Xuân Hòa', 'Phường Xuân Trung', 'Phường Suối Tre'] },
      { name: 'Huyện Long Thành', wards: ['Thị trấn Long Thành', 'Xã An Phước', 'Xã Bình An', 'Xã Lộc An', 'Xã Long An', 'Xã Long Đức', 'Xã Phước Thái', 'Xã Tam An'] },
      { name: 'Huyện Nhơn Trạch', wards: ['Thị trấn Hiệp Phước', 'Xã Đại Phước', 'Xã Long Tân', 'Xã Phú Hội', 'Xã Phước An'] },
      { name: 'Huyện Trảng Bom', wards: ['Thị trấn Trảng Bom', 'Xã An Viễn', 'Xã Bắc Sơn', 'Xã Bình Minh', 'Xã Đồi 61', 'Xã Hố Nai 3', 'Xã Sông Trầu'] },
      { name: 'Huyện Vĩnh Cửu', wards: ['Thị trấn Vĩnh An', 'Xã Bình Hòa', 'Xã Tân Bình', 'Xã Thạnh Phú', 'Xã Trị An'] },
      { name: 'Huyện Thống Nhất', wards: ['Thị trấn Dầu Giây', 'Xã Gia Tân 1', 'Xã Gia Tân 2', 'Xã Quang Trung'] },
    ],
  },
  'Bình Dương': {
    districts: [
      { name: 'Thành phố Thủ Dầu Một', wards: ['Phường Chánh Mỹ', 'Phường Chánh Nghĩa', 'Phường Định Hòa', 'Phường Hiệp An', 'Phường Hiệp Thành', 'Phường Phú Cường', 'Phường Phú Hòa', 'Phường Phú Lợi', 'Phường Phú Mỹ'] },
      { name: 'Thành phố Thuận An', wards: ['Phường An Phú', 'Phường An Thạnh', 'Phường Bình Chuẩn', 'Phường Bình Hòa', 'Phường Bình Nhâm', 'Phường Lái Thiêu', 'Phường Thuận Giao', 'Phường Vĩnh Phú'] },
      { name: 'Thành phố Dĩ An', wards: ['Phường An Bình', 'Phường Bình An', 'Phường Bình Thắng', 'Phường Dĩ An', 'Phường Đông Hòa', 'Phường Tân Bình', 'Phường Tân Đông Hiệp'] },
      { name: 'Thành phố Tân Uyên', wards: ['Phường Khánh Bình', 'Phường Tân Hiệp', 'Phường Tân Phước Khánh', 'Phường Thái Hòa', 'Phường Uyên Hưng'] },
      { name: 'Thành phố Bến Cát', wards: ['Phường Mỹ Phước', 'Phường Thới Hòa', 'Phường Tân Định', 'Phường Hòa Lợi'] },
      { name: 'Huyện Bàu Bàng', wards: ['Thị trấn Lai Uyên', 'Xã Cây Trường II', 'Xã Hưng Hòa', 'Xã Lai Hưng', 'Xã Trừ Văn Thố'] },
    ],
  },
  'Long An': {
    districts: [
      { name: 'Thành phố Tân An', wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường Tân Khánh', 'Xã An Vĩnh Ngãi', 'Xã Lợi Bình Nhơn'] },
      { name: 'Thị xã Kiến Tường', wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Xã Bình Hiệp', 'Xã Tuyên Thạnh'] },
      { name: 'Huyện Bến Lức', wards: ['Thị trấn Bến Lức', 'Xã An Thạnh', 'Xã Lương Hòa', 'Xã Mỹ Yên', 'Xã Phước Lợi'] },
      { name: 'Huyện Cần Đước', wards: ['Thị trấn Cần Đước', 'Xã Long Hựu Đông', 'Xã Long Hòa', 'Xã Tân Ân'] },
      { name: 'Huyện Cần Giuộc', wards: ['Thị trấn Cần Giuộc', 'Xã Long Hậu', 'Xã Phước Lại', 'Xã Đông Thạnh'] },
      { name: 'Huyện Đức Hòa', wards: ['Thị trấn Đức Hòa', 'Thị trấn Hậu Nghĩa', 'Xã Mỹ Hạnh Bắc', 'Xã Mỹ Hạnh Nam', 'Xã Đức Hòa Hạ'] },
    ],
  },
};

/**
 * Danh sách quận/huyện mặc định hoặc dự phòng cho các tỉnh còn lại
 */
const DEFAULT_FALLBACK_DISTRICTS: Record<string, string[]> = {
  'Bà Rịa - Vũng Tàu': ['Thành phố Vũng Tàu', 'Thành phố Bà Rịa', 'Thị xã Phú Mỹ', 'Huyện Châu Đức', 'Huyện Xuyên Mộc', 'Huyện Long Điền', 'Huyện Đất Đỏ', 'Huyện Côn Đảo'],
  'Khánh Hòa': ['Thành phố Nha Trang', 'Thành phố Cam Ranh', 'Thị xã Ninh Hòa', 'Huyện Diên Khánh', 'Huyện Vạn Ninh', 'Huyện Cam Lâm', 'Huyện Khánh Vĩnh', 'Huyện Khánh Sơn'],
  'Thừa Thiên Huế': ['Thành phố Huế', 'Thị xã Hương Thủy', 'Thị xã Hương Trà', 'Huyện Phong Điền', 'Huyện Quảng Điền', 'Huyện Phú Vang', 'Huyện Phú Lộc'],
  'Quảng Nam': ['Thành phố Tam Kỳ', 'Thành phố Hội An', 'Thị xã Điện Bàn', 'Huyện Duy Xuyên', 'Huyện Thăng Bình', 'Huyện Núi Thành'],
  'Quảng Ninh': ['Thành phố Hạ Long', 'Thành phố Cẩm Phả', 'Thành phố Uông Bí', 'Thành phố Móng Cái', 'Thị xã Quảng Yên', 'Thị xã Đông Triều'],
  'Bắc Ninh': ['Thành phố Bắc Ninh', 'Thị xã Từ Sơn', 'Thị xã Thuận Thành', 'Thị xã Quế Võ', 'Huyện Tiên Du', 'Huyện Yên Phong'],
  'Bình Định': ['Thành phố Quy Nhơn', 'Thị xã An Nhơn', 'Thị xã Hoài Nhơn', 'Huyện Phù Cát', 'Huyện Tuy Phước'],
  'Lâm Đồng': ['Thành phố Đà Lạt', 'Thành phố Bảo Lộc', 'Huyện Đức Trọng', 'Huyện Di Linh', 'Huyện Lâm Hà'],
  'Kiên Giang': ['Thành phố Rạch Giá', 'Thành phố Phú Quốc', 'Thành phố Hà Tiên', 'Huyện Kiên Lương', 'Huyện Hòn Đất'],
  'Tiền Giang': ['Thành phố Mỹ Tho', 'Thị xã Gò Công', 'Thị xã Cai Lậy', 'Huyện Châu Thành', 'Huyện Chợ Gạo'],
};

/**
 * Lấy danh sách Quận / Huyện thuộc Tỉnh / Thành phố
 */
export function getDistrictsForProvince(provinceName?: string | null): string[] {
  if (!provinceName) return [];
  const matchedProv = findMatchingProvince(provinceName);
  if (!matchedProv) return [];

  const provData = VIETNAM_ADMINISTRATIVE_DATA[matchedProv];
  if (provData && provData.districts.length > 0) {
    return provData.districts.map((d) => d.name);
  }

  if (DEFAULT_FALLBACK_DISTRICTS[matchedProv]) {
    return DEFAULT_FALLBACK_DISTRICTS[matchedProv];
  }

  return [];
}

/**
 * Lấy danh sách Phường / Xã thuộc Quận / Huyện của Tỉnh / Thành phố
 */
export function getWardsForDistrict(
  provinceName?: string | null,
  districtName?: string | null
): string[] {
  if (!provinceName || !districtName) return [];
  const matchedProv = findMatchingProvince(provinceName);
  if (!matchedProv) return [];

  const provData = VIETNAM_ADMINISTRATIVE_DATA[matchedProv];
  if (!provData) return [];

  const normTarget = normalizeAdminName(districtName);
  const foundDistrict = provData.districts.find((d) => {
    const normD = normalizeAdminName(d.name);
    return (
      normD === normTarget ||
      normD.includes(normTarget) ||
      normTarget.includes(normD) ||
      (normTarget === 'thu duc' && normD.includes('thu duc'))
    );
  });

  return foundDistrict ? foundDistrict.wards : [];
}

/**
 * Chuẩn hóa và tìm tên Quận / Huyện chính thức theo Tỉnh / Thành phố
 */
export function findMatchingDistrict(
  districtName?: string | null,
  provinceName?: string | null
): string | undefined {
  if (!districtName || !provinceName) return undefined;
  const matchedProv = findMatchingProvince(provinceName);
  if (!matchedProv) return undefined;

  const validDistricts = getDistrictsForProvince(matchedProv);
  if (validDistricts.length === 0) return undefined;

  const normTarget = normalizeAdminName(districtName);
  if (!normTarget) return undefined;

  // Danh sách các từ khóa TUYỆT ĐỐI KHÔNG PHẢI là Quận/Huyện:
  const INVALID_DISTRICT_KEYWORDS = [
    'saigon', 'sai gon', 'sai gòn', 'sài gòn',
    'ho chi minh', 'hồ chí minh', 'tp ho chi minh', 'tp hcm', 'hcmc',
    'ha noi', 'hà nội', 'da nang', 'đà nẵng', 'hai phong', 'hải phòng', 'can tho', 'cần thơ',
    'vietnam', 'việt nam', 'vn'
  ];
  if (INVALID_DISTRICT_KEYWORDS.includes(normTarget)) {
    return undefined;
  }

  // Xử lý các bí danh đặc thù cho TP. Hồ Chí Minh
  if (matchedProv === 'TP. Hồ Chí Minh') {
    if (
      normTarget === 'thu duc' ||
      normTarget === 'tp thu duc' ||
      normTarget === 'quan thu duc' ||
      normTarget === 'q thu duc' ||
      normTarget === 'quan 9' ||
      normTarget === 'q 9' ||
      normTarget === 'q9' ||
      normTarget === 'quan 2' ||
      normTarget === 'q 2' ||
      normTarget === 'q2'
    ) {
      return 'Thành phố Thủ Đức';
    }
  }

  // 1. Khớp chính xác hoàn toàn (exact match)
  for (const d of validDistricts) {
    const normD = normalizeAdminName(d);
    if (normD === normTarget) return d;
    if (
      normD === `quan ${normTarget}` ||
      normD === `huyen ${normTarget}` ||
      normD === `thanh pho ${normTarget}` ||
      normTarget === `quan ${normD}` ||
      normTarget === `huyen ${normD}`
    ) {
      return d;
    }
  }

  // 2. Khớp chuỗi con
  for (const d of validDistricts) {
    const normD = normalizeAdminName(d);
    if (normD.length >= 3 && normTarget.length >= 3) {
      if (normD.includes(normTarget) || normTarget.includes(normD)) {
        return d;
      }
    }
  }

  return undefined;
}

/**
 * Kiểm tra Quận / Huyện có thuộc Tỉnh / Thành phố đã chọn hay không.
 * Nếu tỉnh không có trong danh mục chi tiết, cho phép chấp nhận để không chặn người dùng các tỉnh nhỏ.
 */
export function isDistrictInProvince(
  districtName?: string | null,
  provinceName?: string | null
): boolean {
  if (!districtName || !provinceName) return false;
  const matchedProv = findMatchingProvince(provinceName);
  if (!matchedProv) return false;

  const validDistricts = getDistrictsForProvince(matchedProv);
  if (validDistricts.length === 0) {
    // Với các tỉnh chưa có danh mục đầy đủ, không chặn gắt
    return true;
  }

  return Boolean(findMatchingDistrict(districtName, matchedProv));
}

/**
 * Tìm Quận / Huyện dựa trên Phường / Xã và Tỉnh / Thành phố
 */
export function findDistrictByWard(
  provinceName?: string | null,
  wardName?: string | null
): string | undefined {
  if (!provinceName || !wardName) return undefined;
  const matchedProv = findMatchingProvince(provinceName);
  if (!matchedProv) return undefined;

  const provData = VIETNAM_ADMINISTRATIVE_DATA[matchedProv];
  if (!provData) return undefined;

  const normWard = normalizeAdminName(wardName);
  if (!normWard) return undefined;

  for (const d of provData.districts) {
    const hasWard = d.wards.some((w) => {
      const normW = normalizeAdminName(w);
      return normW === normWard || normW.includes(normWard) || normWard.includes(normW);
    });
    if (hasWard) {
      return d.name;
    }
  }
  return undefined;
}

/**
 * Suy đoán Quận / Huyện từ tọa độ địa lý (Bounding boxes cho các khu vực đô thị trọng điểm)
 */
export function getDistrictFromCoords(
  lat: number,
  lng: number,
  provinceName?: string | null
): string | undefined {
  const matchedProv = findMatchingProvince(provinceName);

  if (!matchedProv || matchedProv === 'TP. Hồ Chí Minh') {
    // TP. Thủ Đức (Quận 2, Quận 9, Thủ Đức cũ - vùng phía Đông TP.HCM)
    if (lng >= 106.735 && lat >= 10.74 && lat <= 10.92) {
      return 'Thành phố Thủ Đức';
    }
    // Quận 1 (trung tâm, Bến Nghé, Bến Thành, Đa Kao)
    if (lat >= 10.765 && lat <= 10.795 && lng >= 106.685 && lng <= 106.710) {
      return 'Quận 1';
    }
    // Quận 3 (tiếp giáp Quận 1, Võ Thị Sáu)
    if (lat >= 10.768 && lat <= 10.795 && lng >= 106.665 && lng < 106.685) {
      return 'Quận 3';
    }
    // Quận 4
    if (lat >= 10.745 && lat <= 10.765 && lng >= 106.690 && lng <= 106.720) {
      return 'Quận 4';
    }
    // Quận 5 (Chợ Lớn)
    if (lat >= 10.745 && lat <= 10.765 && lng >= 106.650 && lng < 106.690) {
      return 'Quận 5';
    }
    // Quận 7 (Phú Mỹ Hưng, Tân Phong)
    if (lat >= 10.710 && lat <= 10.755 && lng >= 106.695 && lng <= 106.760) {
      return 'Quận 7';
    }
    // Quận Bình Thạnh
    if (lat >= 10.790 && lat <= 10.835 && lng >= 106.695 && lng <= 106.735) {
      return 'Quận Bình Thạnh';
    }
    // Quận Gò Vấp
    if (lat >= 10.815 && lat <= 10.865 && lng >= 106.650 && lng <= 106.705) {
      return 'Quận Gò Vấp';
    }
    // Quận Phú Nhuận
    if (lat >= 10.785 && lat <= 10.815 && lng >= 106.660 && lng <= 106.690) {
      return 'Quận Phú Nhuận';
    }
    // Quận Tân Bình
    if (lat >= 10.780 && lat <= 10.825 && lng >= 106.630 && lng < 106.665) {
      return 'Quận Tân Bình';
    }
  }

  if (!matchedProv || matchedProv === 'Hà Nội') {
    // Cầu Giấy
    if (lat >= 21.015 && lat <= 21.055 && lng >= 105.770 && lng <= 105.815) {
      return 'Cầu Giấy';
    }
    // Ba Đình
    if (lat >= 21.015 && lat <= 21.045 && lng >= 105.815 && lng <= 105.840) {
      return 'Ba Đình';
    }
    // Hoàn Kiếm
    if (lat >= 21.020 && lat <= 21.045 && lng >= 105.840 && lng <= 105.865) {
      return 'Hoàn Kiếm';
    }
    // Đống Đa
    if (lat >= 20.995 && lat <= 21.025 && lng >= 105.815 && lng <= 105.850) {
      return 'Đống Đa';
    }
    // Nam Từ Liêm
    if (lat >= 20.995 && lat <= 21.050 && lng >= 105.730 && lng <= 105.785) {
      return 'Nam Từ Liêm';
    }
  }

  return undefined;
}

export interface ResolvedAdminHierarchy {
  province: string;
  district: string;
  ward: string;
}

/**
 * Phân giải thứ bậc hành chính toàn diện:
 * - Chuẩn hóa Tỉnh / Thành phố
 * - Loại bỏ các từ khóa sai lệch như 'Saigon', 'Hà Nội' khỏi Quận/Huyện
 * - Nếu Quận/Huyện thực chất là Phường/Xã (ví dụ: 'Tăng Nhơn Phú', 'Thảo Điền'), tự động gán đúng Quận trực thuộc (ví dụ: 'Thành phố Thủ Đức')
 * - Loại bỏ các đơn vị phụ cấp khu phố ('Khu phố 30', 'Khu phố 8') để ưu tiên Phường/Xã chính thức
 */
export function resolveAdminHierarchy(params: {
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  fullText?: string | null;
  lat?: number | null;
  lng?: number | null;
}): ResolvedAdminHierarchy {
  const full = params.fullText || '';
  const resolvedProv =
    findMatchingProvince(params.province) ||
    findMatchingProvince(full) ||
    (params.lat && params.lng ? getProvinceFromCoords(params.lat, params.lng) : undefined) ||
    'TP. Hồ Chí Minh';

  // 1. Làm sạch rawDistrict
  let rawDist = (params.district || '').trim();
  const normDist = normalizeAdminName(rawDist);
  const INVALID_DISTRICT_KEYWORDS = [
    'saigon', 'sai gon', 'sai gòn', 'sài gòn',
    'ho chi minh', 'hồ chí minh', 'tp ho chi minh', 'tp hcm', 'hcmc',
    'ha noi', 'hà nội', 'da nang', 'đà nẵng', 'hai phong', 'hải phòng', 'can tho', 'cần thơ',
    'vietnam', 'việt nam', 'vn'
  ];
  if (INVALID_DISTRICT_KEYWORDS.includes(normDist)) {
    rawDist = '';
  }

  // 2. Làm sạch rawWard
  let rawWard = (params.ward || '').trim();
  const normWard = normalizeAdminName(rawWard);
  // Loại bỏ các đơn vị phụ dưới cấp phường như 'Khu phố 30', 'Tổ 5', 'Ấp 3'
  const isSubWardLevel = /^(khu pho|to dan pho|to|ap|thon|xom)\b/i.test(normWard);
  if (isSubWardLevel) {
    rawWard = '';
  }

  let resolvedDist = '';
  let resolvedWard = rawWard;

  // 3. Nếu rawDist thực chất là tên một Phường/Xã (ví dụ: 'Tăng Nhơn Phú', 'Thảo Điền', 'Đa Kao'):
  if (rawDist) {
    const matchedDist = findMatchingDistrict(rawDist, resolvedProv);
    if (matchedDist) {
      // Giữ nguyên cách viết của rawDist nếu cùng tên cốt lõi (ví dụ: 'Cầu Giấy' thay vì ép 'Quận Cầu Giấy')
      // Ngược lại nếu khác nhau (ví dụ: 'Quận 9' -> 'Thành phố Thủ Đức'), lấy tên chuẩn matchedDist
      if (normalizeAdminName(rawDist) === normalizeAdminName(matchedDist)) {
        resolvedDist = rawDist;
      } else {
        resolvedDist = matchedDist;
      }
    } else {
      // rawDist không phải Quận, kiểm tra xem có phải là Phường/Xã trực thuộc quận nào không
      const parentDistFromWard = findDistrictByWard(resolvedProv, rawDist);
      if (parentDistFromWard) {
        resolvedDist = parentDistFromWard;
        if (!resolvedWard) {
          const wardsInParent = getWardsForDistrict(resolvedProv, parentDistFromWard);
          const matchedWardInParent = wardsInParent.find((w) => {
            const nw = normalizeAdminName(w);
            return nw === normDist || nw.includes(normDist) || normDist.includes(nw);
          });
          resolvedWard = matchedWardInParent || `Phường ${rawDist}`;
        }
      }
    }
  }

  // 4. Phân tích chuỗi fullText để trích xuất Quận/Huyện và Phường/Xã nếu chưa có
  if (!resolvedDist || !resolvedWard) {
    const parsed = parseAddressComponents(full);
    if (!resolvedDist && parsed.district) {
      resolvedDist = findMatchingDistrict(parsed.district, resolvedProv) || parsed.district;
    }
    if (!resolvedWard && parsed.ward) {
      resolvedWard = parsed.ward;
    }
  }

  // 5. Nếu chưa có quận nhưng đã có phường, tra cứu quận từ phường
  if (!resolvedDist && resolvedWard) {
    resolvedDist = findDistrictByWard(resolvedProv, resolvedWard) || '';
  }

  // 6. Nếu vẫn chưa có quận nhưng có tọa độ, suy đoán quận từ tọa độ
  if (!resolvedDist && params.lat && params.lng) {
    resolvedDist = getDistrictFromCoords(params.lat, params.lng, resolvedProv) || '';
  }

  // 7. Nếu có quận và chưa có phường:
  if (!resolvedWard && resolvedProv && resolvedDist) {
    const wardsInDist = getWardsForDistrict(resolvedProv, resolvedDist);
    const matchedFromFull = wardsInDist.find((w) => {
      const nw = normalizeAdminName(w);
      return nw.length >= 4 && full.toLowerCase().includes(nw);
    });
    if (matchedFromFull) {
      resolvedWard = matchedFromFull;
    } else if (wardsInDist.length > 0) {
      resolvedWard = wardsInDist[0];
    }
  }

  return {
    province: resolvedProv,
    district: resolvedDist,
    ward: resolvedWard,
  };
}

/**
 * Suy đoán Tỉnh/Thành và Quận/Huyện từ tên Phường/Xã độc nhất
 */
export function findLocationByWard(
  wardName?: string | null
): { province: string; district: string; ward: string } | null {
  if (!wardName) return null;
  const normWard = normalizeAdminName(wardName);
  if (!normWard || normWard.length < 3) return null;

  for (const [provName, provData] of Object.entries(VIETNAM_ADMINISTRATIVE_DATA)) {
    for (const d of provData.districts) {
      const matchedWard = d.wards.find((w) => {
        const normW = normalizeAdminName(w);
        return normW === normWard || (normW.length >= 6 && normW.includes(normWard));
      });
      if (matchedWard) {
        return {
          province: provName,
          district: d.name,
          ward: matchedWard,
        };
      }
    }
  }
  return null;
}

/**
 * Suy đoán Tỉnh / Thành phố từ tọa độ địa lý (Bounding boxes cho các đô thị lớn tại Việt Nam)
 */
export function getProvinceFromCoords(lat: number, lng: number): string | undefined {
  // TP. Hồ Chí Minh & vùng ven (10.35 - 11.15, 106.35 - 107.05)
  if (lat >= 10.35 && lat <= 11.15 && lng >= 106.35 && lng <= 107.05) {
    return 'TP. Hồ Chí Minh';
  }
  // Hà Nội & vùng ven (20.55 - 21.45, 105.40 - 106.15)
  if (lat >= 20.55 && lat <= 21.45 && lng >= 105.40 && lng <= 106.15) {
    return 'Hà Nội';
  }
  // Đà Nẵng (15.90 - 16.25, 108.00 - 108.40)
  if (lat >= 15.90 && lat <= 16.25 && lng >= 108.00 && lng <= 108.40) {
    return 'Đà Nẵng';
  }
  // Hải Phòng (20.60 - 21.05, 106.50 - 107.15)
  if (lat >= 20.60 && lat <= 21.05 && lng >= 106.50 && lng <= 107.15) {
    return 'Hải Phòng';
  }
  // Cần Thơ (9.90 - 10.30, 105.40 - 105.90)
  if (lat >= 9.90 && lat <= 10.30 && lng >= 105.40 && lng <= 105.90) {
    return 'Cần Thơ';
  }
  return undefined;
}
