import { get, del, post } from './api';
import type { DeviceSessionDTO } from '@/types/api';

/**
 * Service API quan ly thiet bi dang nhap nguoi dung (USR-16)
 */
export const deviceService = {
  /**
   * Lay danh sach cac phien thiet bi dang hoat dong
   */
  getDevices: () => {
    return get<DeviceSessionDTO[]>('/v1/account/devices');
  },

  /**
   * Thu hoi / Dang xuat mot phien thiet bi cu the
   */
  revokeDevice: (sessionId: number) => {
    return del<void>(`/v1/account/devices/${sessionId}`);
  },

  /**
   * Thu hoi / Dang xuat tat ca cac thiet bi khac (giu lai phien hien tai)
   */
  revokeOtherDevices: () => {
    return post<void>('/v1/account/devices/revoke-others');
  },
};
