import {
  ShieldCheck,
  RefreshCw,
  Truck,
  Headphones,
  type LucideIcon,
} from 'lucide-react';
import type { TrustFeature } from '@/types';

const iconMap: Record<string, LucideIcon> = {
  ShieldCheck,
  RefreshCw,
  Truck,
  Headphones,
};

interface TrustBadgeProps {
  feature: TrustFeature;
  variant?: 'horizontal' | 'vertical';
}

export default function TrustBadge({
  feature,
  variant = 'horizontal',
}: TrustBadgeProps) {
  const Icon = iconMap[feature.icon] || ShieldCheck;

  if (variant === 'vertical') {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-50">
          <Icon className="h-7 w-7 text-green-600" />
        </div>
        <div>
          <h4 className="mb-1 text-sm font-semibold text-gray-900">
            {feature.title}
          </h4>
          <p className="text-xs text-gray-500">{feature.description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-50">
        <Icon className="h-5 w-5 text-green-600" />
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-900">{feature.title}</h4>
        <p className="text-xs text-gray-500">{feature.description}</p>
      </div>
    </div>
  );
}
