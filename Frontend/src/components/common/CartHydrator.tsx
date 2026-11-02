import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCart, loadCart } from '@/store/slices/cartSlice';

export default function CartHydrator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user) {
      void dispatch(loadCart());
    } else {
      dispatch(clearCart());
    }
  }, [dispatch, isAuthenticated, user?.id]);

  return null;
}
