import type { Voucher } from '@/types';
import { Button } from 'antd';
import { Calendar, ShoppingBag, Ticket, Truck } from 'lucide-react';
import { formatDate, formatVND } from '@/utils';
import { cn } from '@/utils';

interface VoucherCardProps {
  voucher: Voucher;
  className?: string;
  onClaim?: (voucher: Voucher) => void;
}

export default function VoucherCard({
  voucher,
  className,
  onClaim,
}: VoucherCardProps) {
  const getVoucherLabel = () => {
    switch (voucher.type) {
      case 'percentage':
        return {
          prefix: 'GIẢM',
          value: `${voucher.discountValue}%`,
          bg: 'bg-gradient-to-br from-green-500 to-green-700',
        };
      case 'fixed':
        return {
          prefix: 'GIẢM',
          value: formatVND(voucher.discountValue),
          bg: 'bg-gradient-to-br from-green-500 to-green-700',
        };
      case 'shipping':
        return {
          prefix: 'FREESHIP',
          value: 'TOÀN QUỐC',
          bg: 'bg-gradient-to-br from-orange-500 to-orange-700',
        };
      default:
        return {
          prefix: 'GIẢM',
          value: `${voucher.discountValue}`,
          bg: 'bg-gradient-to-br from-green-500 to-green-700',
        };
    }
  };

  const label = getVoucherLabel();
  const TypeIcon =
    voucher.type === 'shipping'
      ? Truck
      : voucher.type === 'percentage'
        ? ShoppingBag
        : Ticket;

  return (
    <div
      className={cn(
        'flex overflow-hidden rounded-xl border border-dashed border-green-300 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
    >
      {/* Left Side - Discount Badge */}
      <div
        className={cn(
          'relative flex w-32 flex-col items-center justify-center p-4 text-center text-white',
          label.bg,
        )}
      >
        <TypeIcon className="absolute left-2 top-2 h-4 w-4 opacity-50" />
        <div className="text-xs font-medium tracking-wider opacity-90">
          {label.prefix}
        </div>
        <div className="text-2xl font-bold">{label.value}</div>
        {voucher.type === 'percentage' && (
          <div className="text-[10px] opacity-90">
            Tối đa {formatVND(voucher.maxDiscount || 500_000)}
          </div>
        )}
        {/* Notch effect */}
        <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
      </div>

      {/* Right Side - Details */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h4 className="mb-2 line-clamp-2 text-sm font-semibold text-gray-900">
            {voucher.title}
          </h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="h-3 w-3" />
              <span>Đơn tối thiểu: {formatVND(voucher.minOrderValue)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              <span>HSD: {formatDate(voucher.validTo)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-medium text-green-600">Còn hiệu lực</span>
          <Button
            type="primary"
            size="small"
            onClick={() => onClaim?.(voucher)}
            className="!rounded-full"
          >
            Lấy voucher
          </Button>
        </div>
      </div>
    </div>
  );
}
