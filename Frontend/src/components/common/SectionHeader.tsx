import { Link } from 'react-router-dom';
import { cn } from '@/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  showMore?: boolean;
  moreHref?: string;
  moreText?: string;
  className?: string;
  align?: 'left' | 'center';
}

export default function SectionHeader({
  title,
  subtitle,
  showMore,
  moreHref,
  moreText = 'Xem tất cả',
  className,
  align = 'left',
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900 md:text-2xl">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {showMore && moreHref && (
        <Link
          to={moreHref}
          className="text-sm font-medium text-green-600 transition-colors hover:text-green-700"
        >
          {moreText} →
        </Link>
      )}
    </div>
  );
}
