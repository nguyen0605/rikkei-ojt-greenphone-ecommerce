import { Link } from 'react-router-dom';  
import type { BrandDTO } from '@/types/api';  
import { cn } from '@/utils';  
  
interface Props { brand: BrandDTO; className?: string; }  
export default function CategoryCard({ brand, className }: Props) {  
  return (  
    <Link to={`/san-pham?brandId=${brand.id}`} className={cn('group block rounded-xl border border-gray-100 bg-white p-6 text-center transition-all hover:-translate-y-1 hover:border-green-200 hover:shadow-lg', className)}>  
      {brand.logoUrl ? ( 
        <img src={brand.logoUrl} alt={brand.name} width={64} height={64} loading="lazy" decoding="async" className="mx-auto mb-3 h-16 w-16 rounded-2xl object-contain transition-transform group-hover:scale-110" />  
      ) : (  
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-2xl font-bold text-gray-700">{brand.name[0]}</div>  
      )}  
      <h3 className="mb-1 text-sm font-semibold text-gray-900 group-hover:text-green-600">{brand.name}</h3>  
    </Link>  
  );  
} 
