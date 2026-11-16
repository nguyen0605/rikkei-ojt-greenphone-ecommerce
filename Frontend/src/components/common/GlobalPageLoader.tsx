import React from 'react';
import { cn } from '@/utils';

export interface GlobalPageLoaderProps {
  /**
   * Main loading announcement text (default: 'Đang tải dữ liệu...')
   */
  message?: string;
  /**
   * Additional submessage or slogan (default: 'Điện thoại chính hãng - Giá tốt mỗi ngày')
   */
  submessage?: string;
  /**
   * Whether to display as a full-viewport overlay or contained within a parent container
   */
  fullScreen?: boolean;
  /**
   * Whether to apply frosted backdrop blur
   */
  blur?: boolean;
  /**
   * Optional custom className
   */
  className?: string;
}

/**
 * GlobalPageLoader
 * GreenPhone branded global loading screen with emerald glow/pulse micro-interactions
 * and smooth fade transition.
 */
export const GlobalPageLoader: React.FC<GlobalPageLoaderProps> = ({
  message = 'Đang tải dữ liệu...',
  submessage = 'Điện thoại chính hãng - Giá tốt mỗi ngày',
  fullScreen = true,
  blur = true,
  className,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Đang tải trang"
      data-testid="global-page-loader"
      className={cn(
        'flex flex-col items-center justify-center transition-all duration-300 ease-out animate-fade-in',
        fullScreen
          ? 'fixed inset-0 z-50 p-4'
          : 'relative min-h-[360px] w-full p-6',
        blur
          ? 'bg-white/85 dark:bg-gray-950/85 backdrop-blur-md'
          : 'bg-white dark:bg-gray-950',
        className,
      )}
    >
      {/* Brand Icon & Glowing Emerald Spinners */}
      <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28">
        {/* Soft pulse glow aura */}
        <div
          data-testid="loader-glow"
          className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse"
        />

        {/* Outer delicate spinner ring */}
        <div
          data-testid="loader-spinner"
          className="absolute inset-0 rounded-full border-[2.5px] border-emerald-100 dark:border-emerald-950 border-t-emerald-600 border-r-emerald-500/60 animate-spin"
          style={{ animationDuration: '1.1s' }}
        />

        {/* Counter-rotating delicate decorative ring */}
        <div
          className="absolute inset-2 rounded-full border border-dashed border-emerald-300/40 dark:border-emerald-700/30 animate-spin"
          style={{ animationDirection: 'reverse', animationDuration: '3.5s' }}
        />

        {/* Central Logo Container with emerald border & pulse */}
        <div className="relative z-10 flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white shadow-lg shadow-emerald-950/5 border border-emerald-100 p-2.5">
          <img
            src="/logo.png"
            alt="GreenPhone Logo"
            className="w-full h-full object-contain animate-pulse transition-transform duration-300"
          />
        </div>
      </div>

      {/* Brand Title */}
      <div className="mt-5 flex items-center gap-1 text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        <span className="text-emerald-600">Green</span>
        <span>Phone</span>
      </div>

      {/* Primary Loading Message */}
      {message && (
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
          <p
            data-testid="loader-message"
            className="text-sm sm:text-base font-medium text-emerald-700 dark:text-emerald-400"
          >
            {message}
          </p>
        </div>
      )}

      {/* Secondary Subtitle / Slogan */}
      {submessage && (
        <p
          data-testid="loader-submessage"
          className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs"
        >
          {submessage}
        </p>
      )}
    </div>
  );
};

export default GlobalPageLoader;
