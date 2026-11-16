import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import NotificationCenterPage from '../NotificationCenterPage';
import { notificationService } from '@/services/notificationService';

vi.mock('@/services/notificationService', () => ({
  notificationService: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

const mockNotifications = [
  {
    id: 1,
    userId: 1,
    title: 'Đơn hàng #101 đã xuất kho',
    content: 'Kiện hàng của bạn đang được giao tới địa chỉ',
    type: 'ORDER' as const,
    isRead: false,
    redirectUrl: '/tai-khoan/don-hang/101',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    userId: 1,
    title: 'Ưu đãi sinh nhật 20%',
    content: 'Mã voucher GREEN20 đã được nạp vào ví',
    type: 'PROMOTION' as const,
    isRead: true,
    redirectUrl: '/khuyen-mai',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

function renderPage() {
  return render(
    <App>
      <MemoryRouter>
        <NotificationCenterPage />
      </MemoryRouter>
    </App>
  );
}

describe('NotificationCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị tiêu đề trang và danh sách các tab bộ lọc', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      content: mockNotifications,
      page: 0,
      size: 10,
      totalElements: 2,
      totalPages: 1,
      last: true,
    });

    renderPage();

    expect(await screen.findByText('Trung tâm thông báo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^tất cả$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^đơn hàng$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^bảo hành$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^khuyến mãi$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^hệ thống$/i })).toBeInTheDocument();
  });

  it('hiển thị danh sách thông báo dạng thẻ đầy đủ thông tin', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      content: mockNotifications,
      page: 0,
      size: 10,
      totalElements: 2,
      totalPages: 1,
      last: true,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Đơn hàng #101 đã xuất kho')).toBeInTheDocument();
      expect(screen.getByText('Kiện hàng của bạn đang được giao tới địa chỉ')).toBeInTheDocument();
      expect(screen.getByText('Ưu đãi sinh nhật 20%')).toBeInTheDocument();
      expect(screen.getByText('Mã voucher GREEN20 đã được nạp vào ví')).toBeInTheDocument();
    });
  });

  it('hiển thị Empty State thân thiện khi danh sách thông báo rỗng', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      content: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Không có thông báo nào')).toBeInTheDocument();
    });
  });

  it('lọc thông báo theo danh mục khi bấm vào tab Đơn hàng', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      content: [mockNotifications[0]],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });

    renderPage();

    const orderTab = screen.getByRole('button', { name: /^đơn hàng$/i });
    fireEvent.click(orderTab);

    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ORDER',
        })
      );
    });
  });

  it('đánh dấu đã đọc khi bấm vào thẻ thông báo chưa đọc', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      content: mockNotifications,
      page: 0,
      size: 10,
      totalElements: 2,
      totalPages: 1,
      last: true,
    });
    vi.mocked(notificationService.markAsRead).mockResolvedValue({
      ...mockNotifications[0],
      isRead: true,
    });

    renderPage();

    const unreadItem = await screen.findByText('Đơn hàng #101 đã xuất kho');
    fireEvent.click(unreadItem);

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith(1);
    });
  });
});
