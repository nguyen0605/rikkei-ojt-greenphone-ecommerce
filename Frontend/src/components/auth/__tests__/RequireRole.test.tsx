import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, afterEach, vi } from 'vitest';
import RequireRole from '../RequireRole';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';

function renderWithRole(role: string, allowedRoles: string[]) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        token: 'mock-token',
        refreshToken: 'mock-refresh',
        user: {
          id: 1,
          fullName: 'Test User',
          email: 'test@gp.vn',
          phone: '0900000000',
          role: role,
        },
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
        <RequireRole allowedRoles={allowedRoles}>
          <div data-testid="protected-content">Nội dung bảo mật</div>
        </RequireRole>
      </MemoryRouter>
    </Provider>
  );
}

describe('RequireRole Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Cho phép truy cập khi vai trò người dùng nằm trong danh sách cho phép', () => {
    renderWithRole('ROLE_ADMIN', ['ROLE_ADMIN']);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Nội dung bảo mật')).toBeInTheDocument();
  });

  it('Cho phép truy cập ngay cả khi vai trò trong Redux không có tiền tố ROLE_ (ví dụ ADMIN khớp ROLE_ADMIN)', () => {
    renderWithRole('ADMIN', ['ROLE_ADMIN']);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Nội dung bảo mật')).toBeInTheDocument();
  });

  it('Hiển thị thông báo 403 khi vai trò người dùng không có quyền truy cập', () => {
    renderWithRole('ROLE_SALES', ['ROLE_ADMIN']);
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument();
  });
});
