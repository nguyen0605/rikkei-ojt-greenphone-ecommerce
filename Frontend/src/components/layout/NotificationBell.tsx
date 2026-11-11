import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Dropdown, Skeleton } from 'antd';
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  ShieldCheck,
  Tag,
  Info,
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import type { NotificationItem, NotificationType } from '@/types/notification';
import { useAppSelector } from '@/store/hooks';
import { ROUTES } from '@/routes/routePaths';

function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Vừa xong';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

function getNotificationTypeIcon(type: NotificationType) {
  switch (type) {
    case 'ORDER':
      return <ShoppingBag className="h-4 w-4 text-blue-500" />;
    case 'WARRANTY':
      return <ShieldCheck className="h-4 w-4 text-amber-500" />;
    case 'PROMOTION':
      return <Tag className="h-4 w-4 text-rose-500" />;
    case 'SYSTEM':
    default:
      return <Info className="h-4 w-4 text-emerald-500" />;
  }
}

export default function NotificationBell() {
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  const isMountedRef = useRef(true);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const count = await notificationService.getUnreadCount();
      if (isMountedRef.current && typeof count === 'number') {
        setUnreadCount(count);
      }
    } catch {
      // Ignore network errors on polling
    }
  }, [isAuthenticated]);

  // Fetch recent notifications for dropdown (top 5)
  const fetchRecent = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await notificationService.getNotifications({ page: 0, size: 5 });
      if (isMountedRef.current && res?.content) {
        setRecentNotifications(res.content);
      }
    } catch {
      // Ignore
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);

  // Polling unread count every 60s & refetch on tab focus
  useEffect(() => {
    isMountedRef.current = true;
    if (!isAuthenticated) {
      setUnreadCount(0);
      setRecentNotifications([]);
      return;
    }

    fetchUnreadCount();

    const intervalId = setInterval(() => {
      fetchUnreadCount();
    }, 60000); // 60s (tuân thủ quy tắc >= 45s)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  // When dropdown opens, load recent notifications
  const handleOpenChange = (open: boolean) => {
    setDropdownOpen(open);
    if (open) {
      fetchRecent();
      fetchUnreadCount();
    }
  };

  // Mark a single notification as read and redirect if URL exists
  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await notificationService.markAsRead(item.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      } catch {
        // Continue navigation even if mark as read fails
      }
    }

    setDropdownOpen(false);
    if (item.redirectUrl) {
      navigate(item.redirectUrl);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Ignore
    } finally {
      setMarkingAll(false);
    }
  };

  // If not authenticated, do not show bell
  if (!isAuthenticated) {
    return null;
  }

  const dropdownContent = (
    <div
      className="w-[340px] sm:w-[380px] rounded-2xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
      role="region"
      aria-label="Danh sách thông báo nhanh"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-gradient-to-r from-green-50/60 to-white">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">Thông báo</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
              {unreadCount} mới
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800 disabled:opacity-50 transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>{markingAll ? 'Đang xử lý...' : 'Đọc tất cả'}</span>
          </button>
        )}
      </div>

      {/* Content list / Skeleton */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
        {loading ? (
          <div className="p-4 space-y-4">
            <Skeleton active avatar paragraph={{ rows: 1 }} />
            <Skeleton active avatar paragraph={{ rows: 1 }} />
            <Skeleton active avatar paragraph={{ rows: 1 }} />
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="rounded-full bg-gray-100 p-3 mb-2 text-gray-400">
              <Bell className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-gray-600">Không có thông báo nào</p>
            <p className="text-xs text-gray-400 mt-0.5">Các thông báo mới về đơn hàng và ưu đãi sẽ xuất hiện ở đây</p>
          </div>
        ) : (
          recentNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleItemClick(item);
                }
              }}
              className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left hover:bg-gray-50 ${
                !item.isRead ? 'bg-green-50/40' : 'bg-white'
              }`}
            >
              {/* Type Icon */}
              <div className="shrink-0 mt-0.5 rounded-full bg-white p-2 shadow-sm border border-gray-100">
                {getNotificationTypeIcon(item.type)}
              </div>

              {/* Text content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-1">
                  <p
                    className={`text-xs line-clamp-1 ${
                      !item.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                    }`}
                  >
                    {item.title}
                  </p>
                  {!item.isRead && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-green-500 mt-1"
                      title="Chưa đọc"
                    />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {item.content}
                </p>
                <span className="mt-1 block text-[11px] text-gray-400">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-gray-50/70 p-2 text-center">
        <Link
          to={ROUTES.ACCOUNT_NOTIFICATIONS}
          onClick={() => setDropdownOpen(false)}
          className="block py-1.5 text-xs font-semibold text-green-700 hover:text-green-800 transition-colors"
        >
          Xem tất cả thông báo
        </Link>
      </div>
    </div>
  );

  return (
    <Dropdown
      open={dropdownOpen}
      onOpenChange={handleOpenChange}
      popupRender={() => dropdownContent}
      trigger={['click']}
      placement="bottomRight"
    >
      <button
        type="button"
        className="relative flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full p-2 text-gray-700 transition-colors hover:bg-green-50 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        aria-label="Thông báo"
        title="Thông báo của bạn"
      >
        <Badge
          count={unreadCount}
          overflowCount={99}
          size="small"
          offset={[-2, 2]}
          color="#ef4444"
        >
          <Bell className="h-5 w-5" />
        </Badge>
      </button>
    </Dropdown>
  );
}

