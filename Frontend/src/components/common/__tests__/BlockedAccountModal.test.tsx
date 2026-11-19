import { cleanup, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import BlockedAccountModal from '../BlockedAccountModal';

function renderWithStore() {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { id: 10, email: 'user@example.com', fullName: 'Nguyen Van Test', role: 'ROLE_CUSTOMER' },
        token: 'active-token',
        isAuthenticated: true,
        loading: false,
        error: null,
        errorCode: null,
        rememberedEmail: null,
      },
    },
  });

  return render(
    <Provider store={store}>
      <BlockedAccountModal />
    </Provider>
  );
}

describe('BlockedAccountModal Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('không hiển thị khi chưa có sự kiện tài khoản bị khóa', () => {
    renderWithStore();
    expect(screen.queryByText('Thông báo khóa tài khoản')).not.toBeInTheDocument();
  });

  it('mở modal cố định hiển thị đúng lý do và thông tin hỗ trợ khi nhận sự kiện account-blocked', () => {
    renderWithStore();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('greenphone:account-blocked', {
          detail: {
            code: 'ACCOUNT_BLOCKED',
            message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.',
            reason: 'Phát hiện hành vi gian lận hoàn tiền VietQR và spam đơn hàng ảo.',
            supportEmail: 'hotro@greenphone.com',
            supportHotline: '1900 1234',
          },
        })
      );
    });

    expect(screen.getByText('Thông báo khóa tài khoản')).toBeInTheDocument();
    expect(
      screen.getByText('Phát hiện hành vi gian lận hoàn tiền VietQR và spam đơn hàng ảo.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Chúng tôi đã gửi thông báo chi tiết và hướng dẫn giải quyết tới email của bạn/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Về trang chủ/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Liên hệ hỗ trợ/i })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:hotro@greenphone.com')
    );
  });
});
