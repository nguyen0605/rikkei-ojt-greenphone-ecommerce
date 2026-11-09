import { Link } from 'react-router-dom';
import type { BrandDTO } from '@/types/api';
import CategoryImage from './CategoryImage';
import { cn } from '@/utils';

interface Props {
  brand: BrandDTO;
  className?: string;
}

export default function CategoryCard({ brand, className }: Props) {
  return (
    <Link
      to={`/san-pham?brandId=${brand.id}`}
      className={cn(
        'group block rounded-xl border border-gray-100 bg-white p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-green-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500/40',
        className
      )}
    >
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center">
        <CategoryImage
          src={brand.logoUrl}
          alt={`Logo thương hiệu ${brand.name}`}
          brandName={brand.name}
          className="transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <h3 className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-green-600">
        {brand.name}
      </h3>
    </Link>
  );
}
