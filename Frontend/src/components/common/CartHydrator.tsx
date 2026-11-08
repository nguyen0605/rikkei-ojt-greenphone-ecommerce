import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCart, loadCart } from '@/store/slices/cartSlice';
import { cartService } from '@/services';
import { clearGuestCart } from '@/store/guestCartStorage';

export default function CartHydrator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const cartItems = useAppSelector((state) => state.cart.items);
  const userId = user?.id;
  const cartItemsRef = useRef(cartItems);

  const prevAuthRef = useRef(false);
  const syncedUserRef = useRef<number | null>(null);
  const currentUserRef = useRef(user?.id);
  useEffect(() => {
    cartItemsRef.current = cartItems;
    currentUserRef.current = isAuthenticated ? userId : undefined;
  }, [cartItems, isAuthenticated, userId]);

  useEffect(() => {
    const wasAuth = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (isAuthenticated && userId !== undefined) {
      // StrictMode replays mount effects: sync each login only once.
      if (syncedUserRef.current === userId) return;
      syncedUserRef.current = userId;
      // BE2-01: When user logs in, merge client guest cart with user database cart
      const guestItems = (!wasAuth ? cartItemsRef.current : [])
        .filter((i) => i.variantId !== undefined && i.variantId !== null)
        .map((i) => ({ phoneVariantId: i.variantId!, quantity: i.quantity }));

      if (guestItems.length > 0) {
        cartService.sync({ items: guestItems })
          .then(() => {
            if (currentUserRef.current !== userId) return;
            clearGuestCart();
            void dispatch(loadCart());
          })
          .catch(() => {
            // Retain guest items in memory and storage for a later sync attempt.
            if (currentUserRef.current === userId) syncedUserRef.current = null;
          });
      } else {
        void dispatch(loadCart());
      }
    } else if (wasAuth && !isAuthenticated) {
      syncedUserRef.current = null;
      clearGuestCart();
      dispatch(clearCart());
    }
  }, [dispatch, isAuthenticated, userId]);

  return null;
}
