import { Link } from 'react-router-dom';
import { User, ShoppingCart } from 'lucide-react';
import BrandLogo from '@/components/common/BrandLogo';
import { useAppSelector } from '@/store/hooks';
import { selectCartTotalItems } from '@/store/selectors/cartSelectors';

export default function CheckoutHeader() {
  const cartCount = useAppSelector(selectCartTotalItems);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo size="sm" />

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-green-600"
            aria-label="Tài khoản"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            to="/gio-hang"
            className="relative rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-green-600"
            aria-label="Giỏ hàng"
          >
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
              {cartCount}
            </span>
            <ShoppingCart className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
