import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { cn } from '@/utils';

export interface OrderItemThumbnailProps {
  imageUrl?: string;
  productName: string;
  navUrl?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const OrderItemThumbnail: React.FC<OrderItemThumbnailProps> = ({
  imageUrl,
  productName,
  navUrl,
  size = 'md',
  className,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = size === 'sm' ? 'h-12 w-12 rounded-lg p-1' : 'h-16 w-16 rounded-xl p-1';
  const iconSizeClasses = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';

  const showImage = Boolean(imageUrl) && !imageError;

  const content = (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden border border-gray-100 bg-gray-50 transition-colors',
        sizeClasses,
        navUrl && 'group-hover:border-emerald-300 group-hover:bg-emerald-50/20'
      )}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={productName}
          loading="lazy"
          className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
          onError={() => setImageError(true)}
          data-testid="order-item-thumbnail-img"
        />
      ) : (
        <Smartphone
          className={cn('text-emerald-600/50', iconSizeClasses)}
          data-testid="order-item-thumbnail-placeholder"
        />
      )}
    </div>
  );

  if (navUrl) {
    return (
      <Link
        to={navUrl}
        aria-label={`Xem chi tiết sản phẩm ${productName}`}
        data-testid="order-item-image-link"
        className={cn('group block shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-xl', className)}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn('block shrink-0', className)}>{content}</div>;
};

export default OrderItemThumbnail;

