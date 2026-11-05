import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCart, loadCart } from '@/store/slices/cartSlice';
import { cartService } from '@/services';

export default function CartHydrator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartItemsRef = useRef(cartItems);
  cartItemsRef.current = cartItems;

  const prevAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    const wasAuth = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (isAuthenticated && user) {
      // BE2-01: When user logs in, merge client guest cart with user database cart
      const guestItems = (!wasAuth ? cartItemsRef.current : [])
        .filter((i) => i.variantId !== undefined && i.variantId !== null)
        .map((i) => ({ phoneVariantId: i.variantId!, quantity: i.quantity }));

      if (guestItems.length > 0) {
        cartService.sync({ items: guestItems })
          .then(() => dispatch(loadCart()))
          .catch(() => dispatch(loadCart()));
      } else {
        void dispatch(loadCart());
      }
    } else if (!isAuthenticated) {
      dispatch(clearCart());
    }
  }, [dispatch, isAuthenticated, user?.id]);

  return null;
}
