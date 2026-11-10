import { render, screen, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '../Header';
import rootReducer from '@/store/rootReducer';
import { addToWishlist, removeFromWishlist } from '@/store/slices/wishlistSlice';

vi.mock('@/api/wishlistApi', () => ({
  wishlistApi: {
    getWishlist: vi.fn().mockResolvedValue([]),
    addToWishlist: vi.fn().mockResolvedValue({}),
    removeFromWishlist: vi.fn().mockResolvedValue({}),
    syncWishlist: vi.fn().mockResolvedValue([]),
  },
  getWishlist: vi.fn().mockResolvedValue([]),
  addToWishlist: vi.fn().mockResolvedValue({}),
  removeFromWishlist: vi.fn().mockResolvedValue({}),
  syncWishlist: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/components/layout/BrandDropdown', () => ({
  default: () => <div data-testid="brand-dropdown">BrandDropdown</div>,
}));

vi.mock('@/components/layout/HeaderSearch', () => ({
  default: () => <div data-testid="header-search">HeaderSearch</div>,
}));

function createTestStore(initialState = {}) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: initialState,
  });
}

describe('Header component - Wishlist Badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders wishlist Heart icon with Badge count 0 initially', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      </Provider>
    );

    const wishlistLink = screen.getByLabelText('Yêu thích');
    expect(wishlistLink).toBeInTheDocument();
  });

  it('displays accurate Badge count when items are added and removed (Kịch bản bước a & c)', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      </Provider>
    );

    // Bước a: Khách chưa đăng nhập, thêm 2 mẫu điện thoại
    act(() => {
      store.dispatch(
        addToWishlist({
          phoneId: 'phone-1',
          name: 'iPhone 15',
          thumbnail: 'thumb1.jpg',
          price: 20000000,
        })
      );
      store.dispatch(
        addToWishlist({
          phoneId: 'phone-2',
          name: 'Samsung S24',
          thumbnail: 'thumb2.jpg',
          price: 22000000,
        })
      );
    });

    const wishlistLink = screen.getByLabelText('Yêu thích');
    expect(wishlistLink).toHaveTextContent('2');

    // Bước c: Bấm hủy yêu thích 1 sản phẩm -> Badge giảm xuống còn 1
    act(() => {
      store.dispatch(removeFromWishlist('phone-1'));
    });

    expect(wishlistLink).toHaveTextContent('1');

    // Đăng xuất -> Badge reset về 0 (data-show="false" và items rỗng)
    act(() => {
      store.dispatch({ type: 'auth/logout' });
    });

    expect(store.getState().wishlist.items).toHaveLength(0);
    const badge = wishlistLink.querySelector('.ant-badge-count');
    expect(badge?.getAttribute('data-show')).toBe('false');
  });
});

