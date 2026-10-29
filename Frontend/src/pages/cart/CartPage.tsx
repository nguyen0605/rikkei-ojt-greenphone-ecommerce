import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Empty, App, Popconfirm, Checkbox } from 'antd';
import { DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, ShoppingOutlined, TagOutlined, CloseOutlined, RightOutlined } from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removeFromCart, updateQuantity, moveItem as moveCartItem, clearCart, applyVoucher } from '@/store/slices/cartSlice';
import { selectCartSummary } from '@/store/selectors/cartSelectors';
import type { CartItem } from '@/types';
import { formatVND } from '@/utils';
import { phoneService, brandService } from '@/services';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@/routes/routePaths';

/* Hallmark · macrostructure: Workbench · tone: modern-minimal · anchor hue: green (#16a34a) */

export default function CartPage() {
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const items = useAppSelector((s) => s.cart.items);
  const appliedVoucher = useAppSelector((s) => s.cart.appliedVoucher);
  const summary = useAppSelector(selectCartSummary);

  // ── Select all ──
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.id)));
  const allSelected = items.length > 0 && selected.size === items.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  };
  const toggleItem = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const selectedItems = items.filter((i) => selected.has(i.id));
  const selectedSummary = {
    subtotal: selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0),
    totalItems: selectedItems.reduce((s, i) => s + i.quantity, 0),
  };

  // ── Voucher (xuất mã giảm sẵn trong giỏ) ──
  const DEMO_VOUCHERS = [
    { code: 'GREEN10', title: 'Giảm 10% tối đa 500k', discount: Math.min(500_000, summary.subtotal * 0.1) },
    { code: 'FREESHIP', title: 'Miễn phí vận chuyển', discount: summary.shippingFee },
  ];
  const [showVouchers, setShowVouchers] = useState(false);

  const applyDemoVoucher = (code: string) => {
    const v = DEMO_VOUCHERS.find((x) => x.code === code);
    if (!v) return;
    dispatch(applyVoucher({ code: v.code, discountAmount: v.discount, title: v.title }));
    message.success(`Đã áp mã ${code}`);
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
        <Popconfirm title="Xóa toàn bộ giỏ hàng?" onConfirm={() => { dispatch(clearCart()); message.success('Đã xóa toàn bộ'); }} okText="Xóa" cancelText="Hủy">
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
          {/* List header */}
          <div className="mb-2 flex items-center gap-3 px-1 text-sm text-gray-500">
            <Checkbox checked={allSelected} indeterminate={selected.size > 0 && !allSelected} onChange={toggleAll} />
            <span>Chọn tất cả ({items.length})</span>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <CartRow
                key={item.id}
                item={item}
                checked={selected.has(item.id)}
                onToggle={() => toggleItem(item.id)}
                onUpdate={(q) => dispatch(updateQuantity({ id: item.id, quantity: q }))}
                onMove={(dir) => dispatch(moveCartItem({ id: item.id, dir }))}
                onRemove={() => {
                  dispatch(removeFromCart(item.id));
                  message.success('Đã xóa sản phẩm');
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Summary column ── */}
        <div className="w-full lg:sticky lg:top-6 lg:w-80">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {/* Voucher */}
            <button
              onClick={() => setShowVouchers(!showVouchers)}
              className="mb-4 flex w-full items-center justify-between rounded-xl border border-dashed border-green-300 bg-green-50/50 px-3 py-2.5 text-sm text-green-700 hover:bg-green-50"
            >
              <span className="flex items-center gap-2"><TagOutlined /> {appliedVoucher ? `Mã ${appliedVoucher.code}` : 'Chọn mã giảm giá'}</span>
              <span className="text-xs">{showVouchers ? '▲' : '▼'}</span>
            </button>
            {showVouchers && (
              <div className="mb-4 space-y-2">
                {DEMO_VOUCHERS.map((v) => (
                  <div key={v.code} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800">{v.code}</div>
                      <div className="truncate text-xs text-gray-500">{v.title}</div>
                    </div>
                    <Button size="small" type="primary" onClick={() => applyDemoVoucher(v.code)} className="!rounded-full !border-green-600 !bg-green-600 !text-white hover:!bg-green-700">Áp dụng</Button>
                  </div>
                ))}
              </div>
            )}

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

            <Link to={ROUTES.CHECKOUT} className="mt-4 block">
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

/* ── Cart row ── */
function CartRow({
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
    <div className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition animate-[fade-in_0.25s_ease-out] sm:gap-4 sm:p-4">
      {/* Select */}
      <div className="flex items-center">
        <Checkbox checked={checked} onChange={onToggle} />
      </div>
      {/* Image */}
      <Link to={ROUTES.PRODUCT_DETAIL(String(item.productId))} className="block shrink-0">
        <img
          src={item.product.thumbnail || '/placeholder.png'}
          alt={item.product.name}
          className="h-16 w-16 rounded-lg border object-cover sm:h-20 sm:w-20"
        />
      </Link>
      {/* Info */}
      <div className="min-w-0 flex-1">
        <Link to={ROUTES.PRODUCT_DETAIL(String(item.productId))} className="line-clamp-2 text-sm font-medium text-gray-900 hover:underline sm:line-clamp-1">
          {item.product.name}
        </Link>
        <div className="mt-0.5 text-xs text-gray-500">
          {[item.selectedStorage, item.selectedColor].filter(Boolean).join(' • ') || '—'}
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-semibold text-red-600">{formatVND(price)}</span>
          {item.product.originalPrice && item.product.originalPrice > price && (
            <span className="text-xs text-gray-400 line-through">{formatVND(item.product.originalPrice)}</span>
          )}
        </div>
      </div>
      {/* Quantity + actions */}
      <div className="flex flex-col items-end justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => onUpdate(Math.max(1, item.quantity - 1))}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
            aria-label="Giảm số lượng"
          >−</button>
          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
          <button
            onClick={() => onUpdate(item.quantity + 1)}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
            aria-label="Tăng số lượng"
          >+</button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Lên"><ArrowUpOutlined className="text-[10px]" /></button>
          <button onClick={() => onMove(1)} className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Xuống"><ArrowDownOutlined className="text-[10px]" /></button>
          <Popconfirm title="Xóa sản phẩm này?" onConfirm={onRemove} okText="Xóa" cancelText="Hủy">
            <button className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500" aria-label="Xóa"><CloseOutlined className="text-[10px]" /></button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );
}