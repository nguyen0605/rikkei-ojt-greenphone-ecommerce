export type NotificationType = 'ORDER' | 'WARRANTY' | 'PROMOTION' | 'SYSTEM';

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  content: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: string | null;
  redirectUrl?: string | null;
  metadataJson?: string | null;
  createdAt: string;
}

export interface NotificationFilterParams {
  page?: number;
  size?: number;
  isRead?: boolean;
  type?: NotificationType;
}
