import { Button } from 'antd';

interface CTABannerProps {
  title: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
  className?: string;
}

export default function CTABanner({
  title,
  description,
  buttonText = 'Mua ngay',
  buttonHref = '/san-pham',
  className,
}: CTABannerProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 via-green-600 to-green-700 p-8 text-white shadow-lg md:p-12 ${className || ''}`}
    >
      {/* Decorative leaves */}
      <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex-1">
          <h2 className="mb-2 text-2xl font-bold md:text-3xl">{title}</h2>
          {description && (
            <p className="text-sm text-white/90 md:text-base">{description}</p>
          )}
        </div>
        <Button
          size="large"
          href={buttonHref}
          className="!h-12 !rounded-full !bg-white !px-8 !text-base !font-semibold !text-green-700 hover:!bg-green-50"
        >
          {buttonText} →
        </Button>
      </div>
    </section>
  );
}
