import { Radio } from 'antd';
import { Banknote, Building2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setPayment } from '@/store/slices/checkoutSlice';
import type { PaymentMethod } from '@/types';

const paymentMethods = [
  {
    value: 'cod' as PaymentMethod,
    label: 'Thanh toán khi nhận hàng (COD)',
    desc: 'Thanh toán bằng tiền mặt khi nhận hàng',
    Icon: Banknote,
  },
  {
    value: 'bank-transfer' as PaymentMethod,
    label: 'Chuyển khoản ngân hàng',
    desc: 'Thanh toán qua tài khoản ngân hàng (VietQR)',
    Icon: Building2,
  },
];

export default function PaymentMethodSelect() {
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => s.checkout.payment);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900">
        Phương thức thanh toán
      </h3>

      <Radio.Group
        value={current}
        onChange={(e) => dispatch(setPayment(e.target.value))}
        className="!flex !w-full !flex-col gap-3"
      >
        {paymentMethods.map((pm) => {
          const Icon = pm.Icon;
          return (
            <Radio
              key={pm.value}
              value={pm.value}
              className={`!flex !w-full !items-start !gap-3 !rounded-xl !border-2 !p-4 transition-all ${
                current === pm.value
                  ? '!border-green-500 !bg-green-50/50'
                  : '!border-gray-200 hover:!border-gray-300'
              }`}
            >
              <div className="flex flex-1 items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <Icon className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">
                    {pm.label}
                  </div>
                  <div className="text-xs text-gray-500">{pm.desc}</div>
                </div>
              </div>
            </Radio>
          );
        })}
      </Radio.Group>
    </div>
  );
}
