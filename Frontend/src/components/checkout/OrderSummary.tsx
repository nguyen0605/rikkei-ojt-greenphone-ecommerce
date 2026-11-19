import { useState, useEffect } from 'react';
import { CheckCircle2, Truck, ShieldCheck, RefreshCw, Headphones, Ticket, Minus, Plus, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { App } from 'antd';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectCheckoutItems, selectCheckoutSummary } from '@/store/selectors/cartSelectors';
import { formatVND, cn } from '@/utils';
import { promotionService } from '@/services';
import { warehouseService } from '@/services/warehouseService';
import type { AvailablePromotionDTO } from '@/types/api';
import { applyCheckoutVoucher, removeCheckoutVoucher, updateBuyNowQuantity } from '@/store/slices/checkoutSlice';
import { applyVoucher, removeVoucher } from '@/store/slices/cartSlice';

export default function OrderSummary() {
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const buyNowItem = useAppSelector((s) => s.checkout.buyNowItem);
  const checkoutItems = useAppSelector(selectCheckoutItems);
  const cartVoucher = useAppSelector((s) => s.cart.appliedVoucher);
  const summary = useAppSelector(selectCheckoutSummary);
  const voucherCode = useAppSelector((s) => s.checkout.voucherCode);
  const voucherDiscount = useAppSelector((s) => s.checkout.voucherDiscount);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const shipping = useAppSelector((s) => s.checkout.shipping);
  const [userDismissedVoucher, setUserDismissedVoucher] = useState(false);
  const [qtyDraft, setQtyDraft] = useState<string | null>(null);

  const variantIds = checkoutItems.map((i) => i.variantId).filter(Boolean) as number[];

  const { data: nearestStock } = useQuery({
    queryKey: [
      'warehouse',
      'nearest-stock',
      shipping?.latitude,
      shipping?.longitude,
      shipping?.province,
      shipping?.address,
      variantIds.join(','),
    ],
    queryFn: () =>
      warehouseService.getNearestStock({
        lat: typeof shipping?.latitude === 'number' ? shipping.latitude : undefined,
        lng: typeof shipping?.longitude === 'number' ? shipping.longitude : undefined,
        province: shipping?.province || shipping?.address,
        variantIds: variantIds.length > 0 ? variantIds : undefined,
      }),
    enabled: variantIds.length > 0,
    staleTime: 5000,
  });

  const { data: myPromos } = useQuery<AvailablePromotionDTO[]>({
    queryKey: ['promotions', 'available', summary.subtotal],
    queryFn: () => promotionService.available(summary.subtotal),
    enabled: isAuthenticated,
  });

  // Auto-sync cart voucher (normal checkout only) or auto-apply best eligible voucher
  useEffect(() => {
    if (userDismissedVoucher) return;

    if (!voucherCode && myPromos && myPromos.length > 0) {
      if (!buyNowItem && cartVoucher?.code) {
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
        if (!buyNowItem) {
          dispatch(
            applyVoucher({
              code: best.code,
              discountAmount: best.calculatedDiscount,
              title: best.name || best.code,
            }),
          );
        }
      }
    }
  }, [buyNowItem, cartVoucher, voucherCode, myPromos, userDismissedVoucher, dispatch]);

  // Keep discount updated or remove if subtotal changes and makes voucher ineligible
  useEffect(() => {
    if (voucherCode && myPromos) {
      const current = myPromos.find((p) => p.code === voucherCode);
      if (current && !current.eligible) {
        dispatch(removeCheckoutVoucher());
        if (!buyNowItem) dispatch(removeVoucher());
        message.warning(`Voucher ${voucherCode} không còn đủ điều kiện áp dụng`);
      } else if (current && current.calculatedDiscount !== voucherDiscount) {
        dispatch(
          applyCheckoutVoucher({
            userPromotionId: current.id,
            code: current.code,
            discount: current.calculatedDiscount,
          }),
        );
        if (!buyNowItem) {
          dispatch(
            applyVoucher({
              code: current.code,
              discountAmount: current.calculatedDiscount,
              title: current.name || current.code,
            }),
          );
        }
      }
    }
  }, [buyNowItem, myPromos, voucherCode, voucherDiscount, dispatch, message]);

  const handleSelectVoucher = (promo: AvailablePromotionDTO) => {
    if (!promo.eligible) {
      message.warning('Voucher này không đủ điều kiện áp dụng');
      return;
    }

    // Nhấp vào voucher đang áp dụng -> Hủy chọn
    if (voucherCode === promo.code) {
      setUserDismissedVoucher(true);
      dispatch(removeCheckoutVoucher());
      if (!buyNowItem) dispatch(removeVoucher());
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
    if (!buyNowItem) {
      dispatch(
        applyVoucher({
          code: promo.code,
          discountAmount: promo.calculatedDiscount,
          title: promo.name || promo.code,
        }),
      );
    }
    message.success(`Đã áp dụng mã ${promo.code}`);
  };

  // Lọc bỏ hoàn toàn các voucher đã hết hạn khỏi danh sách thanh toán
  const availableVouchers = (myPromos || []).filter((v) => {
    if (v.endDate) {
      const endTimestamp = new Date(String(v.endDate)).getTime();
      if (!isNaN(endTimestamp) && endTimestamp < Date.now()) {
        return false;
      }
    }
    return true;
  });

  if (checkoutItems.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
        <p className="text-gray-500">Giỏ hàng của bạn đang trống</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Checkout items */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-gray-900">
            Đơn hàng của bạn{' '}
            <span className="text-sm font-normal text-gray-500">({checkoutItems.length} sản phẩm)</span>
          </h3>
          {buyNowItem && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
              Mua ngay
            </span>
          )}
        </div>
        <div className="space-y-3">
          {nearestStock?.warehouseName && (
            <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-green-50/80 px-2.5 py-1 text-xs text-green-800 border border-green-200">
              <Truck className="h-3.5 w-3.5 text-green-600 shrink-0" />
              <span>Kho xuất hàng: <strong>{nearestStock.warehouseName}</strong>{nearestStock.distanceKm != null ? ` (~${nearestStock.distanceKm} km)` : ''}</span>
            </div>
          )}
          {checkoutItems.map((item) => {
            const branchStock =
              item.variantId && nearestStock?.stocks?.[item.variantId] !== undefined
                ? nearestStock.stocks[item.variantId]
                : item.maxStock;
            const effectiveMax = branchStock !== undefined ? branchStock : item.maxStock;
            const isOutOfStock = effectiveMax !== undefined && effectiveMax <= 0;

            return (
              <div key={item.id} className="flex gap-3">
                <img src={item.product.thumbnail} alt={item.product.name} className="h-16 w-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                  <div className="text-xs text-gray-500">{[item.selectedStorage, item.selectedColor].filter(Boolean).join(' • ')}</div>
                  {buyNowItem ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50/70">
                        <button
                          type="button"
                          aria-label="Giảm số lượng"
                          data-testid="buy-now-qty-decrease"
                          disabled={item.quantity <= 1 || isOutOfStock}
                          onClick={() => {
                            setQtyDraft(null);
                            dispatch(updateBuyNowQuantity(item.quantity - 1));
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-l-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label="Số lượng sản phẩm"
                          data-testid="buy-now-qty-input"
                          value={qtyDraft ?? String(item.quantity)}
                          onFocus={(e) => {
                            setQtyDraft(String(item.quantity));
                            e.currentTarget.select();
                          }}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            if (digits === '') {
                              setQtyDraft('');
                              return;
                            }
                            const parsed = parseInt(digits, 10);
                            if (Number.isNaN(parsed)) return;
                            let nextQty = Math.max(1, parsed);
                            if (effectiveMax !== undefined && effectiveMax > 0 && nextQty > effectiveMax) {
                              nextQty = effectiveMax;
                              message.warning(`Chỉ còn ${effectiveMax} sản phẩm tại ${nearestStock?.warehouseName || 'kho gần bạn'}`);
                            }
                            setQtyDraft(String(nextQty));
                            dispatch(updateBuyNowQuantity(nextQty));
                          }}
                          onBlur={() => {
                            if (qtyDraft === '') {
                              dispatch(updateBuyNowQuantity(1));
                            }
                            setQtyDraft(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-7 w-11 border-x border-gray-200 bg-white px-1 text-center text-xs font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                        <button
                          type="button"
                          aria-label="Tăng số lượng"
                          data-testid="buy-now-qty-increase"
                          disabled={effectiveMax !== undefined && (effectiveMax <= 0 || item.quantity >= effectiveMax)}
                          onClick={() => {
                            setQtyDraft(null);
                            dispatch(updateBuyNowQuantity(item.quantity + 1));
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-r-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {effectiveMax !== undefined && (
                        <span className={cn("text-[11px]", isOutOfStock ? "text-red-600 font-semibold" : "text-gray-500 font-medium")}>
                          {isOutOfStock ? (
                            `Hết hàng (${nearestStock?.warehouseName || 'Chi nhánh'})`
                          ) : (
                            <>Còn <strong className="text-green-700">{effectiveMax}</strong> ({nearestStock?.warehouseName || 'Chi nhánh'})</>
                          )}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>SL: {item.quantity}</span>
                      {effectiveMax !== undefined && (
                        <span className={cn("text-[11px]", isOutOfStock ? "text-red-600 font-semibold" : "text-gray-500")}>
                          {isOutOfStock
                            ? `• Hết hàng (${nearestStock?.warehouseName || 'Chi nhánh'})`
                            : `• Còn ${effectiveMax} (${nearestStock?.warehouseName || 'Chi nhánh'})`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-900">{formatVND(item.product.price * item.quantity)}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Tạm tính</span><span className="font-medium">{formatVND(summary.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">Phí giao hàng</span><span className="font-medium text-green-600">{summary.shippingFee === 0 ? 'Miễn phí' : formatVND(summary.shippingFee)}</span></div>
          {voucherDiscount > 0 && (
            <div className="flex justify-between text-sm items-center">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Giảm giá ({voucherCode || 'voucher'})</span>
                <button
                  type="button"
                  onClick={() => {
                    setUserDismissedVoucher(true);
                    dispatch(removeCheckoutVoucher());
                    if (!buyNowItem) dispatch(removeVoucher());
                    message.info('Đã bỏ áp dụng mã khuyến mãi');
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors cursor-pointer"
                  title="Bỏ áp dụng mã khuyến mãi"
                >
                  <X className="h-3 w-3" />
                  Bỏ áp dụng
                </button>
              </div>
              <span className="font-medium text-green-600">-{formatVND(voucherDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-3 text-base">
            <span className="font-bold text-gray-900">Tổng thanh toán</span>
            <span className="font-bold text-red-600">{formatVND(summary.total)}</span>
          </div>
        </div>
      </div>

      {/* Active voucher notice */}
      {voucherDiscount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <div>
              <div className="text-sm font-semibold text-gray-900">Bạn tiết kiệm được {formatVND(voucherDiscount)}</div>
              <div className="text-xs text-gray-600">Mã <strong>{voucherCode}</strong> đã được áp dụng thành công</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setUserDismissedVoucher(true);
              dispatch(removeCheckoutVoucher());
              if (!buyNowItem) dispatch(removeVoucher());
              message.info('Đã bỏ áp dụng mã khuyến mãi');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-xs hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer"
            title="Bỏ áp dụng mã khuyến mãi"
          >
            <X className="h-3.5 w-3.5" />
            Bỏ áp dụng
          </button>
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
          <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {availableVouchers.map((v) => {
              const isSelected = v.code === voucherCode;
              const hasSelection = !!voucherCode;

              return (
                <div
                  key={v.id}
                  onClick={() => {
                    if (v.eligible && !isSelected) {
                      handleSelectVoucher(v);
                    }
                  }}
                  className={cn(
                    'group relative w-full rounded-xl border p-3.5 transition-all duration-200',
                    !v.eligible
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50/70 opacity-45'
                      : isSelected
                        ? 'border-2 border-green-600 bg-green-50/90 shadow-sm ring-2 ring-green-500/10'
                        : hasSelection
                          ? 'cursor-pointer border-gray-200 bg-white opacity-70 hover:opacity-100 hover:border-green-400 hover:shadow-sm'
                          : 'cursor-pointer border-dashed border-green-300 bg-green-50/50 hover:border-green-500 hover:bg-green-100/60',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 font-mono text-xs font-semibold',
                            isSelected
                              ? 'bg-green-600 text-white'
                              : 'bg-green-100 text-green-800',
                          )}
                        >
                          {v.code}
                        </span>
                        <span className="truncate text-sm font-medium text-gray-900">
                          {v.name || v.code}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Đang áp dụng
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="font-semibold text-green-700">
                          {v.discountType === 'PERCENT' ? `Giảm ${v.discountValue}%` : `Giảm ${formatVND(v.discountValue)}`}
                        </span>
                        <span>•</span>
                        <span>
                          {v.eligible
                            ? 'Đủ điều kiện áp dụng'
                            : v.minOrderValue != null && v.minOrderValue > 0
                              ? `Đơn tối thiểu ${formatVND(v.minOrderValue)}`
                              : 'Chưa đủ điều kiện'}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUserDismissedVoucher(true);
                            dispatch(removeCheckoutVoucher());
                            if (!buyNowItem) dispatch(removeVoucher());
                            message.info(`Đã bỏ áp dụng mã ${v.code}`);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-400 active:scale-95 transition-all shadow-xs cursor-pointer"
                          title="Bỏ áp dụng mã khuyến mãi này"
                        >
                          <X className="h-3.5 w-3.5" />
                          Bỏ áp dụng
                        </button>
                      ) : v.eligible ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectVoucher(v);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                          title="Áp dụng mã khuyến mãi này"
                        >
                          Áp dụng
                        </button>
                      ) : (
                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400">
                          Chưa đủ điều kiện
                        </span>
                      )}
                    </div>
                  </div>
                </div>
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
