import { useState, useEffect } from 'react';
import { CheckCircle2, Truck, ShieldCheck, RefreshCw, Headphones, Ticket } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { App } from 'antd';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectCartSummary } from '@/store/selectors/cartSelectors';
import { formatVND, cn } from '@/utils';
import { promotionService } from '@/services';
import type { AvailablePromotionDTO } from '@/types/api';
import { applyCheckoutVoucher, removeCheckoutVoucher } from '@/store/slices/checkoutSlice';
import { applyVoucher, removeVoucher } from '@/store/slices/cartSlice';

export default function OrderSummary() {
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const cartItems = useAppSelector((s) => s.cart.items);
  const cartVoucher = useAppSelector((s) => s.cart.appliedVoucher);
  const summary = useAppSelector(selectCartSummary);
  const voucherCode = useAppSelector((s) => s.checkout.voucherCode);
  const voucherDiscount = useAppSelector((s) => s.checkout.voucherDiscount);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [userDismissedVoucher, setUserDismissedVoucher] = useState(false);

  const { data: myPromos } = useQuery<AvailablePromotionDTO[]>({
    queryKey: ['promotions', 'available', summary.subtotal],
    queryFn: () => promotionService.available(summary.subtotal),
    enabled: isAuthenticated,
  });

  // Auto-sync cart voucher or auto-apply best eligible voucher
  useEffect(() => {
    if (userDismissedVoucher) return;

    if (!voucherCode && myPromos && myPromos.length > 0) {
      if (cartVoucher?.code) {
        const match = myPromos.find((p) => p.code === cartVoucher.code);
        if (match && match.eligible) {
          dispatch(
            applyCheckoutVoucher({
              userPromotionId: match.id,
              code: match.code,
              discount: match.calculatedDiscount,
            }),
          );
          return;
        }
      }

      // Auto-apply best eligible voucher with highest calculated discount
      const eligiblePromos = myPromos.filter((p) => p.eligible && p.calculatedDiscount > 0);
      if (eligiblePromos.length > 0) {
        const best = [...eligiblePromos].sort((a, b) => b.calculatedDiscount - a.calculatedDiscount)[0];
        dispatch(
          applyCheckoutVoucher({
            userPromotionId: best.id,
            code: best.code,
            discount: best.calculatedDiscount,
          }),
        );
        dispatch(
          applyVoucher({
            code: best.code,
            discountAmount: best.calculatedDiscount,
            title: best.name || best.code,
          }),
        );
      }
    }
  }, [cartVoucher, voucherCode, myPromos, userDismissedVoucher, dispatch]);

  // Keep discount updated or remove if subtotal changes and makes voucher ineligible
  useEffect(() => {
    if (voucherCode && myPromos) {
      const current = myPromos.find((p) => p.code === voucherCode);
      if (current && !current.eligible) {
        dispatch(removeCheckoutVoucher());
        dispatch(removeVoucher());
        message.warning(`Voucher ${voucherCode} không còn đủ điều kiện áp dụng`);
      } else if (current && current.calculatedDiscount !== voucherDiscount) {
        dispatch(
          applyCheckoutVoucher({
            userPromotionId: current.id,
            code: current.code,
            discount: current.calculatedDiscount,
          }),
        );
        dispatch(
          applyVoucher({
            code: current.code,
            discountAmount: current.calculatedDiscount,
            title: current.name || current.code,
          }),
        );
      }
    }
  }, [myPromos, voucherCode, voucherDiscount, dispatch, message]);

  const handleSelectVoucher = (promo: AvailablePromotionDTO) => {
    if (!promo.eligible) {
      message.warning('Voucher này không đủ điều kiện áp dụng');
      return;
    }

    // Nhấp vào voucher đang áp dụng -> Hủy chọn
    if (voucherCode === promo.code) {
      setUserDismissedVoucher(true);
      dispatch(removeCheckoutVoucher());
      dispatch(removeVoucher());
      message.info(`Đã bỏ chọn mã ${promo.code}`);
      return;
    }

    setUserDismissedVoucher(false);
    dispatch(
      applyCheckoutVoucher({
        userPromotionId: promo.id,
        code: promo.code,
        discount: promo.calculatedDiscount,
      }),
    );
    dispatch(
      applyVoucher({
        code: promo.code,
        discountAmount: promo.calculatedDiscount,
        title: promo.name || promo.code,
      }),
    );
    message.success(`Đã áp dụng mã ${promo.code}`);
  };

  const availableVouchers = myPromos || [];

  if (cartItems.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
        <p className="text-gray-500">Giỏ hàng của bạn đang trống</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cart items */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900">
          Đơn hàng của bạn{' '}
          <span className="text-sm font-normal text-gray-500">({cartItems.length} sản phẩm)</span>
        </h3>
        <div className="space-y-3">
          {cartItems.map((item) => (
            <div key={item.id} className="flex gap-3">
              <img src={item.product.thumbnail} alt={item.product.name} className="h-16 w-16 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                <div className="text-xs text-gray-500">{[item.selectedStorage, item.selectedColor].filter(Boolean).join(' • ')}</div>
                <div className="mt-1 text-xs text-gray-500">SL: {item.quantity}</div>
              </div>
              <div className="text-sm font-semibold text-gray-900">{formatVND(item.product.price * item.quantity)}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Tạm tính</span><span className="font-medium">{formatVND(summary.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">Phí giao hàng</span><span className="font-medium text-green-600">{summary.shippingFee === 0 ? 'Miễn phí' : formatVND(summary.shippingFee)}</span></div>
          {voucherDiscount > 0 && (
            <div className="flex justify-between text-sm"><span className="text-gray-600">Giảm giá (voucher)</span><span className="font-medium text-green-600">-{formatVND(voucherDiscount)}</span></div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-3 text-base">
            <span className="font-bold text-gray-900">Tổng thanh toán</span>
            <span className="font-bold text-red-600">{formatVND(summary.total)}</span>
          </div>
        </div>
      </div>

      {/* Active voucher notice */}
      {voucherDiscount > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">Bạn tiết kiệm được {formatVND(voucherDiscount)}</div>
            <div className="text-xs text-gray-600">Mã <strong>{voucherCode}</strong> đã được áp dụng</div>
            <button
              onClick={() => {
                setUserDismissedVoucher(true);
                dispatch(removeCheckoutVoucher());
                dispatch(removeVoucher());
              }}
              className="mt-1 text-xs text-red-500 hover:underline"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Saved vouchers — card list */}
      {availableVouchers.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Ticket className="h-4 w-4 text-green-600" />
              Mã giảm giá của bạn ({availableVouchers.length})
            </h4>
            {voucherCode && (
              <span className="text-[11px] text-gray-400">
                Nhấp vào mã khác để đổi
              </span>
            )}
          </div>
          <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
            {availableVouchers.map((v) => {
              const isSelected = v.code === voucherCode;
              const hasSelection = !!voucherCode;

              return (
                <button
                  key={v.id}
                  onClick={() => handleSelectVoucher(v)}
                  disabled={!v.eligible}
                  className={cn(
                    'group relative w-full rounded-xl border p-3 text-left transition-all duration-200',
                    !v.eligible
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50/70 opacity-35'
                      : isSelected
                        ? 'border-2 border-green-600 bg-green-50/90 shadow-sm ring-2 ring-green-500/10 opacity-100'
                        : hasSelection
                          ? 'border-gray-200 bg-white opacity-40 hover:opacity-100 hover:border-green-400 hover:shadow-sm'
                          : 'border-dashed border-green-300 bg-green-50/50 hover:border-green-500 hover:bg-green-100/60 opacity-100',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 font-mono text-xs font-semibold',
                            isSelected
                              ? 'bg-green-600 text-white'
                              : 'bg-green-200 text-green-800',
                          )}
                        >
                          {v.code}
                        </span>
                        <span className="truncate text-sm font-medium text-gray-900">
                          {v.name || v.code}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Đang dùng
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-3 flex-shrink-0 text-right">
                      <div
                        className={cn(
                          'text-sm font-bold',
                          isSelected ? 'text-green-700' : 'text-gray-900 group-hover:text-green-700',
                        )}
                      >
                        {v.discountType === 'PERCENT' ? `Giảm ${v.discountValue}%` : formatVND(v.discountValue)}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {v.eligible ? '✔ Có thể dùng' : `✘ Đơn tối thiểu ${formatVND(v.minOrderValue)}`}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No vouchers yet */}
      {availableVouchers.length === 0 && isAuthenticated && voucherDiscount === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center">
          <p className="text-sm text-gray-500">Bạn chưa có mã giảm giá nào.</p>
          <a href="/khuyen-mai" className="text-xs font-medium text-green-600 hover:underline">Nhận voucher ngay →</a>
        </div>
      )}

      {/* Commitment */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">Cam kết từ GreenPhone</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          {[
            { Icon: ShieldCheck, text: 'Sản phẩm chính hãng 100%' },
            { Icon: RefreshCw, text: 'Đổi trả dễ dàng trong 7 ngày' },
            { Icon: Truck, text: 'Giao hàng nhanh chóng 1-2 ngày' },
            { Icon: Headphones, text: 'Hỗ trợ khách hàng 24/7' },
          ].map(({ Icon, text }, i) => (
            <li key={i} className="flex items-center gap-2"><Icon className="h-4 w-4 flex-shrink-0 text-green-600" /><span>{text}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
