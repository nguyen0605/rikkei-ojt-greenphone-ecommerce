import { useQuery } from '@tanstack/react-query';  
import { Navigation, Pagination } from 'swiper/modules';  
import { Swiper, SwiperSlide } from 'swiper/react';  
import { ProductCard, SectionHeader } from '@/components/common';  
import { phoneService } from '@/services'; 
  
export default function FeaturedProducts() {  
  const { data } = useQuery({ queryKey: ['phones-featured'], queryFn: () => phoneService.list({ size: '8', sort: 'sold,desc' }) });  
  const phones = data?.content || [];  
  return (  
    <section className="py-12 md:py-16">  
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">  
        <SectionHeader title="Sản phẩm nổi bật" subtitle="KHÁM PHÁ NGAY" showMore moreHref="/san-pham" />  
        <Swiper modules={[Navigation, Pagination]} spaceBetween={16} slidesPerView={2} navigation pagination={{ clickable: true }} breakpoints={{ 640: { slidesPerView: 3 }, 1024: { slidesPerView: 4 }, 1280: { slidesPerView: 5 } }} className="!pb-10">  
          {phones.map((p) => (  
            <SwiperSlide key={p.id}><ProductCard product={p} /></SwiperSlide>  
          ))}  
        </Swiper>  
      </div>  
    </section>  
  );  
} 
