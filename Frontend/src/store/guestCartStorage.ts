import type { RootState } from './rootReducer';

const KEY = 'greenphone.guestCart';
type CartState = RootState['cart'];

export function readGuestCart(): CartState {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (Array.isArray(items) && items.every((item) => item && typeof item.id === 'string'
      && Number.isInteger(item.quantity) && item.quantity > 0 && item.product
      && typeof item.product.name === 'string' && Number.isFinite(item.product.price))) {
      return { items, appliedVoucher: null, status: 'idle', error: null };
    }
  } catch { /* Invalid or unavailable browser storage starts an empty guest cart. */ }
  return { items: [], appliedVoucher: null, status: 'idle', error: null };
}

export function clearGuestCart() {
  try { localStorage.removeItem(KEY); } catch { /* Storage can be unavailable. */ }
}

export function persistGuestCart(store: { getState: () => RootState; subscribe: (listener: () => void) => () => void }) {
  let wasAuthenticated = store.getState().auth.isAuthenticated;
  return store.subscribe(() => {
    const { auth, cart } = store.getState();
    if (wasAuthenticated && !auth.isAuthenticated) {
      clearGuestCart();
    } else if (!auth.isAuthenticated) {
      try { localStorage.setItem(KEY, JSON.stringify(cart.items)); } catch { /* Ignore storage quota errors. */ }
    }
    wasAuthenticated = auth.isAuthenticated;
  });
}
