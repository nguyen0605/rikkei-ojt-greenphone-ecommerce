import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Tabs, App, Button } from 'antd';
import { Calendar, ShoppingBag, Ticket, Gift, Tag } from 'lucide-react';
import { Breadcrumb } from '@/components/common';
import { promotionService } from '@/services';
import { useAppSelector } from '@/store/hooks';
import { formatVND } from '@/utils';
import { cn } from '@/utils';
import { ROUTES } from '@/routes/routePaths';
import type { UserPromotionDTO } from '@/types/api';

interface PublicPromo {
  id: number; code: string; name: string; description: string | null;
  discountType: string; discountValue: number; maxDiscountAmount: number | null;
  minOrderValue: number | null; startDate: string; endDate: string;
}

export default function VouchersPage() {
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  const { data: promos, isLoading } = useQuery<PublicPromo[]>({
    queryKey: ['promotions', 'public'],
    queryFn: () => promotionService.publicList() as Promise<PublicPromo[]>,
  });

  const { data: myPromos } = useQuery({
    queryKey: ['promotions', 'my'],
    queryFn: () => promotionService.myPromotions(),
    enabled: isAuthenticated,
  });

  // Codes that user already claimed (to filter out from "all" tab)
  const claimedCodes = new Set((myPromos || []).map((up) => up.code));

  // Filter: show only unclaimed vouchers in "all" tab
  const unclaimedPromos = (promos || []).filter((p) => !claimedCodes.has(p.code));

  const claimMutation = useMutation({
    mutationFn: (code: string) => promotionService.claim(code),
    onSuccess: () => {
      message.success('Nhận voucher thành công!');
      queryClient.invalidateQueries({ queryKey: ['promotions', 'my'] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Không thể nhận voucher');
    },
  });

  const getDiscountLabel = (type: string, value: number) => {
    if (type === 'PERCENT') return `Giảm ${value}%`;
    return formatVND(value);
  };

  const tabItems = [
    {
      key: 'all',
      label: (
        <span className="flex items-center gap-1.5">
          <Gift className="h-4 w-4" />
          Tất cả ưu đãi
        </span>
      ),
      children: (
        <>
          {isLoading && <p className="py-8 text-center text-gray-500">Đang tải...</p>}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {unclaimedPromos.map((p) => (
              <div
                key={p.id}
                className="flex overflow-hidden rounded-2xl border border-dashed border-green-300 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Left — discount badge */}
                <div className="relative flex w-28 shrink-0 flex-col items-center justify-center bg-gradient-to-br from-green-500 to-green-700 p-3 text-center text-white">
                  <Ticket className="absolute left-2 top-2 h-4 w-4 opacity-50" />
                  <div className="text-xs font-medium tracking-wider opacity-90">GIẢM</div>
                  <div className="text-lg font-bold leading-tight">{getDiscountLabel(p.discountType, p.discountValue)}</div>
                  {p.maxDiscountAmount != null && <div className="text-[10px] opacity-90">Tối đa {formatVND(p.maxDiscountAmount)}</div>}
                  <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
                </div>
                {/* Right — info */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h4 className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900">{p.name}</h4>
                    <p className="mb-2 text-xs text-gray-500">Mã: <span className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-green-700">{p.code}</span></p>
                    {p.description && <p className="mb-2 text-xs text-gray-600 line-clamp-2">{p.description}</p>}
                    <div className="space-y-1 text-xs text-gray-500">
                      {p.minOrderValue && p.minOrderValue > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag className="h-3 w-3" />
                          <span>Đơn tối thiểu: {formatVND(p.minOrderValue)}</span>
                        </div>
                      ) : <div className="flex items-center gap-1.5"><ShoppingBag className="h-3 w-3" /><span>Không giới hạn đơn tối thiểu</span></div>}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>HSD: {new Date(p.endDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>
                  {isAuthenticated ? (
                    <Button
                      type="primary"
                      size="small"
                      className="mt-3 !rounded-full"
                      loading={claimMutation.isPending && claimMutation.variables === p.code}
                      onClick={() => claimMutation.mutate(p.code)}
                    >
                      Lấy voucher
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      className="mt-3 !rounded-full"
                      onClick={() => navigate(ROUTES.LOGIN)}
                    >
                      Đăng nhập để nhận
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {unclaimedPromos.length === 0 && !isLoading && (
            <p className="rounded-xl bg-yellow-50 p-4 text-center text-sm text-yellow-700">Hiện chưa có khuyến mãi nào.</p>
          )}
        </>
      ),
    },
  ];

  // Only show "Ưu đãi của tôi" tab for authenticated users
  if (isAuthenticated) {
    tabItems.push({
      key: 'mine',
      label: (
        <span className="flex items-center gap-1.5">
          <Tag className="h-4 w-4" />
          Ưu đãi của tôi
        </span>
      ),
      children: (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(myPromos || []).map((up: UserPromotionDTO) => (
            <div
              key={String(up.id)}
              className={cn(
                'flex overflow-hidden rounded-2xl border bg-white shadow-sm',
                up.status === 'AVAILABLE'
                  ? 'border-dashed border-green-300'
                  : 'border-gray-200 opacity-60',
              )}
            >
              <div className={cn(
                'relative flex w-28 shrink-0 flex-col items-center justify-center p-3 text-center text-white',
                up.status === 'AVAILABLE' ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gray-400',
              )}>
                <Ticket className="absolute left-2 top-2 h-4 w-4 opacity-50" />
                <div className="text-xs font-medium tracking-wider opacity-90">GIẢM</div>
                <div className="text-lg font-bold leading-tight">{getDiscountLabel(String(up.discountType), Number(up.discountValue))}</div>
                <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
              </div>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h4 className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900">{String(up.name)}</h4>
                  <p className="mb-2 text-xs text-gray-500">Mã: <span className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-green-700">{String(up.code)}</span></p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span>HSD: {new Date(String(up.endDate)).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-3 w-3" />
                      <span className={cn(up.status === 'AVAILABLE' ? 'font-semibold text-green-600' : 'text-gray-400')}>
                        {up.status === 'AVAILABLE' ? 'Có thể sử dụng' : up.status === 'USED' ? 'Đã dùng' : String(up.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(!myPromos || myPromos.length === 0) && (
            <div className="col-span-full rounded-xl bg-blue-50 p-4 text-center text-sm text-blue-700">
              Bạn chưa có voucher nào. Hãy qua tab "Tất cả ưu đãi" để nhận voucher nhé!
            </div>
          )}
        </div>
      ),
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Khuyến mãi' }]} className="mb-6" />
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Khuyến mãi</h2>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  );
}
