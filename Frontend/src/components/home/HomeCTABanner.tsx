import { CTABanner } from '@/components/common';

export default function HomeCTABanner() {
  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <CTABanner
          title="Sẵn sàng sở hữu chiếc điện thoại mơ ước?"
          description="Đừng bỏ lỡ! Hãy tận dụng ngay ưu đãi cực sốc từ GreenPhone."
          buttonText="Mua ngay"
          buttonHref="/san-pham"
        />
      </div>
    </section>
  );
}
