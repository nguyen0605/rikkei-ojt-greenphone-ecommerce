import { useQuery } from '@tanstack/react-query';
import { Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { ProductCard, ProductCardSkeleton, SectionHeader } from '@/components/common';
import { phoneService } from '@/services';

export default function FeaturedProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ['phones-featured'],
    queryFn: () => phoneService.list({ size: '8', sort: 'sold,desc' }),
  });
  const phones = data?.content || [];

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Sản phẩm nổi bật" subtitle="KHÁM PHÁ NGAY" showMore moreHref="/san-pham" />
        {isLoading ? (
          <div
            role="status"
            aria-label="Đang tải sản phẩm nổi bật"
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <Swiper
            modules={[Navigation, Pagination]}
            spaceBetween={16}
            slidesPerView={2}
            navigation
            pagination={{ clickable: true }}
            breakpoints={{
              640: { slidesPerView: 3 },
              1024: { slidesPerView: 4 },
              1280: { slidesPerView: 5 },
            }}
            className="!pb-10"
          >
            {phones.map((p) => (
              <SwiperSlide key={p.id}>
                <ProductCard product={p} />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
}
