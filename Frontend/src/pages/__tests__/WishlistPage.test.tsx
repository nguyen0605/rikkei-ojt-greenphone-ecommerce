import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { App } from 'antd';
import WishlistPage from '../customer/WishlistPage';
import rootReducer from '@/store/rootReducer';
import { addToWishlist } from '@/store/slices/wishlistSlice';
import { phoneService } from '@/services';

vi.mock('@/services', () => ({
  phoneService: {
    detail: vi.fn(),
  },
  cartService: {
    addItem: vi.fn(),
  },
}));

function renderWishlistPage(preloadedItems: any[] = []) {
  const store = configureStore({
    reducer: rootReducer,
  });

  preloadedItems.forEach((item) => {
    store.dispatch(addToWishlist(item));
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <App>
          <MemoryRouter>
            <WishlistPage />
          </MemoryRouter>
        </App>
      </Provider>
    ),
  };
}

describe('WishlistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no items in wishlist', () => {
    renderWishlistPage([]);

    expect(screen.getByText(/danh sách yêu thích của bạn đang trống/i)).toBeInTheDocument();
    const exploreBtn = screen.getByRole('link', { name: /khám phá điện thoại ngay/i });
    expect(exploreBtn).toBeInTheDocument();
    expect(exploreBtn).toHaveAttribute('href', '/san-pham');
  });

  it('renders wishlist products when items exist in store', () => {
    renderWishlistPage([
      {
        productId: '1',
        name: 'iPhone 16 Pro Max',
        price: 32990000,
        originalPrice: 34990000,
        imageUrl: 'https://example.com/iphone16.png',
        brandName: 'Apple',
        inStock: true,
      },
    ]);

    expect(screen.getByText('iPhone 16 Pro Max')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText(/32\.990\.000/)).toBeInTheDocument();
    expect(screen.getByText('Còn hàng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thêm nhanh vào giỏ/i })).toBeInTheDocument();
  });

  it('removes item from wishlist when clicking trash button', () => {
    const { store } = renderWishlistPage([
      {
        productId: '1',
        name: 'iPhone 16 Pro Max',
        price: 32990000,
      },
    ]);

    expect(screen.getByText('iPhone 16 Pro Max')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /xóa khỏi danh sách yêu thích/i });
    fireEvent.click(deleteBtn);

    expect(store.getState().wishlist.items).toHaveLength(0);
    expect(screen.getByText(/danh sách yêu thích của bạn đang trống/i)).toBeInTheDocument();
  });

  it('adds item to cart when clicking Thêm nhanh vào giỏ', async () => {
    vi.mocked(phoneService.detail).mockResolvedValueOnce({
      id: 1,
      name: 'iPhone 16 Pro Max',
      brandName: 'Apple',
      variants: [
        {
          id: 10,
          color: 'Titan Tự Nhiên',
          storage: '256GB',
          price: 34990000,
          discountPrice: 32990000,
          stockQuantity: 5,
        },
      ],
    } as any);

    const { store } = renderWishlistPage([
      {
        productId: '1',
        name: 'iPhone 16 Pro Max',
        price: 32990000,
        inStock: true,
      },
    ]);

    const addBtn = screen.getByRole('button', { name: /thêm nhanh vào giỏ/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(phoneService.detail).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(store.getState().cart.items).toHaveLength(1);
      expect(store.getState().cart.items[0].variantId).toBe(10);
    });
  });
});

