import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { CreditCard, Truck, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { Autoplay, A11y } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { bannerService } from '@/services';
import { ROUTES } from '@/routes/routePaths';
import type { BannerDTO } from '@/types/api';

const AUTO_DELAY = 4500;

const FEATURE_CHIPS = [
  { icon: CreditCard, label: 'Trả góp 0%' },
  { icon: Truck, label: 'Miễn phí ship' },
  { icon: ShieldCheck, label: 'Bảo hành 12T' },
];

export default function HeroBanner() {
  const { data: banners } = useQuery({ queryKey: ['banners'], queryFn: bannerService.active });
  const list = banners || [];
  const swiperRef = useRef<SwiperType | null>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  // Nội bộ: link bắt đầu bằng "/" → dùng react-router Link; ngược lại mở tab mới
  const BannerLink = ({ banner, className, children }: { banner: BannerDTO; className?: string; children: React.ReactNode }) => {
    const href = banner.linkUrl || ROUTES.PRODUCTS;
    if (href.startsWith('/')) {
      return (
        <Link to={href} className={`block h-full w-full ${className || ''}`}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" className={`block h-full w-full ${className || ''}`}>
        {children}
      </a>
    );
  };

  // Tiêu đề + chips + CTA của một slide (fallback khi không có banner)
  const SlideContent = ({ banner }: { banner?: BannerDTO }) => {
    const href = banner?.linkUrl || ROUTES.PRODUCTS;
    const external = !href.startsWith('/');
    return (
      <div className="max-w-xl text-white">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" /> ƯU ĐÃI NỔI BẬT
        </div>
        <h1 className="text-3xl font-bold leading-tight md:text-5xl">
          {banner?.title || 'Điện thoại chính hãng'}
          {!banner && (
            <>
              <br />
              Giá tốt mỗi ngày
            </>
          )}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {FEATURE_CHIPS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md"
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </span>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {external ? (
            <a href={href} target="_blank" rel="noreferrer">
              <Button type="primary" size="large" className="!h-11 !rounded-full !bg-green-600 !px-6 !text-base !font-semibold hover:!bg-green-700">
                Mua ngay <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </a>
          ) : (
            <Link to={href}>
              <Button type="primary" size="large" className="!h-11 !rounded-full !bg-green-600 !px-6 !text-base !font-semibold hover:!bg-green-700">
                Mua ngay <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          )}
          <Link to={ROUTES.PRODUCTS}>
            <Button size="large" className="!h-11 !rounded-full !border-white/40 !bg-white/10 !px-6 !text-white backdrop-blur-md hover:!border-white/70 hover:!bg-white/20">
              Xem tất cả
            </Button>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <section className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <div className="relative h-[420px] w-full overflow-hidden rounded-3xl shadow-2xl sm:h-[480px] md:h-[540px]">
        {list.length > 0 ? (
          <Swiper
            modules={[Autoplay, A11y]}
            autoplay={{ delay: AUTO_DELAY, disableOnInteraction: false }}
            loop
            slidesPerView={1}
            className="h-full w-full"
            onSwiper={(s) => { swiperRef.current = s; }}
            onSlideChange={(s) => setActive(s.realIndex)}
            onAutoplayTimeLeft={(_s, _t, percentage) => setProgress(1 - percentage)}
          >
            {list.map((b) => (
              <SwiperSlide key={b.id}>
                <div className="relative h-full w-full">
                  {/* Ảnh nền + gradient — bấm vào ảnh cũng navigate theo link banner */}
                  <BannerLink banner={b} className="absolute inset-0">
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      width={1200}
                      height={540}
                      fetchPriority="high"
                      loading="eager"
                      className="hero-kenburns h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
                  </BannerLink>

                  {/* Nội dung theo từng slide */}
                  <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-10">
                    <SlideContent banner={b} />
                    <div />
                  </div>
                </div>
              </SwiperSlide>
            ))}

            {/* Dots dọc — bên phải */}
            <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
              {list.map((b, i) => (
                <button
                  key={b.id}
                  aria-label={`Chuyển đến banner ${i + 1}`}
                  onClick={() => swiperRef.current?.slideToLoop(i)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    i === active ? 'w-7 bg-green-500' : 'w-2.5 bg-white/60 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          </Swiper>
        ) : (
          <div className="relative h-full w-full">
            <img
              src="https://images.pexels.com/photos/17571892/pexels-photo-17571892.jpeg"
              alt="GreenPhone"
              width={1200}
              height={540}
              loading="eager"
              className="hero-kenburns h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
            <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 md:p-10">
              <SlideContent />
              <div />
            </div>
          </div>
        )}

        {/* Thanh autoplay progress — mép dưới cùng */}
        {list.length > 1 && (
          <div className="absolute bottom-0 left-0 z-20 h-1 w-full bg-white/20">
            <div
              className="h-full rounded-r-full bg-green-500"
              style={{ width: `${progress * 100}%`, transition: 'width 150ms linear' }}
            />
          </div>
        )}

        {/* Hiệu ứng Ken Burns — zoom nhẹ liên tục */}
        <style>{`
          @keyframes hero-kenburns {
            0% { transform: scale(1.02); }
            100% { transform: scale(1.12); }
          }
          .hero-kenburns {
            animation: hero-kenburns 9s ease-in-out infinite alternate;
          }
        `}</style>
      </div>
    </section>
  );
}
