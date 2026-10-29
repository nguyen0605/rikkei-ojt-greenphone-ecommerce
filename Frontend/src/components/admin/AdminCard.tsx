import type { ReactNode } from 'react';

/* Hallmark · Workbench content card (design.md):
 * white card on bg-soft, hairline border, radius 12, shadow-sm on hover only. */

interface Props {
  title?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function AdminCard({ title, extra, children, className = '' }: Props) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-rule bg-white shadow-sm ${className}`}>
      {(title || extra) && (
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div className="text-base font-semibold text-ink">{title}</div>
          {extra}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
