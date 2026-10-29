import { useQuery } from '@tanstack/react-query';  
import { CategoryCard, SectionHeader } from '@/components/common';  
import { brandService } from '@/services';  
import type { BrandDTO } from '@/types/api'; 
  
export default function CategoryGrid() {  
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: brandService.list });  
  return (  
    <section className="bg-gray-50 py-12 md:py-16">  
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"> 
        <SectionHeader title="Danh mục sản phẩm" subtitle="Khám phá theo thương hiệu" align="center" className="!flex-col !items-center" />  
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">  
          {(brands || []).map((b) => <CategoryCard key={b.id} brand={b} />)}  
        </div>  
      </div>  
    </section>  
  );  
} 
