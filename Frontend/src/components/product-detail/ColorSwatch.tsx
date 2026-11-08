import React from 'react';
import { getColorHex } from './colorUtils';

export interface ColorSwatchProps {
  color: string;
  hexColor?: string | null;
  selected?: boolean;
  disabled?: boolean;
  outOfStock?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ColorSwatch({
  color,
  hexColor,
  selected = false,
  disabled = false,
  outOfStock = false,
  onClick,
  className = '',
  size = 'md',
}: ColorSwatchProps) {
  const isInactive = disabled || outOfStock;
  const hex = getColorHex(color, hexColor);

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-base gap-2.5',
  }[size];

  const dotSizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[size];

  const handleClick = (e: React.MouseEvent) => {
    if (isInactive) {
      e.preventDefault();
      return;
    }
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isInactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <button
      type="button"
      role="button"
      aria-label={`Màu ${color}${outOfStock ? ' - Hết hàng' : ''}`}
      aria-pressed={selected}
      aria-disabled={isInactive}
      disabled={isInactive}
      tabIndex={isInactive ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative inline-flex items-center rounded-xl border transition-all duration-150 select-none ${sizeClasses} ${
        isInactive
          ? 'cursor-not-allowed border-gray-200 bg-gray-50/80 text-gray-400 opacity-60'
          : selected
            ? 'border-green-600 bg-green-50/40 text-green-900 shadow-sm ring-2 ring-green-600 font-semibold'
            : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-gray-50/80 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1'
      } ${className}`}
    >
      {/* Color Circle Dot with inner border for light colors */}
      <span
        aria-hidden="true"
        className={`relative shrink-0 rounded-full border border-black/10 shadow-inner ${dotSizeClasses}`}
        style={{ backgroundColor: hex }}
      >
        {/* Subtle white halo for contrast */}
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
      </span>

      {/* Color Name */}
      <span className="truncate">{color}</span>

      {/* Out-of-stock badge / label */}
      {outOfStock && (
        <span className="ml-1 text-[11px] font-normal text-red-500">
          (Hết hàng)
        </span>
      )}

      {/* Visual Diagonal Strikethrough Line for Out-of-Stock */}
      {outOfStock && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl"
        >
          <span className="h-[1.5px] w-[140%] rotate-[-22deg] bg-red-400/80 shadow-xs" />
        </span>
      )}
    </button>
  );
}
