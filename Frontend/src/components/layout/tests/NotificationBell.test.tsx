import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import NotificationBell from '../NotificationBell';
import { notificationService } from '@/services/notificationService';
import authReducer from '@/store/slices/authSlice';
import cartReducer from '@/store/slices/cartSlice';

vi.mock('@/services/notificationService', () => ({
  notificationService: {
    getUnreadCount: vi.fn(),
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

function renderNotificationBell(isAuthenticated: boolean = true) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated,
        user: isAuthenticated
          ? { id: 1, email: 'test@example.com', fullName: 'Nguyen Van A', role: 'CUSTOMER' }
          : null,
        token: isAuthenticated ? 'dummy-token' : null,
        loading: false,
        error: null,
        errorCode: null,
        rememberedEmail: null,
      },
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </Provider>
  );
}

describe('NotificationBell Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('không hiển thị chuông khi người dùng chưa đăng nhập', () => {
    renderNotificationBell(false);
    expect(screen.queryByRole('button', { name: /thông báo/i })).not.toBeInTheDocument();
  });

  it('hiển thị chuông và huy hiệu đếm chưa đọc khi đã đăng nhập', async () => {
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3);

    renderNotificationBell(true);

    const bellBtn = await screen.findByRole('button', { name: /thông báo/i });
    expect(bellBtn).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('đáp ứng tiêu chuẩn Accessibility vùng chạm tối thiểu 44x44px trên mobile', async () => {
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);

    renderNotificationBell(true);

    const bellBtn = await screen.findByRole('button', { name: /thông báo/i });
    expect(bellBtn.className).toContain('min-h-[44px]');
    expect(bellBtn.className).toContain('min-w-[44px]');
  });

  it('mở dropdown hiển thị danh sách 5 thông báo gần nhất khi bấm chuông', async () => {
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(2);
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      content: [
        {
          id: 1,
          userId: 1,
          title: 'Đơn hàng #101 đã xác nhận',
          content: 'Đơn hàng của bạn đang được đóng gói',
          type: 'ORDER',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      page: 0,
      size: 5,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });

    renderNotificationBell(true);

    const bellBtn = await screen.findByRole('button', { name: /thông báo/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Đơn hàng #101 đã xác nhận')).toBeInTheDocument();
      expect(screen.getByText('Đơn hàng của bạn đang được đóng gói')).toBeInTheDocument();
      expect(screen.getByText('Xem tất cả thông báo')).toBeInTheDocument();
    });
  });
});
