import { get, put } from './api';
import type { PageResponse } from '@/types/api';
import type { NotificationItem, NotificationFilterParams } from '@/types/notification';

/**
 * Service API quan ly thong bao nguoi dung
 */
export const notificationService = {
  /**
   * Lay danh sach thong bao cua nguoi dung (co phan trang va bo loc)
   */
  getNotifications: (params?: NotificationFilterParams) => {
    return get<PageResponse<NotificationItem>>('/v1/notifications', { params });
  },

  /**
   * Lay so luong thong bao chua doc
   */
  getUnreadCount: () => {
    return get<number>('/v1/notifications/unread-count');
  },

  /**
   * Danh dau mot thong bao la da doc
   */
  markAsRead: (id: number) => {
    return put<NotificationItem>(`/v1/notifications/${id}/read`);
  },

  /**
   * Danh dau tat ca thong bao la da doc
   */
  markAllAsRead: () => {
    return put<void>('/v1/notifications/read-all');
  },
};
