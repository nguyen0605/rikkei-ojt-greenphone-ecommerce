import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils';

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
  className?: string;
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="breadcrumb"
      className={cn('flex items-center gap-1 text-sm text-gray-600', className)}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <div key={idx} className="flex items-center gap-1">
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="transition-colors hover:text-green-600"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-gray-900' : ''}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
          </div>
        );
      })}
    </nav>
  );
}
