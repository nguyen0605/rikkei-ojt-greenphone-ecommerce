import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import authReducer from '@/store/slices/authSlice';
import AccountProfilePage from '@/pages/account/AccountProfilePage';
import { userService, orderService, reviewService } from '@/services';

vi.mock('@/services', () => ({
  userService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
  },
  orderService: {
    list: vi.fn().mockResolvedValue({ content: [], totalElements: 0 }),
  },
  reviewService: {
    myReviews: vi.fn().mockResolvedValue({ content: [], totalElements: 0 }),
  },
}));

function renderPage(initialState = {}) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { id: 1, email: 'test@greenphone.vn', fullName: 'Khách Hàng Test', role: 'CUSTOMER' },
        token: 'fake-token',
        isAuthenticated: true,
        loading: false,
        error: null,
        rememberedEmail: null,
        ...initialState,
      },
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App>
              <AccountProfilePage />
            </App>
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    ),
  };
}

describe('AccountProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton while query is in progress', () => {
    vi.mocked(userService.getProfile).mockReturnValueOnce(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('status', { name: 'Đang tải dữ liệu' })).toBeInTheDocument();
  });

  it('renders profile data when query succeeds', async () => {
    const mockUser = {
      id: 1,
      fullName: 'Nguyễn Văn Test',
      email: 'test@greenphone.vn',
      phone: '0912345678',
      address: '123 Đường Cầu Giấy, Hà Nội',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    };
    vi.mocked(userService.getProfile).mockResolvedValueOnce(mockUser);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ cá nhân')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Nguyễn Văn Test')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@greenphone.vn')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0912345678')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123 Đường Cầu Giấy, Hà Nội')).toBeInTheDocument();
    });

    // Email field is disabled / readonly
    const emailInput = screen.getByDisplayValue('test@greenphone.vn');
    expect(emailInput).toBeDisabled();
  });

  it('validates required and format constraints on submit', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 1,
      fullName: 'Nguyễn Văn Test',
      email: 'test@greenphone.vn',
      phone: '0912345678',
      address: '',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    };
    vi.mocked(userService.getProfile).mockResolvedValueOnce(mockUser);

    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Nguyễn Văn Test')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Nguyễn Văn Test');
    const phoneInput = screen.getByDisplayValue('0912345678');

    await user.clear(nameInput);
    await user.type(nameInput, ' ');
    await user.clear(phoneInput);
    await user.type(phoneInput, '12345');

    const submitBtn = screen.getByRole('button', { name: 'Lưu thay đổi' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Họ tên phải có ít nhất 2 ký tự')).toBeInTheDocument();
      expect(screen.getByText('Số điện thoại không hợp lệ (10-11 chữ số, bắt đầu bằng số 0)')).toBeInTheDocument();
    });

    expect(userService.updateProfile).not.toHaveBeenCalled();
  });

  it('submits updated profile and updates Redux auth store', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 1,
      fullName: 'Nguyễn Văn A',
      email: 'test@greenphone.vn',
      phone: '0912345678',
      address: '123 Cầu Giấy',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    };
    vi.mocked(userService.getProfile).mockResolvedValueOnce(mockUser);
    vi.mocked(userService.updateProfile).mockResolvedValueOnce({
      ...mockUser,
      fullName: 'Nguyễn Văn VIP',
      phone: '0987654321',
      address: '456 Ba Đình',
    });

    const { store } = renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Nguyễn Văn A')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Nguyễn Văn A');
    const phoneInput = screen.getByDisplayValue('0912345678');
    const addressInput = screen.getByDisplayValue('123 Cầu Giấy');

    await user.clear(nameInput);
    await user.type(nameInput, 'Nguyễn Văn VIP');
    await user.clear(phoneInput);
    await user.type(phoneInput, '0987654321');
    await user.clear(addressInput);
    await user.type(addressInput, '456 Ba Đình');

    const submitBtn = screen.getByRole('button', { name: 'Lưu thay đổi' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(userService.updateProfile).toHaveBeenCalledWith({
        fullName: 'Nguyễn Văn VIP',
        phone: '0987654321',
        address: '456 Ba Đình',
      });
    });

    // Check store synchronization
    await waitFor(() => {
      expect(store.getState().auth.user?.fullName).toBe('Nguyễn Văn VIP');
      expect(store.getState().auth.user?.phone).toBe('0987654321');
    });
  });

  it('handles avatar file selection with instant preview and safe object URL', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 1,
      fullName: 'Nguyễn Văn A',
      email: 'test@greenphone.vn',
      phone: '0912345678',
      address: '',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    };
    vi.mocked(userService.getProfile).mockResolvedValueOnce(mockUser);

    // Mock createObjectURL & revokeObjectURL
    const fakeObjectUrl = 'blob:http://localhost/fake-avatar-uuid';
    const createObjectUrlMock = vi.fn().mockReturnValue(fakeObjectUrl);
    const revokeObjectUrlMock = vi.fn();
    window.URL.createObjectURL = createObjectUrlMock;
    window.URL.revokeObjectURL = revokeObjectUrlMock;

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText('Tải lên ảnh đại diện') as HTMLInputElement;
    const testFile = new File(['image content'], 'avatar.png', { type: 'image/png' });

    await user.upload(fileInput, testFile);

    expect(createObjectUrlMock).toHaveBeenCalledWith(testFile);
    expect(screen.getByText('Lưu ảnh đại diện')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeInTheDocument();

    // Cancel preview revokes URL
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(revokeObjectUrlMock).toHaveBeenCalledWith(fakeObjectUrl);
    expect(screen.queryByText('Lưu ảnh đại diện')).not.toBeInTheDocument();
  });
});
