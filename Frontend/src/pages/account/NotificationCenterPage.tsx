import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton, Modal, message, Pagination } from 'antd';
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  ShieldCheck,
  Tag,
  Info,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import type { NotificationItem, NotificationType } from '@/types/notification';

type FilterCategory = 'ALL' | NotificationType;

const CATEGORIES: { key: FilterCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'ALL', label: 'Tất cả', icon: <Bell className="h-4 w-4" /> },
  { key: 'ORDER', label: 'Đơn hàng', icon: <ShoppingBag className="h-4 w-4 text-blue-500" /> },
  { key: 'WARRANTY', label: 'Bảo hành', icon: <ShieldCheck className="h-4 w-4 text-amber-500" /> },
  { key: 'PROMOTION', label: 'Khuyến mãi', icon: <Tag className="h-4 w-4 text-rose-500" /> },
  { key: 'SYSTEM', label: 'Hệ thống', icon: <Info className="h-4 w-4 text-emerald-500" /> },
];

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

function getCategoryBadge(type: NotificationType) {
  switch (type) {
    case 'ORDER':
      return {
        label: 'Đơn hàng',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: <ShoppingBag className="h-4 w-4 text-blue-600" />,
      };
    case 'WARRANTY':
      return {
        label: 'Bảo hành',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <ShieldCheck className="h-4 w-4 text-amber-600" />,
      };
    case 'PROMOTION':
      return {
        label: 'Khuyến mãi',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: <Tag className="h-4 w-4 text-rose-600" />,
      };
    case 'SYSTEM':
    default:
      return {
        label: 'Hệ thống',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <Info className="h-4 w-4 text-emerald-600" />,
      };
  }
}

export default function NotificationCenterPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<FilterCategory>('ALL');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = activeTab === 'ALL' ? undefined : activeTab;
      const res = await notificationService.getNotifications({
        page: page - 1,
        size: pageSize,
        type: typeParam,
      });

      if (res?.content) {
        setNotifications(res.content);
        setTotalElements(res.totalElements ?? 0);
      } else {
        setNotifications([]);
        setTotalElements(0);
      }
    } catch {
      message.error('Không thể tải danh sách thông báo. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleTabChange = (key: FilterCategory) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await notificationService.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      } catch {
        // Continue even if marking as read fails
      }
    }

    if (item.redirectUrl) {
      navigate(item.redirectUrl);
    }
  };

  const handleConfirmMarkAllAsRead = () => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    if (unreadCount === 0 && totalElements === 0) {
      message.info('Bạn không có thông báo chưa đọc nào.');
      return;
    }

    Modal.confirm({
      title: 'Đánh dấu tất cả là đã đọc?',
      content: 'Toàn bộ thông báo trong hòm thư của bạn sẽ được chuyển sang trạng thái đã đọc.',
      okText: 'Đồng ý',
      cancelText: 'Hủy',
      okButtonProps: { className: 'bg-green-600 hover:bg-green-700' },
      onOk: async () => {
        setMarkingAll(true);
        try {
          await notificationService.markAllAsRead();
          message.success('Đã đánh dấu tất cả thông báo là đã đọc');
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch {
          message.error('Có lỗi xảy ra khi cập nhật thông báo');
        } finally {
          setMarkingAll(false);
        }
      },
    });
  };

  const unreadCountInCurrentView = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex-1 space-y-6">
      {/* Page header card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-green-600" />
              <span>Trung tâm thông báo</span>
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Cập nhật thông tin đơn hàng, bảo hành điện tử và các chương trình ưu đãi mới nhất
            </p>
          </div>

          <button
            onClick={handleConfirmMarkAllAsRead}
            disabled={markingAll || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-green-600 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4 text-green-600" />
            <span>{markingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}</span>
          </button>
        </div>

        {/* Category filter tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {CATEGORIES.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-green-600 text-white shadow-sm shadow-green-200'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={isActive ? 'text-white' : ''}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <Skeleton active avatar paragraph={{ rows: 2 }} />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-14 px-4 text-center shadow-sm">
            <div className="rounded-full bg-green-50 p-4 text-green-600 mb-3">
              <Bell className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">Không có thông báo nào</h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              {activeTab === 'ALL'
                ? 'Hòm thư của bạn hiện đang trống. Mọi thông báo quan trọng sẽ được lưu trữ tại đây.'
                : 'Chưa có thông báo nào trong danh mục này.'}
            </p>
          </div>
        ) : (
          notifications.map((item) => {
            const badge = getCategoryBadge(item.type);
            return (
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
                className={`group relative flex flex-col sm:flex-row sm:items-start gap-4 rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer text-left hover:shadow-md ${
                  !item.isRead
                    ? 'border-green-200 bg-gradient-to-r from-green-50/40 via-white to-white'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                {/* Type Icon */}
                <div className="hidden sm:flex shrink-0 mt-0.5 rounded-2xl bg-white p-3 shadow-sm border border-gray-100">
                  {badge.icon}
                </div>

                {/* Content body */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${badge.badgeClass}`}
                      >
                        {badge.label}
                      </span>
                      <h4
                        className={`text-sm sm:text-base line-clamp-1 ${
                          !item.isRead
                            ? 'font-bold text-gray-900'
                            : 'font-semibold text-gray-700'
                        }`}
                      >
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </span>
                      {!item.isRead && (
                        <span
                          className="h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white shadow-sm"
                          title="Chưa đọc"
                        />
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-3">
                    {item.content}
                  </p>

                  {item.redirectUrl && (
                    <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-green-600 group-hover:text-green-700">
                      <span>Xem chi tiết</span>
                      <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && totalElements > pageSize && (
        <div className="flex justify-center pt-4">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={totalElements}
            onChange={(newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize);
            }}
            showSizeChanger
            pageSizeOptions={['10', '20', '50']}
          />
        </div>
      )}
    </div>
  );
}

