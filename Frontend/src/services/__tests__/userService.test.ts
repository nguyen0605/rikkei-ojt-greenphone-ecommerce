import { describe, it, expect, beforeEach, vi } from 'vitest';
import { userService, formatFullAddress } from '@/services/userService';
import * as api from '@/services/api';

vi.mock('@/services/api', () => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Profile Operations', () => {
    it('getProfile should call GET /users/profile', async () => {
      const mockUser = {
        id: 1,
        fullName: 'Nguyễn Văn A',
        email: 'user@example.com',
        phone: '0912345678',
        address: '123 Cầu Giấy, Hà Nội',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      };
      vi.mocked(api.get).mockResolvedValueOnce(mockUser);

      const result = await userService.getProfile();
      expect(api.get).toHaveBeenCalledWith('/users/profile');
      expect(result).toEqual(mockUser);
    });

    it('updateProfile should call PUT /users/profile with data', async () => {
      const updateData = {
        fullName: 'Nguyễn Văn B',
        phone: '0987654321',
        address: '456 Ba Đình, Hà Nội',
      };
      const mockResponse = { id: 1, email: 'user@example.com', role: 'CUSTOMER', status: 'ACTIVE', ...updateData };
      vi.mocked(api.put).mockResolvedValueOnce(mockResponse);

      const result = await userService.updateProfile(updateData);
      expect(api.put).toHaveBeenCalledWith('/users/profile', updateData);
      expect(result.fullName).toBe('Nguyễn Văn B');
    });

    it('changePassword should call PUT /users/change-password', async () => {
      vi.mocked(api.put).mockResolvedValueOnce(undefined);

      await userService.changePassword({
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      });

      expect(api.put).toHaveBeenCalledWith('/users/change-password', {
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      });
    });

    it('uploadAvatar should throw error for invalid MIME type', async () => {
      const textFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      await expect(userService.uploadAvatar(textFile)).rejects.toThrow('Định dạng file không hỗ trợ');
    });

    it('uploadAvatar should throw error for file larger than 2MB', async () => {
      // 3MB file
      const bigFile = new File([new ArrayBuffer(3 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
      await expect(userService.uploadAvatar(bigFile)).rejects.toThrow('Dung lượng ảnh vượt quá 2MB');
    });
  });

  describe('Address Book Operations', () => {
    it('formatFullAddress formats address parts correctly', () => {
      const formatted = formatFullAddress({
        streetAddress: '123 Đường Cầu Giấy',
        ward: 'Phường Dịch Vọng',
        district: 'Quận Cầu Giấy',
        province: 'Hà Nội',
      });
      expect(formatted).toBe('123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội');
    });

    it('createAddress sets first address as default and saves to storage', async () => {
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 10 }));

      const newAddr = await userService.createAddress({
        receiverName: 'Lê Văn C',
        receiverPhone: '0911223344',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng',
        streetAddress: 'Số 10 Duy Tân',
      });

      expect(newAddr.isDefault).toBe(true);
      expect(newAddr.receiverName).toBe('Lê Văn C');

      const list = await userService.getAddresses();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(newAddr.id);
      expect(list[0].isDefault).toBe(true);
    });

    it('creating second address with isDefault: true unsets default on first address', async () => {
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 10 }));

      const addr1 = await userService.createAddress({
        receiverName: 'Địa chỉ 1',
        receiverPhone: '0911111111',
        province: 'Hà Nội',
        streetAddress: 'Số 1 Phố A',
      });

      const addr2 = await userService.createAddress({
        receiverName: 'Địa chỉ 2',
        receiverPhone: '0922222222',
        province: 'TP. Hồ Chí Minh',
        streetAddress: 'Số 2 Phố B',
        isDefault: true,
      });

      const list = await userService.getAddresses();
      expect(list.length).toBe(2);

      const found1 = list.find((a) => a.id === addr1.id);
      const found2 = list.find((a) => a.id === addr2.id);

      expect(found1?.isDefault).toBe(false);
      expect(found2?.isDefault).toBe(true);
    });

    it('updateAddress updates fields properly', async () => {
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 10 }));

      const addr = await userService.createAddress({
        receiverName: 'Tên cũ',
        receiverPhone: '0911111111',
        province: 'Hà Nội',
        streetAddress: 'Địa chỉ cũ',
      });

      const updated = await userService.updateAddress(addr.id, {
        receiverName: 'Tên mới',
        receiverPhone: '0988888888',
        province: 'Hà Nội',
        streetAddress: 'Địa chỉ mới',
      });

      expect(updated.receiverName).toBe('Tên mới');
      expect(updated.receiverPhone).toBe('0988888888');

      const list = await userService.getAddresses();
      expect(list[0].receiverName).toBe('Tên mới');
    });

    it('deleteAddress prevents deleting default address when it is the only address', async () => {
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 10 }));

      const addr = await userService.createAddress({
        receiverName: 'Địa chỉ duy nhất',
        receiverPhone: '0911111111',
        province: 'Hà Nội',
        streetAddress: 'Số 1 Phố A',
      });

      await expect(userService.deleteAddress(addr.id)).rejects.toThrow(
        'Không thể xóa địa chỉ mặc định khi bạn chỉ có duy nhất một địa chỉ.'
      );

      const list = await userService.getAddresses();
      expect(list.length).toBe(1);
    });

    it('deleteAddress allows deleting non-default address', async () => {
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 10 }));

      const addr1 = await userService.createAddress({
        receiverName: 'Địa chỉ 1 (Default)',
        receiverPhone: '0911111111',
        province: 'Hà Nội',
        streetAddress: 'Số 1 Phố A',
      });

      const addr2 = await userService.createAddress({
        receiverName: 'Địa chỉ 2 (Thường)',
        receiverPhone: '0922222222',
        province: 'Hà Nội',
        streetAddress: 'Số 2 Phố B',
        isDefault: false,
      });

      await userService.deleteAddress(addr2.id);

      const list = await userService.getAddresses();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(addr1.id);
    });

    it('setDefaultAddress updates target to default and removes default from other', async () => {
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 10 }));

      const addr1 = await userService.createAddress({
        receiverName: 'Địa chỉ 1',
        receiverPhone: '0911111111',
        province: 'Hà Nội',
        streetAddress: 'Số 1',
      });

      const addr2 = await userService.createAddress({
        receiverName: 'Địa chỉ 2',
        receiverPhone: '0922222222',
        province: 'Hà Nội',
        streetAddress: 'Số 2',
        isDefault: false,
      });

      expect(addr1.isDefault).toBe(true);
      expect(addr2.isDefault).toBe(false);

      await userService.setDefaultAddress(addr2.id);

      const list = await userService.getAddresses();
      expect(list.find((a) => a.id === addr1.id)?.isDefault).toBe(false);
      expect(list.find((a) => a.id === addr2.id)?.isDefault).toBe(true);
    });

    it('createAddress rejects duplicate address for the same recipient', async () => {
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 10 }));

      await userService.createAddress({
        receiverName: 'Dương Phúc Thịnh',
        receiverPhone: '0827242427',
        province: 'TP. Hồ Chí Minh',
        streetAddress: 'Vinhomes Grand Park, Thủ Đức',
      });

      await expect(
        userService.createAddress({
          receiverName: 'Dương Phúc Thịnh',
          receiverPhone: '0827242427',
          province: 'TP. Hồ Chí Minh',
          streetAddress: 'Vinhomes Grand Park, Thủ Đức',
        })
      ).rejects.toThrow('Địa chỉ này đã tồn tại trong sổ địa chỉ của bạn.');
    });

    it('updateAddress rejects updating to an existing duplicate address', async () => {
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 10 }));

      await userService.createAddress({
        receiverName: 'Dương Phúc Thịnh',
        receiverPhone: '0827242427',
        province: 'TP. Hồ Chí Minh',
        streetAddress: 'Số 10 Lê Duẩn',
      });

      const addr2 = await userService.createAddress({
        receiverName: 'Dương Phúc Thịnh',
        receiverPhone: '0827242427',
        province: 'TP. Hồ Chí Minh',
        streetAddress: 'Số 99 Nguyễn Xiển',
      });

      await expect(
        userService.updateAddress(addr2.id, {
          receiverName: 'Dương Phúc Thịnh',
          receiverPhone: '0827242427',
          province: 'TP. Hồ Chí Minh',
          streetAddress: 'Số 10 Lê Duẩn',
        })
      ).rejects.toThrow('Địa chỉ này đã trùng với một địa chỉ khác trong sổ địa chỉ của bạn.');
    });

    it('getAddresses automatically deduplicates existing records and preserves pinned coordinates', async () => {
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 10 }));

      // Giả lập dữ liệu cũ bị trùng lặp trong localStorage
      const corrupted = [
        {
          id: 'addr_1',
          receiverName: 'Dương Phúc Thịnh',
          receiverPhone: '0827242427',
          province: 'TP. Hồ Chí Minh',
          streetAddress: 'Vinhomes Grand Park, Thủ Đức',
          isDefault: true,
        },
        {
          id: 'addr_2',
          receiverName: 'Dương Phúc Thịnh',
          receiverPhone: '0827242427',
          province: 'TP. Hồ Chí Minh',
          streetAddress: 'Vinhomes Grand Park, Thủ Đức',
          latitude: 10.84,
          longitude: 106.83,
          isDefault: false,
        },
      ];
      localStorage.setItem('greenphone.addresses.10', JSON.stringify(corrupted));

      const cleaned = await userService.getAddresses();
      expect(cleaned.length).toBe(1);
      expect(cleaned[0].latitude).toBe(10.84);
      expect(cleaned[0].longitude).toBe(106.83);
      expect(cleaned[0].isDefault).toBe(true);
    });

    it('isolates address book data between different user accounts', async () => {
      // User 1 lưu địa chỉ
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 101 }));
      await userService.createAddress({
        receiverName: 'User 101',
        receiverPhone: '0911111111',
        province: 'Hà Nội',
        streetAddress: '101 Cầu Giấy',
      });

      const listUser1 = await userService.getAddresses();
      expect(listUser1.length).toBe(1);
      expect(listUser1[0].receiverName).toBe('User 101');

      // User 2 đăng nhập -> Sổ địa chỉ phải rỗng và không bị lẫn với User 1
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 202 }));
      const listUser2 = await userService.getAddresses();
      expect(listUser2.length).toBe(0);

      // User 2 tạo địa chỉ riêng
      await userService.createAddress({
        receiverName: 'User 202',
        receiverPhone: '0922222222',
        province: 'TP. Hồ Chí Minh',
        streetAddress: '202 Lê Duẩn',
      });
      const listUser2After = await userService.getAddresses();
      expect(listUser2After.length).toBe(1);
      expect(listUser2After[0].receiverName).toBe('User 202');

      // Quay lại User 1 -> dữ liệu nguyên vẹn
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 101 }));
      const listUser1Again = await userService.getAddresses();
      expect(listUser1Again.length).toBe(1);
      expect(listUser1Again[0].receiverName).toBe('User 101');
    });

    it('preserves address locally even when backend PUT /users/profile fails', async () => {
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 303 }));
      vi.mocked(api.put).mockRejectedValueOnce(new Error('Network error or 500 Internal Server Error'));

      const newAddr = await userService.createAddress({
        receiverName: 'Khách Hàng A',
        receiverPhone: '0933333333',
        province: 'Đà Nẵng',
        streetAddress: '123 Nguyễn Văn Linh',
        isDefault: true,
      });

      expect(newAddr).toBeDefined();
      expect(newAddr.receiverName).toBe('Khách Hàng A');

      // Đảm bảo địa chỉ vẫn được lưu trong localStorage
      const addresses = await userService.getAddresses();
      expect(addresses.length).toBe(1);
      expect(addresses[0].streetAddress).toBe('123 Nguyễn Văn Linh');
    });

    it('safely filters out invalid or corrupted address entries in localStorage', async () => {
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 404 }));
      // Dữ liệu mảng chứa phần tử null/undefined hoặc thiếu trường bắt buộc
      const corruptedData = [
        null,
        {},
        { id: 'addr_invalid' },
        { id: 'addr_valid', streetAddress: '456 Phố Huế', receiverName: 'Nguyễn Văn B', receiverPhone: '0944444444', province: 'Hà Nội' },
      ];
      localStorage.setItem('greenphone.addresses.404', JSON.stringify(corruptedData));

      const addresses = await userService.getAddresses();
      expect(addresses.length).toBe(1);
      expect(addresses[0].id).toBe('addr_valid');
      expect(addresses[0].streetAddress).toBe('456 Phố Huế');
    });
  });
});
