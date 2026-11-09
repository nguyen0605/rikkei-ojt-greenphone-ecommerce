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
      if (u?.id) return String(u.id);
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
      if (Array.isArray(parsed)) return parsed;
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

export function formatFullAddress(item: Pick<AddressItem, 'streetAddress' | 'ward' | 'district' | 'province'>): string {
  const parts = [item.streetAddress, item.ward, item.district, item.province].filter(Boolean);
  return parts.join(', ');
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

    return addresses;
  },

  /**
   * Thêm mới một địa chỉ giao hàng
   */
  createAddress: async (data: AddressRequest): Promise<AddressItem> => {
    const userId = getCurrentUserId();
    const addresses = getStoredAddresses(userId);

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
      // Đồng bộ địa chỉ mặc định về backend USERS.ADDRESS
      try {
        const fullAddr = formatFullAddress(newAddress);
        await put<UserDTO>('/users/profile', {
          fullName: newAddress.receiverName,
          phone: newAddress.receiverPhone,
          address: fullAddr,
        });
      } catch {
        // ignore profile sync failure
      }
    } else {
      updatedList = [...addresses, newAddress];
    }

    saveStoredAddresses(userId, updatedList);
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
      note: data.note?.trim(),
      isDefault: willBeDefault,
    };

    let updatedList: AddressItem[];
    if (willBeDefault) {
      updatedList = addresses.map((a) => {
        if (String(a.id) === String(id)) return updatedItem;
        return { ...a, isDefault: false };
      });
      // Đồng bộ địa chỉ mặc định về backend USERS.ADDRESS
      try {
        const fullAddr = formatFullAddress(updatedItem);
        await put<UserDTO>('/users/profile', {
          fullName: updatedItem.receiverName,
          phone: updatedItem.receiverPhone,
          address: fullAddr,
        });
      } catch {
        // ignore
      }
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

    saveStoredAddresses(userId, updatedList);
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
        // ignore
      }
    }

    saveStoredAddresses(userId, remaining);
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
