import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard, ProductCardSkeleton, SectionHeader } from '@/components/common';
import { phoneService } from '@/services';

export default function FeaturedProducts() {
  const swiperRef = useRef<SwiperType | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['phones-featured'],
    queryFn: () => phoneService.list({ size: '8', sort: 'sold,desc' }),
  });
  const phones = data?.content || [];

  return (
    <section className="pt-6 pb-12 md:pt-8 md:pb-16">
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
          <div className="group/slider relative">
            {/* Custom Navigation Buttons: Nổi bật, viền màu rõ nét, đổ bóng mạnh để cực kỳ dễ nhìn */}
            <button
              type="button"
              onClick={() => swiperRef.current?.slidePrev()}
              aria-label="Sản phẩm trước"
              className="absolute -left-2 top-[42%] z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-green-600 bg-white text-green-700 shadow-xl transition-all duration-200 hover:scale-110 hover:bg-green-600 hover:text-white sm:-left-6 sm:h-12 sm:w-12 active:scale-95"
            >
              <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={() => swiperRef.current?.slideNext()}
              aria-label="Sản phẩm tiếp theo"
              className="absolute -right-2 top-[42%] z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-green-600 bg-white text-green-700 shadow-xl transition-all duration-200 hover:scale-110 hover:bg-green-600 hover:text-white sm:-right-6 sm:h-12 sm:w-12 active:scale-95"
            >
              <ChevronRight className="h-6 w-6 stroke-[2.5]" />
            </button>

            <Swiper
              modules={[Navigation, Pagination]}
              spaceBetween={16}
              slidesPerView={2}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
              pagination={{
                clickable: true,
                dynamicBullets: true,
              }}
              breakpoints={{
                640: { slidesPerView: 3 },
                1024: { slidesPerView: 4 },
                1280: { slidesPerView: 5 },
              }}
              className="!pb-12 [&_.swiper-pagination-bullet-active]:!bg-green-600 [&_.swiper-pagination-bullet-active]:!w-5 [&_.swiper-pagination-bullet-active]:!rounded-full [&_.swiper-wrapper]:!items-stretch"
            >
              {phones.map((p) => (
                <SwiperSlide key={p.id} className="!h-auto flex">
                  <ProductCard product={p} className="w-full" />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </div>
    </section>
  );
}
