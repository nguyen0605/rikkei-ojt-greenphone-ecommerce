import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MobileNavDrawer from '../MobileNavDrawer';
import Header from '../Header';
import authReducer from '@/store/slices/authSlice';
import cartReducer from '@/store/slices/cartSlice';
import wishlistReducer from '@/store/slices/wishlistSlice';
import checkoutReducer from '@/store/slices/checkoutSlice';
import filterReducer from '@/store/slices/filterSlice';

function renderHeader(isAuthenticated: boolean = false, role: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER') {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
      wishlist: wishlistReducer,
      checkout: checkoutReducer,
      filter: filterReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated,
        user: isAuthenticated
          ? { id: 1, email: 'nguyenvana@gmail.com', fullName: 'Nguyễn Văn A', role }
          : null,
        token: isAuthenticated ? 'dummy-token' : null,
        loading: false,
        error: null,
        errorCode: null,
        rememberedEmail: null,
      },
      cart: {
        items: [],
        total: 0,
        appliedVoucher: null,
        shippingFee: 0,
        syncStatus: 'idle',
        syncError: null,
      },
      wishlist: {
        items: [],
        previousItems: [],
        loading: false,
        error: null,
      },
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('MobileNavDrawer & Header Hamburger Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị nút Hamburger Menu trên mobile và mở Drawer khi người dùng bấm vào', () => {
    renderHeader(false);

    const hamburgerBtn = screen.getByTestId('mobile-menu-button');
    expect(hamburgerBtn).toBeInTheDocument();
    expect(hamburgerBtn).toHaveAttribute('aria-label', 'Mở menu điều hướng');

    fireEvent.click(hamburgerBtn);

    // Kiểm tra Drawer mở ra và hiển thị đầy đủ danh mục chính
    expect(screen.getAllByText('Trang chủ').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sản phẩm').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('So sánh').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Khuyến mãi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tra cứu bảo hành').length).toBeGreaterThanOrEqual(1);
  });

  it('hiển thị nút Đăng nhập và Đăng ký khi người dùng chưa đăng nhập', () => {
    renderHeader(false);

    const hamburgerBtn = screen.getByTestId('mobile-menu-button');
    fireEvent.click(hamburgerBtn);

    expect(screen.getByText('Đăng nhập để nhận ưu đãi và đồng bộ đơn hàng')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Đăng nhập/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: /Đăng ký/i })).toBeInTheDocument();
  });

  it('hiển thị họ tên, email và danh sách menu tài khoản khi người dùng đã đăng nhập', () => {
    renderHeader(true, 'CUSTOMER');

    const hamburgerBtn = screen.getByTestId('mobile-menu-button');
    fireEvent.click(hamburgerBtn);

    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('nguyenvana@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Tài khoản của tôi')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng của tôi')).toBeInTheDocument();
    expect(screen.getByText('Sản phẩm yêu thích')).toBeInTheDocument();
    expect(screen.getByText('Đánh giá sản phẩm')).toBeInTheDocument();
    expect(screen.getByText('Đăng xuất')).toBeInTheDocument();
  });

  it('hiển thị mục Quản trị viên khi người dùng có role ADMIN', () => {
    renderHeader(true, 'ADMIN');

    const hamburgerBtn = screen.getByTestId('mobile-menu-button');
    fireEvent.click(hamburgerBtn);

    expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('đóng Drawer khi người dùng bấm vào nút đóng (X)', () => {
    const onClose = vi.fn();
    const store = configureStore({
      reducer: {
        auth: authReducer,
        cart: cartReducer,
        wishlist: wishlistReducer,
        checkout: checkoutReducer,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <MobileNavDrawer open={true} onClose={onClose} />
        </MemoryRouter>
      </Provider>
    );

    const closeBtn = screen.getByLabelText('Đóng menu');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
