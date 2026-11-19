import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import RegisterPage from '@/pages/auth/RegisterPage';

vi.mock('@/pages/auth/AuthLayout', () => ({
  useAuthLayout: () => ({
    setConfig: vi.fn(),
  }),
}));

function renderRegisterPage() {
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

  return render(
    <Provider store={store}>
      <App>
        <MemoryRouter initialEntries={['/dang-ky']}>
          <Routes>
            <Route path="/dang-ky" element={<RegisterPage />} />
          </Routes>
        </MemoryRouter>
      </App>
    </Provider>
  );
}

describe('RegisterPage Password Validation & Strength Note', () => {
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays both missing criteria error messages when typing a short password without letters/numbers', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    const passwordInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự, gồm cả chữ và số');
    await user.type(passwordInput, '.....');

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu tối thiểu 6 ký tự')).toBeInTheDocument();
      expect(screen.getByText('Mật khẩu cần chứa cả chữ cái và số')).toBeInTheDocument();
    });

    // Verify note/checklist is displayed like ChangePassword
    expect(screen.getByText('Độ mạnh mật khẩu:')).toBeInTheDocument();
    expect(screen.getByText('Tối thiểu 6 ký tự')).toBeInTheDocument();
    expect(screen.getByText('Bao gồm chữ và số')).toBeInTheDocument();
    expect(screen.getByText('Ký tự đặc biệt (tùy chọn)')).toBeInTheDocument();
  });

  it('displays only letter/number missing error when password length >= 6 but lacks digits or letters', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    const passwordInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự, gồm cả chữ và số');
    await user.type(passwordInput, 'abcdef');

    await waitFor(() => {
      expect(screen.queryByText('Mật khẩu tối thiểu 6 ký tự')).not.toBeInTheDocument();
      expect(screen.getByText('Mật khẩu cần chứa cả chữ cái và số')).toBeInTheDocument();
    });
  });

  it('clears validation errors when password satisfies both length and character requirements', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    const passwordInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự, gồm cả chữ và số');
    await user.type(passwordInput, 'ValidPass123');

    await waitFor(() => {
      expect(screen.queryByText('Mật khẩu tối thiểu 6 ký tự')).not.toBeInTheDocument();
      expect(screen.queryByText('Mật khẩu cần chứa cả chữ cái và số')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Độ mạnh mật khẩu:')).toBeInTheDocument();
  });
});
