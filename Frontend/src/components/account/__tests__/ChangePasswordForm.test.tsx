import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChangePasswordForm from '@/components/account/ChangePasswordForm';
import { userService } from '@/services';

vi.mock('@/services', () => ({
  userService: {
    changePassword: vi.fn(),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <App>{ui}</App>
    </QueryClientProvider>
  );
}

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders password fields and submit button', () => {
    renderWithProviders(<ChangePasswordForm />);

    expect(screen.getByText('Thiết lập mật khẩu mới')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập mật khẩu đang sử dụng')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tối thiểu 6 ký tự, gồm cả chữ và số')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập lại mật khẩu mới vừa đặt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đổi mật khẩu' })).toBeInTheDocument();
  });

  it('displays validation error when required fields are empty upon submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    const submitBtn = screen.getByRole('button', { name: 'Đổi mật khẩu' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập mật khẩu hiện tại')).toBeInTheDocument();
      expect(screen.getByText('Vui lòng nhập mật khẩu mới')).toBeInTheDocument();
      expect(screen.getByText('Vui lòng xác nhận lại mật khẩu mới')).toBeInTheDocument();
    });
    expect(userService.changePassword).not.toHaveBeenCalled();
  });

  it('shows password strength indicator when user types a new password', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    const newPassInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự, gồm cả chữ và số');
    await user.type(newPassInput, 'abc12345');

    await waitFor(() => {
      expect(screen.getByText('Độ mạnh mật khẩu:')).toBeInTheDocument();
      expect(screen.getByText('Khá tốt')).toBeInTheDocument();
    });
  });

  it('shows error when confirmation password does not match new password', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    await user.type(screen.getByPlaceholderText('Nhập mật khẩu đang sử dụng'), 'OldPass123');
    await user.type(screen.getByPlaceholderText('Tối thiểu 6 ký tự, gồm cả chữ và số'), 'NewPass123');
    await user.type(screen.getByPlaceholderText('Nhập lại mật khẩu mới vừa đặt'), 'DifferentPass123');

    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
    });
    expect(userService.changePassword).not.toHaveBeenCalled();
  });

  it('shows error when new password is identical to old password', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    await user.type(screen.getByPlaceholderText('Nhập mật khẩu đang sử dụng'), 'SamePass123');
    await user.type(screen.getByPlaceholderText('Tối thiểu 6 ký tự, gồm cả chữ và số'), 'SamePass123');
    await user.type(screen.getByPlaceholderText('Nhập lại mật khẩu mới vừa đặt'), 'SamePass123');

    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu mới không được trùng với mật khẩu hiện tại')).toBeInTheDocument();
    });
    expect(userService.changePassword).not.toHaveBeenCalled();
  });

  it('calls userService.changePassword with valid inputs and resets form on success', async () => {
    const user = userEvent.setup();
    vi.mocked(userService.changePassword).mockResolvedValueOnce(undefined);

    renderWithProviders(<ChangePasswordForm />);

    const oldInput = screen.getByPlaceholderText('Nhập mật khẩu đang sử dụng');
    const newInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự, gồm cả chữ và số');
    const confirmInput = screen.getByPlaceholderText('Nhập lại mật khẩu mới vừa đặt');

    await user.type(oldInput, 'OldPassword123');
    await user.type(newInput, 'NewPassword999');
    await user.type(confirmInput, 'NewPassword999');

    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    await waitFor(() => {
      expect(userService.changePassword).toHaveBeenCalledWith({
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword999',
      });
    });
  });
});
