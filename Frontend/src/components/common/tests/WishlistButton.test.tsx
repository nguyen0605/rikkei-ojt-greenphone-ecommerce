import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import WishlistButton from '../WishlistButton';
import rootReducer from '@/store/rootReducer';
import { addToWishlist } from '@/store/slices/wishlistSlice';
import { wishlistApi } from '@/api/wishlistApi';

const mockNavigate = vi.fn();
const mockMessageWarning = vi.fn();
const mockMessageSuccess = vi.fn();
const mockMessageInfo = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  const MockApp = ({ children }: { children: React.ReactNode }) => children;
  MockApp.useApp = () => ({
    message: {
      warning: mockMessageWarning,
      success: mockMessageSuccess,
      info: mockMessageInfo,
      error: vi.fn(),
    },
  });
  return {
    ...actual,
    App: MockApp,
  };
});

vi.mock('@/api/wishlistApi', () => ({
  wishlistApi: {
    getWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    syncWishlist: vi.fn(),
  },
}));

interface RenderOptions {
  preloadedWishlist?: Array<{ productId: string; addedAt: string }>;
  isAuthenticated?: boolean;
  initialPath?: string;
}

function renderWithStore(
  ui: React.ReactElement,
  {
    preloadedWishlist = [],
    isAuthenticated = false,
    initialPath = '/san-pham/iphone-16',
  }: RenderOptions = {}
) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        user: isAuthenticated ? ({ id: 1, email: 'user@greenphone.com', fullName: 'Test User' } as any) : null,
        token: isAuthenticated ? 'mock-jwt-token' : null,
        isAuthenticated,
        loading: false,
        error: null,
        errorCode: null,
        rememberedEmail: null,
      },
    },
  });

  preloadedWishlist.forEach((item) => {
    store.dispatch(addToWishlist(item));
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[initialPath]}>
          {ui}
        </MemoryRouter>
      </Provider>
    ),
  };
}

describe('WishlistButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Khách vãng lai (Chưa đăng nhập)', () => {
    it('hiển thị icon tim xám rỗng và không kích hoạt trạng thái yêu thích dù có item trong store', () => {
      renderWithStore(<WishlistButton productId="1" name="iPhone 16 Pro Max" />, {
        isAuthenticated: false,
        preloadedWishlist: [{ productId: '1', addedAt: new Date().toISOString() }],
      });

      const button = screen.getByRole('button', { name: /thêm vào danh sách yêu thích/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveClass('text-red-500');
    });

    it('khi bấm vào tim: chặn lại ngay lập tức, không đổi state, hiển thị thông báo và chuyển hướng sang /dang-nhap', () => {
      const parentClick = vi.fn();
      const { store } = renderWithStore(
        <div onClick={parentClick}>
          <WishlistButton productId="1" name="iPhone 16 Pro Max" price={30000000} />
        </div>,
        { isAuthenticated: false, initialPath: '/san-pham/1' }
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(parentClick).not.toHaveBeenCalled();
      expect(wishlistApi.addToWishlist).not.toHaveBeenCalled();
      expect(store.getState().wishlist.items).toHaveLength(0);
      expect(mockMessageWarning).toHaveBeenCalledWith(
        'Vui lòng đăng nhập để lưu sản phẩm vào danh sách yêu thích'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/dang-nhap', {
        state: { from: '/san-pham/1', redirect: '/san-pham/1' },
      });
    });
  });

  describe('Người dùng đã xác thực (Đã đăng nhập)', () => {
    it('hiển thị tim đỏ khi sản phẩm đã nằm trong danh sách yêu thích của tài khoản', () => {
      renderWithStore(<WishlistButton productId="1" name="iPhone 16 Pro Max" />, {
        isAuthenticated: true,
        preloadedWishlist: [{ productId: '1', addedAt: new Date().toISOString() }],
      });

      const button = screen.getByRole('button', { name: /xóa khỏi danh sách yêu thích/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('text-red-500');
    });

    it('thêm sản phẩm vào danh sách yêu thích khi bấm vào tim xám', async () => {
      vi.mocked(wishlistApi.addToWishlist).mockResolvedValueOnce(undefined);

      const { store } = renderWithStore(
        <WishlistButton productId="1" name="iPhone 16 Pro Max" price={30000000} />,
        { isAuthenticated: true }
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(store.getState().wishlist.items).toHaveLength(1);
      });
      expect(store.getState().wishlist.items[0].productId).toBe('1');
      expect(wishlistApi.addToWishlist).toHaveBeenCalledWith('1');
    });

    it('xóa sản phẩm khỏi danh sách yêu thích khi bấm lại vào tim đỏ', async () => {
      vi.mocked(wishlistApi.removeFromWishlist).mockResolvedValueOnce(undefined);

      const { store } = renderWithStore(
        <WishlistButton productId="1" name="iPhone 16 Pro Max" />,
        {
          isAuthenticated: true,
          preloadedWishlist: [{ productId: '1', addedAt: new Date().toISOString() }],
        }
      );

      const button = screen.getByRole('button', { name: /xóa khỏi danh sách yêu thích/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(store.getState().wishlist.items).toHaveLength(0);
      });
      expect(wishlistApi.removeFromWishlist).toHaveBeenCalledWith('1');
    });

    it('hiển thị nhãn văn bản khi showText = true', () => {
      renderWithStore(
        <WishlistButton productId="2" showText textWhenInactive="Yêu thích" />,
        { isAuthenticated: true }
      );

      expect(screen.getByText('Yêu thích')).toBeInTheDocument();
    });
  });
});
