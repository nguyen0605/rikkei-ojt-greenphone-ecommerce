/**
 * Vietnam Administrative Divisions Data & Cascading Helpers
 * Cung cấp danh mục Quận / Huyện theo Tỉnh / Thành phố và Phường / Xã theo Quận / Huyện.
 * Hỗ trợ gợi ý tự động (Autocomplete) và kiểm tra tính hợp lệ của địa chỉ giao hàng.
 */

import { VIETNAM_PROVINCES, findMatchingProvince } from './provinces';

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

  const normTarget = normalizeAdminName(districtName);
  return validDistricts.some((d) => {
    const normD = normalizeAdminName(d);
    return normD === normTarget || normD.includes(normTarget) || normTarget.includes(normD);
  });
}
