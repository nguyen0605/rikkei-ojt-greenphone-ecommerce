import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { App } from 'antd';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleWishlistAsync } from '@/store/slices/wishlistSlice';
import { ROUTES } from '@/routes/routePaths';
import { cn } from '@/utils';

export interface WishlistButtonProps {
  productId: string;
  name?: string;
  price?: number | null;
  originalPrice?: number | null;
  imageUrl?: string;
  brandName?: string;
  inStock?: boolean;
  className?: string;
  iconSize?: number;
  showText?: boolean;
  textWhenActive?: string;
  textWhenInactive?: string;
  onToggle?: (active: boolean) => void;
}

export default function WishlistButton({
  productId,
  name,
  price,
  originalPrice,
  imageUrl,
  brandName,
  inStock = true,
  className,
  iconSize = 20,
  showText = false,
  textWhenActive = 'Đã thích',
  textWhenInactive = 'Yêu thích',
  onToggle,
}: WishlistButtonProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const [isBouncing, setIsBouncing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isAuthenticated = useAppSelector((state) => state.auth?.isAuthenticated ?? false);

  // Chỉ hiển thị trạng thái yêu thích khi người dùng đã đăng nhập hợp lệ
  const isLiked = useAppSelector((state) =>
    Boolean(
      state.auth?.isAuthenticated &&
      state.wishlist?.items?.some((item) => String(item.productId) === String(productId))
    )
  );

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Chặn người dùng chưa đăng nhập, hiển thị thông báo và chuyển hướng tới /dang-nhap
    if (!isAuthenticated) {
      message.destroy?.();
      message.warning('Vui lòng đăng nhập để lưu sản phẩm vào danh sách yêu thích');
      const currentPath = location.pathname + location.search;
      navigate(ROUTES.LOGIN, {
        state: { from: currentPath, redirect: currentPath },
      });
      return;
    }

    // Chống bấm liên tục tạo hàng đợi thông báo
    if (isUpdating) return;
    setIsUpdating(true);

    // Trigger bounce micro-interaction
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 300);

    // Optimistic UI toggle via toggleWishlistAsync (< 50ms)
    dispatch(
      toggleWishlistAsync({
        productId: String(productId),
        name,
        price: price ?? undefined,
        originalPrice: originalPrice ?? undefined,
        imageUrl,
        brandName,
        inStock,
      })
    )
      .unwrap()
      .then((res) => {
        message.destroy?.();
        if (res.isLiked) {
          message.success(name ? `Đã thêm ${name} vào danh sách yêu thích` : 'Đã thêm vào danh sách yêu thích');
          onToggle?.(true);
        } else {
          message.info(name ? `Đã xóa ${name} khỏi danh sách yêu thích` : 'Đã xóa khỏi danh sách yêu thích');
          onToggle?.(false);
        }
      })
      .catch((err) => {
        message.destroy?.();
        message.error(typeof err === 'string' ? err : 'Không thể cập nhật danh sách yêu thích, vui lòng thử lại.');
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isLiked ? 'Xóa khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
      title={isLiked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
      className={cn(
        'group/wishlist relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/90 p-2 text-gray-400 backdrop-blur-sm transition-all duration-200 hover:bg-white hover:text-red-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1',
        isLiked && 'text-red-500',
        isBouncing && 'scale-125',
        className
      )}
    >
      <Heart
        size={iconSize}
        className={cn(
          'transition-all duration-200 group-hover/wishlist:scale-110',
          isLiked
            ? 'fill-red-500 text-red-500 stroke-red-500'
            : 'fill-transparent text-gray-500 hover:text-red-500 group-hover/wishlist:text-red-500'
        )}
      />
      {showText && (
        <span
          className={cn(
            'ml-1.5 text-sm font-medium transition-colors',
            isLiked ? 'text-red-600' : 'text-gray-700 group-hover/wishlist:text-red-500'
          )}
        >
          {isLiked ? textWhenActive : textWhenInactive}
        </span>
      )}
    </button>
  );
}
