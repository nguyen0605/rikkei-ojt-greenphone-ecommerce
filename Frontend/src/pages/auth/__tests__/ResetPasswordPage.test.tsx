import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import { authService } from '@/services/authService';

vi.mock('@/services/authService', () => ({
  authService: {
    resetPassword: vi.fn(),
    resendOTP: vi.fn(),
  },
}));

vi.mock('@/pages/auth/AuthLayout', () => ({
  useAuthLayout: () => ({
    setConfig: vi.fn(),
  }),
}));

function renderResetPasswordPage(initialEntries = ['/dat-lai-mat-khau?email=test%40example.com']) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        errorCode: null,
        rememberedEmail: null,
      },
    },
  });

  const utils = render(
    <Provider store={store}>
      <App>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/dat-lai-mat-khau" element={<ResetPasswordPage />} />
            <Route path="/" element={<div data-testid="home-page">Trang Chủ</div>} />
            <Route path="/dang-nhap" element={<div data-testid="login-page">Đăng Nhập</div>} />
          </Routes>
        </MemoryRouter>
      </App>
    </Provider>
  );

  return { store, ...utils };
}

describe('ResetPasswordPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all form elements with initial email from query params and 6 OTP pin inputs', () => {
    renderResetPasswordPage(['/dat-lai-mat-khau?email=user%40greenphone.vn']);

    expect(screen.getByText('Đặt lại mật khẩu')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('example@gmail.com')).toHaveValue('user@greenphone.vn');
    expect(screen.getByText(/Mã xác thực OTP/i)).toBeInTheDocument();

    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`otp-input-${i}`)).toBeInTheDocument();
    }

    expect(screen.getByPlaceholderText('Tối thiểu 6 ký tự')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập lại mật khẩu mới')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đặt lại mật khẩu & Đăng nhập/i })).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form or missing OTP', async () => {
    const user = userEvent.setup();
    renderResetPasswordPage(['/dat-lai-mat-khau']);

    const submitBtn = screen.getByRole('button', { name: /Đặt lại mật khẩu & Đăng nhập/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập email')).toBeInTheDocument();
      expect(screen.getByText('Vui lòng nhập đủ 6 chữ số mã OTP')).toBeInTheDocument();
      expect(screen.getByText('Vui lòng nhập mật khẩu mới')).toBeInTheDocument();
    });
  });

  it('shows error when confirm password does not match new password', async () => {
    const user = userEvent.setup();
    renderResetPasswordPage(['/dat-lai-mat-khau?email=test%40example.com']);

    // Type 6 digits into OTP inputs
    for (let i = 0; i < 6; i++) {
      await user.type(screen.getByTestId(`otp-input-${i}`), String(i + 1));
    }

    const newPassInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự');
    const confirmPassInput = screen.getByPlaceholderText('Nhập lại mật khẩu mới');

    await user.type(newPassInput, 'GreenPhone@2026');
    await user.type(confirmPassInput, 'DifferentPassword');

    const submitBtn = screen.getByRole('button', { name: /Đặt lại mật khẩu & Đăng nhập/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
    });
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('triggers resend OTP successfully with cooldown timer', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.resendOTP).mockResolvedValueOnce(undefined as unknown as void);

    renderResetPasswordPage(['/dat-lai-mat-khau?email=test%40example.com']);

    const resendBtn = screen.getByRole('button', { name: /Gửi lại mã/i });
    await user.click(resendBtn);

    await waitFor(() => {
      expect(authService.resendOTP).toHaveBeenCalledWith('test@example.com');
      expect(screen.getByRole('button', { name: /Gửi lại sau/i })).toBeDisabled();
    });
  });

  it('handles successful password reset and auto-logs in user to Redux and Home page', async () => {
    const user = userEvent.setup();
    const mockAuthResponse = {
      userId: 10,
      email: 'test@example.com',
      fullName: 'Khách Hàng GreenPhone',
      role: 'CUSTOMER',
      token: 'jwt-access-token-12345',
      refreshToken: 'refresh-token-xyz',
      expiresIn: 86400000,
    };

    vi.mocked(authService.resetPassword).mockResolvedValueOnce(mockAuthResponse);

    const { store } = renderResetPasswordPage(['/dat-lai-mat-khau?email=test%40example.com']);

    // Type 6 digits into OTP inputs
    const code = '654321';
    for (let i = 0; i < 6; i++) {
      await user.type(screen.getByTestId(`otp-input-${i}`), code[i]);
    }

    const newPassInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự');
    const confirmPassInput = screen.getByPlaceholderText('Nhập lại mật khẩu mới');

    await user.type(newPassInput, 'GreenPhone@2026');
    await user.type(confirmPassInput, 'GreenPhone@2026');

    const submitBtn = screen.getByRole('button', { name: /Đặt lại mật khẩu & Đăng nhập/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(authService.resetPassword).toHaveBeenCalledWith('test@example.com', '654321', 'GreenPhone@2026');
    });

    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(store.getState().auth.token).toBe('jwt-access-token-12345');
      expect(store.getState().auth.user?.email).toBe('test@example.com');
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
  });

  it('displays error alert when reset password API fails with invalid OTP', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.resetPassword).mockRejectedValueOnce(new Error('Mã OTP không chính xác hoặc đã hết hạn'));

    renderResetPasswordPage(['/dat-lai-mat-khau?email=test%40example.com']);

    // Type 6 digits
    for (let i = 0; i < 6; i++) {
      await user.type(screen.getByTestId(`otp-input-${i}`), '0');
    }

    const newPassInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự');
    const confirmPassInput = screen.getByPlaceholderText('Nhập lại mật khẩu mới');

    await user.type(newPassInput, 'GreenPhone@2026');
    await user.type(confirmPassInput, 'GreenPhone@2026');

    const submitBtn = screen.getByRole('button', { name: /Đặt lại mật khẩu & Đăng nhập/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Mã OTP không chính xác hoặc đã hết hạn')).toBeInTheDocument();
    });
  });
});
