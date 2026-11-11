import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { App } from 'antd';
import WishlistButton from '../WishlistButton';
import rootReducer from '@/store/rootReducer';
import { addToWishlist } from '@/store/slices/wishlistSlice';

function renderWithStore(ui: React.ReactElement, preloadedWishlist: Array<{ productId: string; addedAt: string }> = []) {
  const store = configureStore({
    reducer: rootReducer,
  });

  preloadedWishlist.forEach((item) => {
    store.dispatch(addToWishlist(item));
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <App>{ui}</App>
      </Provider>
    ),
  };
}

describe('WishlistButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders outline heart when item is not in wishlist', () => {
    renderWithStore(<WishlistButton productId="1" name="iPhone 16 Pro Max" />);

    const button = screen.getByRole('button', { name: /thêm vào danh sách yêu thích/i });
    expect(button).toBeInTheDocument();
  });

  it('adds item to wishlist and stops event propagation on click', () => {
    const parentClick = vi.fn();
    const { store } = renderWithStore(
      <div onClick={parentClick}>
        <WishlistButton productId="1" name="iPhone 16 Pro Max" price={30000000} />
      </div>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Parent handler must NOT be called (stopPropagation)
    expect(parentClick).not.toHaveBeenCalled();

    // Redux store should contain product
    const items = store.getState().wishlist.items;
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe('1');
    expect(items[0].name).toBe('iPhone 16 Pro Max');
  });

  it('removes item from wishlist when clicked if already in wishlist', () => {
    const { store } = renderWithStore(
      <WishlistButton productId="1" name="iPhone 16 Pro Max" />,
      [{ productId: '1', addedAt: new Date().toISOString() }]
    );

    const button = screen.getByRole('button', { name: /xóa khỏi danh sách yêu thích/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    const items = store.getState().wishlist.items;
    expect(items).toHaveLength(0);
  });

  it('displays text label when showText is true', () => {
    renderWithStore(<WishlistButton productId="2" showText textWhenInactive="Yêu thích" />);

    expect(screen.getByText('Yêu thích')).toBeInTheDocument();
  });
});

