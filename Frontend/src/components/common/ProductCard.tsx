import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { App } from 'antd';
import type { PhoneDTO } from '@/types/api';
import { cn, getOptimizedImageUrl, formatVND } from '@/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addCartItem } from '@/store/slices/cartSlice';
import { phoneService } from '@/services';

interface Props { product: PhoneDTO; className?: string; }

export default function ProductCard({ product, className }: Props) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { message } = App.useApp();
  const imgUrl = getOptimizedImageUrl(product.mainImageUrl || '', { width: 400, height: 400 });

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/dang-nhap', { state: { from: location.pathname + location.search } });
      return;
    }
    try {
      const detail = await phoneService.detail(product.id);
      const variant = detail.variants?.find((item) => item.stockQuantity > 0);
      if (!variant) {
        message.warning('Sáº£n pháº©m nÃ y hiá»‡n Ä‘Ã£ háº¿t hÃ ng');
        return;
      }
      await dispatch(addCartItem({ phoneVariantId: variant.id, quantity: 1 })).unwrap();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ thÃªm vÃ o giá» hÃ ng');
      return;
    }
    message.success(`Đã thêm ${product.name} vào giỏ hàng`);
  };

  return (
    <div className={cn('group relative block overflow-hidden rounded-xl border border-gray-100 bg-white transition-all hover:-translate-y-1 hover:border-green-200 hover:shadow-lg', className)}>
      <Link to={`/san-pham/${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <img
            src={imgUrl}
            alt={product.name}
            width={400}
            height={400}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-3">
          <div className="mb-1 text-xs text-gray-500">{product.brandName}</div>
          <h3 className="mb-1 line-clamp-2 min-h-[2.5rem] text-sm font-medium text-gray-900 group-hover:text-green-600">{product.name}</h3>
          {product.lowestPrice != null && (
            <div className="mb-1 text-sm font-bold text-red-600">{formatVND(product.lowestPrice)}</div>
          )}
          <div className="text-xs text-gray-400">{product.screen || ''}</div>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button
          onClick={handleAddToCart}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-xs font-medium text-white opacity-0 transition-all hover:bg-green-700 group-hover:opacity-100"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Thêm vào giỏ
        </button>
      </div>
    </div>
  );
}
