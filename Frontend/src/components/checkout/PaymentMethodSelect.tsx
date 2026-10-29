import { Radio } from 'antd';
import {
  Banknote,
  Building2,
  CreditCard,
  Wallet,
  Globe,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setPayment } from '@/store/slices/checkoutSlice';
import type { PaymentMethod } from '@/types';

const paymentMethods = [
  {
    value: 'cod' as PaymentMethod,
    label: 'Thanh toán khi nhận hàng (COD)',
    desc: 'Thanh toán bằng tiền mặt khi nhận hàng',
    Icon: Banknote,
    subIcons: [],
  },
  {
    value: 'bank-transfer' as PaymentMethod,
    label: 'Chuyển khoản ngân hàng',
    desc: 'Thanh toán qua tài khoản ngân hàng',
    Icon: Building2,
    subIcons: [],
  },
  {
    value: 'atm' as PaymentMethod,
    label: 'Thẻ ATM / Internet Banking',
    desc: 'Thanh toán thẻ ATM nội địa',
    Icon: CreditCard,
    subIcons: [],
  },
  {
    value: 'e-wallet' as PaymentMethod,
    label: 'Ví điện tử',
    desc: 'Thanh toán qua MoMo, ZaloPay, VNPay...',
    Icon: Wallet,
    subIcons: ['MoMo', 'ZaloPay'],
  },
  {
    value: 'credit-card' as PaymentMethod,
    label: 'Thẻ tín dụng / ghi nợ',
    desc: 'Thanh toán qua Visa, MasterCard, JCB...',
    Icon: Globe,
    subIcons: ['VISA', 'MC', 'JCB'],
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
                  {pm.subIcons.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {pm.subIcons.map((s) => (
                        <span
                          key={s}
                          className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Radio>
          );
        })}
      </Radio.Group>
    </div>
  );
}
