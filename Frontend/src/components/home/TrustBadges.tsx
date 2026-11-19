import React from 'react';
import { Truck, ShieldCheck, CreditCard, RefreshCw } from 'lucide-react';

const TRUST_ITEMS = [
  {
    icon: Truck,
    title: 'Giao hàng siêu tốc',
    desc: 'Miễn phí đơn từ 500k, nhận trong 2h',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo hành chính hãng',
    desc: 'Lỗi 1 đổi 1 trong 7 ngày đầu',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: CreditCard,
    title: 'Trả góp 0% tiện lợi',
    desc: 'Thủ tục đơn giản qua thẻ tín dụng',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: RefreshCw,
    title: 'Thu cũ đổi mới',
    desc: 'Trợ giá thu mua lên đời máy hấp dẫn',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
];

export default function TrustBadges() {
  return (
    <section className="relative z-10 py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-4 sm:gap-6 sm:p-6">
          {TRUST_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="group flex items-center gap-3.5 rounded-xl p-2 transition-all hover:bg-gray-50/80"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.bg} ${item.color} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="h-6 w-6 stroke-[2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-green-700">
                    {item.title}
                  </h4>
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
