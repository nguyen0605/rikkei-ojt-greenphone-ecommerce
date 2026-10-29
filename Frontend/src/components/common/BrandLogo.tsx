import { Link } from 'react-router-dom';
import { cn } from '@/utils';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
  href?: string;
  className?: string;
  light?: boolean;
}

const sizeMap = {
  sm: { box: 'h-8 w-8', img: 'h-8 w-8' },
  md: { box: 'h-10 w-10', img: 'h-10 w-10' },
  lg: { box: 'h-14 w-14', img: 'h-14 w-14' },
};

const SLOGAN = 'Điện thoại chính hãng - Giá tốt mỗi ngày';

export default function BrandLogo({
  size = 'md',
  withText = true,
  href = '/',
  className,
  light = false,
}: BrandLogoProps) {
  const { box, img } = sizeMap[size];

  const content = (
    <span className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-xl bg-white',
          box,
        )}
      >
        <img
          src="/logo.png"
          alt="GreenPhone"
          className={cn('object-contain', img)}
        />
      </span>
      {withText && (
        <span className="leading-tight">
          <span
            className={cn(
              'block text-lg font-bold tracking-tight',
              light ? 'text-white' : 'text-gray-900',
            )}
          >
            <span className="text-green-600">Green</span>Phone
          </span>
          {size !== 'sm' && (
            <span
              className={cn(
                'hidden text-[10px] sm:block',
                light ? 'text-white/70' : 'text-gray-500',
              )}
            >
              {SLOGAN}
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link to={href} className="flex items-center gap-2">
      {content}
    </Link>
  );
}
