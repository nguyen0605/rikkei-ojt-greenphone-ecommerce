import { Radio } from 'antd';
import { Truck } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDelivery } from '@/store/slices/checkoutSlice';
import type { DeliveryMethod } from '@/types';
import { formatVND } from '@/utils';

const deliveryOptions = [
  {
    value: 'standard' as DeliveryMethod,
    label: 'Giao hàng tiêu chuẩn',
    desc: 'Nhận hàng từ 1 - 2 ngày',
    price: 0,
    icon: Truck,
  },
  {
    value: 'express' as DeliveryMethod,
    label: 'Giao hàng nhanh',
    desc: 'Nhận hàng trong ngày',
    price: 29_000,
    icon: Truck,
  },
];

export default function DeliveryMethodSelect() {
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => s.checkout.delivery);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900">
        Phương thức giao hàng
      </h3>

      <Radio.Group
        value={current}
        onChange={(e) => dispatch(setDelivery(e.target.value))}
        className="!flex !w-full !flex-col gap-3"
      >
        {deliveryOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <Radio
              key={opt.value}
              value={opt.value}
              className={`!flex !w-full !items-center !gap-3 !rounded-xl !border-2 !p-4 transition-all ${
                current === opt.value
                  ? '!border-green-500 !bg-green-50/50'
                  : '!border-gray-200 hover:!border-gray-300'
              }`}
            >
              <div className="flex flex-1 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <Icon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-500">{opt.desc}</div>
                </div>
              </div>
              <div className="text-sm font-bold text-green-600">
                {opt.price === 0 ? 'Miễn phí' : formatVND(opt.price)}
              </div>
            </Radio>
          );
        })}
      </Radio.Group>
    </div>
  );
}
