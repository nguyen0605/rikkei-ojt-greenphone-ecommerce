import { get, put, post } from './api';
import type {
  UserDTO,
  UserProfileRequest,
  ChangePasswordRequest,
  AddressItem,
  AddressRequest,
} from '@/types/api';

const ADDRESS_STORAGE_PREFIX = 'greenphone.addresses.';

function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem('greenphone.user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.id !== undefined && u?.id !== null && String(u.id).trim() !== '') {
        return String(u.id);
      }
      if (u?.email && typeof u.email === 'string' && u.email.trim() !== '') {
        return u.email.trim();
      }
    }
  } catch {
    // ignore parse error
  }
  return 'default';
}

function getStoredAddresses(userId: string): AddressItem[] {
  try {
    const raw = localStorage.getItem(`${ADDRESS_STORAGE_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Lọc các bản ghi hợp lệ để tránh dữ liệu rác làm hỏng ứng dụng
        return parsed.filter(
          (item) => item && typeof item === 'object' && item.id && item.streetAddress
        );
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function saveStoredAddresses(userId: string, addresses: AddressItem[]): void {
  try {
    localStorage.setItem(`${ADDRESS_STORAGE_PREFIX}${userId}`, JSON.stringify(addresses));
  } catch {
    // ignore
  }
}

function normAddress(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export function formatFullAddress(
  item: Pick<AddressItem, 'streetAddress' | 'ward' | 'district' | 'province'>
): string {
  const street = (item.streetAddress || '').trim();
  const ward = (item.ward || '').trim();
  const district = (item.district || '').trim();
  const province = (item.province || '').trim();

  if (!street) {
    return [ward, district, province].filter(Boolean).join(', ');
  }

  const normStreet = normAddress(street);
  const parts: string[] = [street];

  if (ward) {
    const normWard = normAddress(ward);
    const cleanWard = normWard.replace(/^(phuong|xa|thi tran|p\.|x\.)\s*/i, '').trim();
    const isAlreadyPresent =
      normStreet.includes(normWard) ||
      (cleanWard && (normStreet.includes(`, ${cleanWard}`) || normStreet.includes(`p.${cleanWard}`) || normStreet.includes(`phuong ${cleanWard}`)));
    if (!isAlreadyPresent) {
      parts.push(ward);
    }
  }

  if (district) {
    const normDist = normAddress(district);
    const cleanDistrict = normDist.replace(/^(quan|huyen|thi xa|thanh pho|tp\.|q\.|h\.)\s*/i, '').trim();
    const isAlreadyPresent =
      normStreet.includes(normDist) ||
      (cleanDistrict && (normStreet.includes(`, ${cleanDistrict}`) || normStreet.includes(`quan ${cleanDistrict}`) || normStreet.includes(`tp.${cleanDistrict}`) || normStreet.includes(`q.${cleanDistrict}`)));
    if (!isAlreadyPresent) {
      parts.push(district);
    }
  }

  if (province) {
    const normProv = normAddress(province);
    const cleanProvince = normProv.replace(/^(thanh pho|tinh|tp\.)\s*/i, '').trim();
    const isAlreadyPresent =
      normStreet.includes(normProv) ||
      (cleanProvince && (normStreet.includes(`, ${cleanProvince}`) || normStreet.includes(`tp ${cleanProvince}`) || normStreet.includes(`tinh ${cleanProvince}`)));
    if (!isAlreadyPresent) {
      parts.push(province);
    }
  }

  return parts.filter(Boolean).join(', ');
}

/**
 * Tạo dấu vân tay nhận diện địa chỉ để phát hiện trùng lặp
 * Dựa trên thông tin người nhận và chuỗi địa chỉ đã chuẩn hóa
 */
export function getAddressFingerprint(
  item: Pick<AddressItem, 'receiverName' | 'receiverPhone' | 'streetAddress' | 'ward' | 'district' | 'province'>
): string {
  const normName = normAddress(item.receiverName || '');
  const normPhone = (item.receiverPhone || '').replace(/\D/g, '');
  const full = formatFullAddress(item);
  const normAddr = normAddress(full);
  return `${normName}:::${normPhone}:::${normAddr}`;
}

/**
 * Loại bỏ các bản ghi địa chỉ trùng lặp và hợp nhất thông tin ghim tọa độ
 */
export function deduplicateAddresses(list: AddressItem[]): AddressItem[] {
  const seen = new Map<string, AddressItem>();

  for (const item of list) {
    const fp = getAddressFingerprint(item);
    if (!seen.has(fp)) {
      seen.set(fp, item);
    } else {
      const existing = seen.get(fp)!;
      const hasCoords = typeof item.latitude === 'number' && Number.isFinite(item.latitude);
      const existingHasCoords = typeof existing.latitude === 'number' && Number.isFinite(existing.latitude);

      const merged: AddressItem = {
        ...existing,
        // Ưu tiên bản ghi đã có tọa độ ghim hợp lệ
        latitude: existingHasCoords ? existing.latitude : hasCoords ? item.latitude : undefined,
        longitude: existingHasCoords ? existing.longitude : hasCoords ? item.longitude : undefined,
        isDefault: existing.isDefault || item.isDefault,
        note: existing.note || item.note,
      };
      seen.set(fp, merged);
    }
  }

  return Array.from(seen.values());
}

export const userService = {
  /**
   * Lấy thông tin hồ sơ tài khoản hiện tại từ Backend (GET /api/users/profile)
   */
  getProfile: (): Promise<UserDTO> => {
    return get<UserDTO>('/users/profile');
  },

  /**
   * Cập nhật thông tin hồ sơ (PUT /api/users/profile)
   */
  updateProfile: (data: UserProfileRequest): Promise<UserDTO> => {
    return put<UserDTO>('/users/profile', data);
  },

  /**
   * Đổi mật khẩu tài khoản (PUT /api/users/change-password)
   */
  changePassword: (data: ChangePasswordRequest): Promise<void> => {
    return put<void>('/users/change-password', data);
  },

  /**
   * Tải ảnh đại diện lên server
   * Kiểm tra MIME type và dung lượng (tối đa 2MB) trước khi gửi
   */
  uploadAvatar: async (file: File): Promise<string> => {
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validMimeTypes.includes(file.type)) {
      throw new Error('Định dạng file không hỗ trợ. Vui lòng chọn ảnh định dạng JPG, PNG, WEBP hoặc GIF.');
    }

    const maxSizeInBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSizeInBytes) {
      throw new Error('Dung lượng ảnh vượt quá 2MB. Vui lòng chọn ảnh nhỏ hơn.');
    }

    const formData = new FormData();
    formData.append('file', file);

    // Thử gọi endpoint upload avatar của backend nếu có
    try {
      const response = await post<{ url?: string; avatarUrl?: string } | string>(
        '/users/avatar',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (typeof response === 'string') return response;
      if (response && typeof response === 'object') {
        const url = response.url || response.avatarUrl;
        if (url) return url;
      }
    } catch (err: unknown) {
      // Backend BE1 chưa có API Upload Avatar chuyên biệt (chỉ có User Profile cơ bản)
      // Chuyển sang Data URL preview an toàn để lưu vào local state profile
      const message = (err as Error)?.message || '';
      if (!message.includes('404') && !message.includes('not found')) {
        // Nếu không phải 404 thì có thể là lỗi mạng hoặc lỗi khác, nhưng vẫn fallback an toàn
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Không thể đọc file ảnh.'));
        }
      };
      reader.onerror = () => reject(new Error('Lỗi khi đọc file ảnh.'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Lấy danh sách địa chỉ giao hàng của người dùng hiện tại
   */
  getAddresses: async (): Promise<AddressItem[]> => {
    const userId = getCurrentUserId();
    let addresses = getStoredAddresses(userId);

    // Nếu chưa có địa chỉ nào trong store, đồng bộ từ hồ sơ backend nếu có
    if (addresses.length === 0) {
      try {
        const profile = await get<UserDTO>('/users/profile');
        if (profile.address && profile.address.trim()) {
          const initialAddress: AddressItem = {
            id: `addr_${Date.now()}`,
            receiverName: profile.fullName || 'Người nhận',
            receiverPhone: profile.phone || '',
            province: 'TP. Hồ Chí Minh',
            streetAddress: profile.address,
            isDefault: true,
            createdAt: new Date().toISOString(),
          };
          addresses = [initialAddress];
          saveStoredAddresses(userId, addresses);
        }
      } catch {
        // Bỏ qua lỗi nếu chưa đăng nhập hoặc mạng yếu
      }
    }

    // Tự động làm sạch các bản ghi địa chỉ trùng lặp nếu có
    const uniqueAddresses = deduplicateAddresses(addresses);
    if (uniqueAddresses.length !== addresses.length) {
      addresses = uniqueAddresses;
      saveStoredAddresses(userId, addresses);
    }

    return addresses;
  },

  /**
   * Thêm mới một địa chỉ giao hàng
   */
  createAddress: async (data: AddressRequest): Promise<AddressItem> => {
    const userId = getCurrentUserId();
    const addresses = getStoredAddresses(userId);

    // Kiểm tra trùng lặp với địa chỉ đã có của cùng người nhận
    const newFingerprint = getAddressFingerprint(data);
    const isDuplicate = addresses.some((a) => getAddressFingerprint(a) === newFingerprint);
    if (isDuplicate) {
      throw new Error('Địa chỉ này đã tồn tại trong sổ địa chỉ của bạn.');
    }

    const isFirstAddress = addresses.length === 0;
    const shouldBeDefault = isFirstAddress || !!data.isDefault;

    const newAddress: AddressItem = {
      id: `addr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      receiverName: data.receiverName.trim(),
      receiverPhone: data.receiverPhone.trim(),
      province: data.province.trim(),
      district: data.district?.trim(),
      ward: data.ward?.trim(),
      streetAddress: data.streetAddress.trim(),
      label: data.label || 'HOME',
      latitude:
        typeof data.latitude === 'number' && Number.isFinite(data.latitude)
          ? data.latitude
          : undefined,
      longitude:
        typeof data.longitude === 'number' && Number.isFinite(data.longitude)
          ? data.longitude
          : undefined,
      note: data.note?.trim(),
      isDefault: shouldBeDefault,
      createdAt: new Date().toISOString(),
    };

    let updatedList: AddressItem[];
    if (shouldBeDefault) {
      updatedList = [
        newAddress,
        ...addresses.map((a) => ({ ...a, isDefault: false })),
      ];
    } else {
      updatedList = [...addresses, newAddress];
    }

    // Luôn lưu dữ liệu local trước để bảo toàn thông tin khách hàng
    saveStoredAddresses(userId, updatedList);

    if (shouldBeDefault) {
      // Đồng bộ địa chỉ mặc định về backend USERS.ADDRESS
      try {
        const fullAddr = formatFullAddress(newAddress);
        await put<UserDTO>('/users/profile', {
          fullName: newAddress.receiverName,
          phone: newAddress.receiverPhone,
          address: fullAddr,
        });
      } catch {
        // Bỏ qua lỗi đồng bộ Backend profile, không làm mất địa chỉ đã lưu
      }
    }

    return newAddress;
  },

  /**
   * Cập nhật địa chỉ giao hàng
   */
  updateAddress: async (id: string | number, data: AddressRequest): Promise<AddressItem> => {
    const userId = getCurrentUserId();
    const addresses = getStoredAddresses(userId);
    const existingIndex = addresses.findIndex((a) => String(a.id) === String(id));

    if (existingIndex === -1) {
      throw new Error('Địa chỉ không tồn tại hoặc đã bị xóa.');
    }

    // Kiểm tra nếu địa chỉ sau khi sửa bị trùng với một địa chỉ khác trong sổ
    const updateFingerprint = getAddressFingerprint(data);
    const isDuplicateOther = addresses.some(
      (a) => String(a.id) !== String(id) && getAddressFingerprint(a) === updateFingerprint
    );
    if (isDuplicateOther) {
      throw new Error('Địa chỉ này đã trùng với một địa chỉ khác trong sổ địa chỉ của bạn.');
    }

    const currentItem = addresses[existingIndex];
    const willBeDefault = data.isDefault !== undefined ? !!data.isDefault : currentItem.isDefault;

    const updatedItem: AddressItem = {
      ...currentItem,
      receiverName: data.receiverName.trim(),
      receiverPhone: data.receiverPhone.trim(),
      province: data.province.trim(),
      district: data.district?.trim(),
      ward: data.ward?.trim(),
      streetAddress: data.streetAddress.trim(),
      label: data.label !== undefined ? data.label : currentItem.label,
      latitude:
        typeof data.latitude === 'number' && Number.isFinite(data.latitude)
          ? data.latitude
          : currentItem.latitude,
      longitude:
        typeof data.longitude === 'number' && Number.isFinite(data.longitude)
          ? data.longitude
          : currentItem.longitude,
      note: data.note?.trim(),
      isDefault: willBeDefault,
    };

    let updatedList: AddressItem[];
    if (willBeDefault) {
      updatedList = addresses.map((a) => {
        if (String(a.id) === String(id)) return updatedItem;
        return { ...a, isDefault: false };
      });
    } else {
      // Nếu địa chỉ này đang là mặc định duy nhất mà bỏ tick mặc định -> không cho phép
      const hasOtherDefault = addresses.some(
        (a) => String(a.id) !== String(id) && a.isDefault
      );
      if (!hasOtherDefault && currentItem.isDefault) {
        // Giữ nguyên là default vì phải có ít nhất 1 default
        updatedItem.isDefault = true;
      }
      updatedList = addresses.map((a) => (String(a.id) === String(id) ? updatedItem : a));
    }

    // Luôn lưu dữ liệu local trước để bảo toàn thông tin khách hàng
    saveStoredAddresses(userId, updatedList);

    if (willBeDefault) {
      // Đồng bộ địa chỉ mặc định về backend USERS.ADDRESS
      try {
        const fullAddr = formatFullAddress(updatedItem);
        await put<UserDTO>('/users/profile', {
          fullName: updatedItem.receiverName,
          phone: updatedItem.receiverPhone,
          address: fullAddr,
        });
      } catch {
        // Bỏ qua lỗi đồng bộ Backend profile, không làm mất địa chỉ đã sửa
      }
    }

    return updatedItem;
  },

  /**
   * Xóa địa chỉ giao hàng
   * Quy tắc nghiệp vụ: Không thể xóa địa chỉ mặc định nếu đây là địa chỉ duy nhất
   */
  deleteAddress: async (id: string | number): Promise<void> => {
    const userId = getCurrentUserId();
    const addresses = getStoredAddresses(userId);
    const target = addresses.find((a) => String(a.id) === String(id));

    if (!target) {
      throw new Error('Địa chỉ không tồn tại hoặc đã bị xóa.');
    }

    if (addresses.length === 1 && target.isDefault) {
      throw new Error('Không thể xóa địa chỉ mặc định khi bạn chỉ có duy nhất một địa chỉ.');
    }

    let remaining = addresses.filter((a) => String(a.id) !== String(id));

    // Nếu xóa địa chỉ mặc định và còn các địa chỉ khác, tự động đặt địa chỉ đầu tiên làm mặc định
    if (target.isDefault && remaining.length > 0) {
      remaining = remaining.map((a, idx) => ({
        ...a,
        isDefault: idx === 0,
      }));
    }

    // Luôn lưu dữ liệu local trước
    saveStoredAddresses(userId, remaining);

    if (target.isDefault && remaining.length > 0) {
      // Đồng bộ địa chỉ mặc định mới về backend
      try {
        const newDefault = remaining[0];
        const fullAddr = formatFullAddress(newDefault);
        await put<UserDTO>('/users/profile', {
          fullName: newDefault.receiverName,
          phone: newDefault.receiverPhone,
          address: fullAddr,
        });
      } catch {
        // Bỏ qua lỗi đồng bộ Backend profile
      }
    }
  },

  /**
   * Đặt làm địa chỉ mặc định
   */
  setDefaultAddress: async (id: string | number): Promise<AddressItem> => {
    const userId = getCurrentUserId();
    const addresses = getStoredAddresses(userId);
    const target = addresses.find((a) => String(a.id) === String(id));

    if (!target) {
      throw new Error('Địa chỉ không tồn tại.');
    }

    const updatedList = addresses.map((a) => ({
      ...a,
      isDefault: String(a.id) === String(id),
    }));

    const newDefault = { ...target, isDefault: true };
    saveStoredAddresses(userId, updatedList);

    // Đồng bộ về backend USERS.ADDRESS
    try {
      const fullAddr = formatFullAddress(newDefault);
      await put<UserDTO>('/users/profile', {
        fullName: newDefault.receiverName,
        phone: newDefault.receiverPhone,
        address: fullAddr,
      });
    } catch {
      // ignore
    }

    return newDefault;
  },
};
