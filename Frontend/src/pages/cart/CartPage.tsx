import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Empty, App, Popconfirm, Checkbox } from 'antd';
import { DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, ShoppingOutlined, TagOutlined, CloseOutlined, RightOutlined } from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removeCartItem, updateCartItem, removeFromCart, updateQuantity, clearCart, moveItem as moveCartItem, clearCartRemote, applyVoucher, removeVoucher } from '@/store/slices/cartSlice';
import { clearBuyNow, setCurrentStep } from '@/store/slices/checkoutSlice';
import { selectCartSummary } from '@/store/selectors/cartSelectors';
import type { CartItem } from '@/types';
import type { AvailablePromotionDTO } from '@/types/api';
import { formatVND } from '@/utils';
import { phoneService, brandService, promotionService } from '@/services';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@/routes/routePaths';

/* Hallmark · macrostructure: Workbench · tone: modern-minimal · anchor hue: green (#16a34a) */

export default function CartPage() {
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const items = useAppSelector((s) => s.cart.items);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const appliedVoucher = useAppSelector((s) => s.cart.appliedVoucher);
  const summary = useAppSelector(selectCartSummary);
  const [cartDismissedVoucher, setCartDismissedVoucher] = useState(false);

  const { data: availableVouchers } = useQuery<AvailablePromotionDTO[]>({
    queryKey: ['promotions', 'available', summary.subtotal],
    queryFn: () => promotionService.available(summary.subtotal),
    enabled: isAuthenticated && summary.subtotal > 0,
  });

  // Tự động áp dụng voucher cao nhất cho giỏ hàng nếu chưa có voucher
  useEffect(() => {
    if (cartDismissedVoucher) return;
    if (!appliedVoucher && availableVouchers && availableVouchers.length > 0) {
      const eligible = availableVouchers.filter((p) => p.eligible && p.calculatedDiscount > 0);
      if (eligible.length > 0) {
        const best = [...eligible].sort((a, b) => b.calculatedDiscount - a.calculatedDiscount)[0];
        dispatch(
          applyVoucher({
            code: best.code,
            discountAmount: best.calculatedDiscount,
            title: best.name || best.code,
          }),
        );
      }
    }
  }, [appliedVoucher, availableVouchers, cartDismissedVoucher, dispatch]);

  // ── Select all ──
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const selectedIds = selected === null
    ? new Set(items.map((item) => item.id))
    : new Set(items.filter((item) => selected.has(item.id)).map((item) => item.id));
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  };
  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const selectedItems = items.filter((i) => selectedIds.has(i.id));
  const selectedSummary = {
    subtotal: selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0),
    totalItems: selectedItems.reduce((s, i) => s + i.quantity, 0),
  };

  // ── Free-ship progress ──
  const freeThreshold = 5_000_000;
  const remain = Math.max(0, freeThreshold - summary.subtotal);
  const progressPct = Math.min(100, Math.round((summary.subtotal / freeThreshold) * 100));

  // ── Cross-sell: gợi ý theo brand của sản phẩm đầu tiên trong giỏ ──
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: brandService.list });
  // CartItem chỉ lưu brand dạng string union → map sang brandId số qua brandService
  const firstBrandName = items[0]?.product.brand;
  const firstBrandId = brands?.find((b) => b.name.toLowerCase() === String(firstBrandName).toLowerCase())?.id;

  const { data: recs } = useQuery({
    queryKey: ['cart-recs', firstBrandId],
    queryFn: () => phoneService.list(firstBrandId ? { brandIds: String(firstBrandId), size: '4' } : { size: '4' }),
    enabled: !!firstBrandId,
  });
  const recProducts = (recs?.content || []).slice(0, 4);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20">
        <Empty description="Giỏ hàng trống" />
        <div className="mt-4 text-center">
          <Link to={ROUTES.PRODUCTS} className="font-medium text-green-600 underline">Tiếp tục mua sắm</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Giỏ hàng</h1>
          <p className="mt-1 text-sm text-gray-500">
            {summary.totalItems} sản phẩm · {appliedVoucher ? `Mã ${appliedVoucher.code} đang áp dụng` : 'Chưa có mã giảm giá'}
          </p>
        </div>
        <Popconfirm title="Xóa toàn bộ giỏ hàng?" onConfirm={async () => {
          if (isAuthenticated) await dispatch(clearCartRemote()).unwrap();
          else dispatch(clearCart());
          message.success('Đã xóa toàn bộ');
        }} okText="Xóa" cancelText="Hủy">
          <Button danger type="text" icon={<DeleteOutlined />} className="!text-sm">Xóa tất cả</Button>
        </Popconfirm>
      </div>

      {/* Free-shipping progress */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {remain > 0 ? (
              <>Còn <span className="font-semibold text-green-600">{formatVND(remain)}</span> để được <strong>miễn phí giao hàng</strong></>
            ) : (
              <span className="font-medium text-green-600">🎉 Bạn đã nhận được miễn phí giao hàng!</span>
            )}
          </span>
          <span className="text-xs text-gray-400">{formatVND(summary.subtotal)} / {formatVND(freeThreshold)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── Items column ── */}
        <div className="min-w-0 flex-1">
          {/* List header / Select all */}
          <div className="mb-3 flex h-11 items-center gap-2 px-1 text-sm text-gray-600">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center">
              <Checkbox checked={allSelected} indeterminate={selectedIds.size > 0 && !allSelected} onChange={toggleAll} />
            </div>
            <span className="font-medium">Chọn tất cả ({items.length} sản phẩm)</span>
          </div>

          {/* Desktop Table Layout (hidden on mobile < 640px) */}
          <div className="hidden space-y-3 sm:block">
            {items.map((item) => (
              <DesktopCartRow
                key={item.id}
                item={item}
                checked={selectedIds.has(item.id)}
                onToggle={() => toggleItem(item.id)}
                onUpdate={(q) => {
                  if (isAuthenticated) void dispatch(updateCartItem({ id: item.id, quantity: q }));
                  else dispatch(updateQuantity({ id: item.id, quantity: q }));
                }}
                onMove={(dir) => dispatch(moveCartItem({ id: item.id, dir }))}
                onRemove={async () => {
                  if (isAuthenticated) await dispatch(removeCartItem(item.id)).unwrap();
                  else dispatch(removeFromCart(item.id));
                  message.success('Đã xóa sản phẩm');
                }}
              />
            ))}
          </div>

          {/* Mobile Card List Layout (< 640px, touch-friendly, no overflow) */}
          <div className="space-y-3 sm:hidden">
            {items.map((item) => (
              <MobileCartCard
                key={item.id}
                item={item}
                checked={selectedIds.has(item.id)}
                onToggle={() => toggleItem(item.id)}
                onUpdate={(q) => {
                  if (isAuthenticated) void dispatch(updateCartItem({ id: item.id, quantity: q }));
                  else dispatch(updateQuantity({ id: item.id, quantity: q }));
                }}
                onRemove={async () => {
                  if (isAuthenticated) await dispatch(removeCartItem(item.id)).unwrap();
                  else dispatch(removeFromCart(item.id));
                  message.success('Đã xóa sản phẩm');
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Summary column ── */}
        <div className="w-full lg:sticky lg:top-6 lg:w-80">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {/* Voucher hint banner */}
            <div className="mb-4 rounded-xl border border-dashed border-green-300 bg-green-50/60 p-3 text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-green-800">
                  <TagOutlined className="text-green-600" /> Mã giảm giá
                </span>
                <Link to={ROUTES.VOUCHERS} className="text-xs font-semibold text-green-700 hover:underline">
                  Săn voucher →
                </Link>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-gray-500">
                  {appliedVoucher
                    ? `Đã áp dụng mã ${appliedVoucher.code} (-${formatVND(appliedVoucher.discountAmount)})`
                    : 'Mã giảm giá sẽ được tự động áp dụng tại bước thanh toán'}
                </p>
                {appliedVoucher && (
                  <button
                    onClick={() => {
                      setCartDismissedVoucher(true);
                      dispatch(removeVoucher());
                    }}
                    className="ml-2 flex-shrink-0 text-xs text-red-500 hover:underline"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Tạm tính</span><span>{formatVND(selectedSummary.subtotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Phí giao hàng</span><span className="text-green-600">{summary.shippingFee === 0 ? 'Miễn phí' : formatVND(summary.shippingFee)}</span></div>
              {summary.discount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Giảm giá {appliedVoucher ? `(${appliedVoucher.code})` : ''}</span>
                  <span className="text-green-600">-{formatVND(summary.discount)}</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-lg font-bold">
              <span className="text-gray-900">Tổng cộng</span>
              <span className="text-red-600">{formatVND(summary.total)}</span>
            </div>

            <Link
              to={ROUTES.CHECKOUT}
              onClick={() => {
                dispatch(clearBuyNow());
                dispatch(setCurrentStep(1));
              }}
              className="mt-4 block"
            >
              <Button type="primary" size="large" block icon={<ShoppingOutlined />} className="!h-12 !rounded-full !bg-green-600 hover:!bg-green-700 !text-base">
                Thanh toán ({selectedSummary.totalItems})
              </Button>
            </Link>
            <p className="mt-2 text-center text-xs text-gray-400">Bạn sẽ chọn địa chỉ giao hàng ở bước tiếp theo</p>
          </div>
        </div>
      </div>

      {/* ── Cross-sell ── */}
      {recProducts.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Có thể bạn cũng thích</h2>
            <Link to={ROUTES.PRODUCTS} className="flex items-center gap-1 text-sm text-green-600 hover:underline">Xem thêm <RightOutlined className="text-[10px]" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recProducts.map((p) => (
              <Link key={p.id} to={ROUTES.PRODUCT_DETAIL(String(p.id))} className="group rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:shadow-md">
                <img src={p.mainImageUrl} alt={p.name} className="h-28 w-full rounded-lg object-cover" loading="lazy" />
                <div className="mt-2 line-clamp-2 text-sm font-medium text-gray-800 group-hover:text-green-600">{p.name}</div>
                <div className="mt-1 text-sm font-semibold text-red-600">{p.lowestPrice ? formatVND(p.lowestPrice) : ''}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Desktop Cart Row (Screen >= 640px) ── */
function DesktopCartRow({
  item, checked, onToggle, onUpdate, onMove, onRemove,
}: {
  item: CartItem;
  checked: boolean;
  onToggle: () => void;
  onUpdate: (q: number) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const price = item.product.price;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md animate-[fade-in_0.25s_ease-out]">
      {/* Select */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
        <Checkbox checked={checked} onChange={onToggle} />
      </div>

      {/* Image */}
      <Link to={ROUTES.PRODUCT_DETAIL(String(item.productId))} className="block shrink-0">
        <img
          src={item.product.thumbnail || '/placeholder.png'}
          alt={item.product.name}
          className="h-20 w-20 rounded-xl border border-gray-100 object-cover"
        />
      </Link>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <Link to={ROUTES.PRODUCT_DETAIL(String(item.productId))} className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-green-600 transition-colors">
          {item.product.name}
        </Link>
        <div className="mt-1 text-xs text-gray-500">
          <span className="inline-block rounded-md bg-gray-50 px-2 py-0.5 font-medium text-gray-600 border border-gray-100">
            {[item.selectedStorage, item.selectedColor].filter(Boolean).join(' • ') || '—'}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-semibold text-red-600">{formatVND(price)}</span>
          {item.product.originalPrice && item.product.originalPrice > price && (
            <span className="text-xs text-gray-400 line-through">{formatVND(item.product.originalPrice)}</span>
          )}
        </div>
      </div>

      {/* Quantity Stepper */}
      <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50/70 p-1">
        <button
          onClick={() => onUpdate(Math.max(1, item.quantity - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-white hover:text-green-600 font-bold transition-colors"
          aria-label="Giảm số lượng"
        >−</button>
        <span className="w-8 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
        <button
          onClick={() => onUpdate(item.quantity + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-white hover:text-green-600 font-bold transition-colors"
          aria-label="Tăng số lượng"
        >+</button>
      </div>

      {/* Total for this line */}
      <div className="w-28 text-right font-bold text-red-600">
        {formatVND(price * item.quantity)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button onClick={() => onMove(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label="Lên"><ArrowUpOutlined className="text-xs" /></button>
        <button onClick={() => onMove(1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label="Xuống"><ArrowDownOutlined className="text-xs" /></button>
        <Popconfirm title="Xóa sản phẩm này?" onConfirm={onRemove} okText="Xóa" cancelText="Hủy">
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" aria-label="Xóa"><CloseOutlined className="text-xs" /></button>
        </Popconfirm>
      </div>
    </div>
  );
}

/* ── Mobile Cart Card (Screen < 640px) ── */
function MobileCartCard({
  item, checked, onToggle, onUpdate, onRemove,
}: {
  item: CartItem;
  checked: boolean;
  onToggle: () => void;
  onUpdate: (q: number) => void;
  onRemove: () => void;
}) {
  const price = item.product.price;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm space-y-3 transition animate-[fade-in_0.25s_ease-out]">
      {/* Card Header: Checkbox + Product Name + Trash Delete Button */}
      <div className="flex items-start gap-2.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center -ml-1">
          <Checkbox checked={checked} onChange={onToggle} />
        </div>
        <div className="min-w-0 flex-1 pt-2">
          <Link
            to={ROUTES.PRODUCT_DETAIL(String(item.productId))}
            className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-green-600 leading-snug"
          >
            {item.product.name}
          </Link>
        </div>
        <Popconfirm
          title="Xóa sản phẩm này?"
          onConfirm={onRemove}
          okText="Xóa"
          cancelText="Hủy"
        >
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            aria-label="Xóa sản phẩm"
          >
            <DeleteOutlined className="text-base" />
          </button>
        </Popconfirm>
      </div>

      {/* Card Body: Square Image + Variant Tags + Unit Price */}
      <div className="flex gap-3 items-center pl-1">
        <Link
          to={ROUTES.PRODUCT_DETAIL(String(item.productId))}
          className="block shrink-0"
        >
          <img
            src={item.product.thumbnail || '/placeholder.png'}
            alt={item.product.name}
            className="h-20 w-20 rounded-xl border border-gray-100 object-cover shadow-xs"
          />
        </Link>
        <div className="min-w-0 flex-1 space-y-1">
          {(item.selectedStorage || item.selectedColor) && (
            <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {[item.selectedStorage, item.selectedColor].filter(Boolean).join(' • ')}
            </span>
          )}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-sm font-bold text-red-600">
              {formatVND(price)}
            </span>
            {item.product.originalPrice && item.product.originalPrice > price && (
              <span className="text-xs text-gray-400 line-through">
                {formatVND(item.product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Quantity Stepper (>= 44x44px touch target) + Line Total */}
      <div className="flex items-center justify-between border-t border-gray-50 pt-2.5">
        {/* Stepper with 44x44px buttons */}
        <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50/80 p-0.5">
          <button
            type="button"
            onClick={() => onUpdate(Math.max(1, item.quantity - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-gray-600 hover:bg-white hover:text-green-600 active:bg-gray-200 transition-colors"
            aria-label="Giảm số lượng"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-bold text-gray-900">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdate(item.quantity + 1)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-gray-600 hover:bg-white hover:text-green-600 active:bg-gray-200 transition-colors"
            aria-label="Tăng số lượng"
          >
            +
          </button>
        </div>

        {/* Subtotal */}
        <div className="text-right">
          <span className="block text-[11px] text-gray-400">Thành tiền</span>
          <span className="text-base font-bold text-red-600">
            {formatVND(price * item.quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}
