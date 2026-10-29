import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils';

interface SocialButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
}

export default function SocialButton({
  icon,
  label,
  className,
  ...rest
}: SocialButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99]',
        className,
      )}
      {...rest}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
