import { useQuery } from '@tanstack/react-query';
import { CategoryCard, SectionHeader } from '@/components/common';
import { brandService } from '@/services';

export default function CategoryGrid() {
  const { data: brands, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: brandService.list,
  });

  return (
    <section className="bg-gray-50 py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Danh mục sản phẩm"
          subtitle="Khám phá theo thương hiệu chính hãng"
          align="center"
          className="!flex-col !items-center"
        />

        {isLoading ? (
          <div
            data-testid="category-grid-loading"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5"
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-gray-100 bg-white p-5 text-center"
              >
                <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-gray-100" />
                <div className="mx-auto h-4 w-20 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : (
          <div
            data-testid="category-grid"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5"
          >
            {(brands || []).map((b) => (
              <CategoryCard key={b.id} brand={b} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
