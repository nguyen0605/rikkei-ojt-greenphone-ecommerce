import { Breadcrumb } from '@/components/common';
import CheckoutSteps from '@/components/checkout/CheckoutSteps';
import ShippingForm from '@/components/checkout/ShippingForm';
import PaymentMethodSelect from '@/components/checkout/PaymentMethodSelect';
import OrderSummary from '@/components/checkout/OrderSummary';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectCartSummary } from '@/store/selectors/cartSelectors';
import { nextStep, prevStep, completeOrder } from '@/store/slices/checkoutSlice';
import { clearCart } from '@/store/slices/cartSlice';
import { orderService, paymentService, phoneService } from '@/services';
import { Button, App } from 'antd';
import { Shield, CheckCircle, Banknote } from 'lucide-react';
import { useState } from 'react';
import { formatVND } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/routes/routePaths';

export default function CheckoutPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [placing, setPlacing] = useState(false);

  const currentStep = useAppSelector((s) => s.checkout.currentStep);
  const shipping = useAppSelector((s) => s.checkout.shipping);
  const payment = useAppSelector((s) => s.checkout.payment);
  const voucherCode = useAppSelector((s) => s.checkout.voucherCode);
  const voucherDiscount = useAppSelector((s) => s.checkout.voucherDiscount);
  const userPromotionId = useAppSelector((s) => s.checkout.userPromotionId);
  const cartItems = useAppSelector((s) => s.cart.items);
  const summary = useAppSelector(selectCartSummary);

  const validateShipping = () => {
    if (!shipping.fullName || shipping.fullName.trim().length < 2) {
      message.warning('Vui lòng nhập Họ và tên (tối thiểu 2 ký tự)');
      return false;
    }
    if (!/^0\d{9}$/.test(shipping.phone)) {
      message.warning('Số điện thoại không hợp lệ (bắt đầu bằng 0, 10 chữ số)');
      return false;
    }
    if (!shipping.address || shipping.address.trim().length < 5) {
      message.warning('Vui lòng nhập Địa chỉ nhận hàng (tối thiểu 5 ký tự)');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateShipping()) {
      dispatch(nextStep());
      window.scrollTo(0, 0);
    }
  };

  // Legacy cart items (before variantId) have no variant — resolve one from the phone detail
  const resolveItemVariantId = async (item: (typeof cartItems)[number]): Promise<number> => {
    if (item.variantId !== undefined) return item.variantId;
    const detail = await phoneService.detail(Number(item.productId));
    const variant = detail.variants?.[0];
    if (!variant) {
      throw new Error(`Không tìm thấy phiên bản sản phẩm "${item.product.name}"`);
    }
    return variant.id;
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      message.warning('Giỏ hàng trống');
      return;
    }
    setPlacing(true);
    try {
      const items = await Promise.all(
        cartItems.map(async (item) => ({
          phoneVariantId: await resolveItemVariantId(item),
          quantity: item.quantity,
        })),
      );
      const orderReq = {
        receiverName: shipping.fullName,
        receiverPhone: shipping.phone,
        shippingAddress: shipping.address,
        paymentMethod: payment === 'bank-transfer' ? 'VIETQR' : 'COD',
        note: '',
        userPromotionId: userPromotionId ?? null,
        items,
      };
      const order = await orderService.create(orderReq);

      if (payment === 'bank-transfer') {
        // Create the Payment row first — the Sepay webhook looks it up by orderId,
        // then move to the dedicated payment page (QR keyed by orderId in URL).
        await paymentService.create(order.id, 'VIETQR');
        dispatch(clearCart());
        navigate(ROUTES.CHECKOUT_PAYMENT(String(order.id)));
      } else {
        // COD — done
        dispatch(clearCart());
        dispatch(completeOrder({ orderId: String(order.id) }));
        navigate(`/thanh-toan/hoan-tat?orderId=${order.id}`);
      }
      message.success('Đặt hàng thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đặt hàng thất bại';
      message.error(msg);
    } finally {
      setPlacing(false);
    }
  };

  // --- Render based on step ---
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Giỏ hàng', href: '/gio-hang' }, { label: 'Thanh toán' }]} className="mb-6" />
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Thanh toán</h1>

        <CheckoutSteps current={currentStep} />

        {/* STEP 1: Shipping + Payment */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <ShippingForm />
              <PaymentMethodSelect />

              <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50/50 p-4">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Thông tin của bạn được bảo mật</div>
                  <div className="mt-1 text-xs text-gray-600">GreenPhone cam kết không chia sẻ thông tin cá nhân của khách hàng cho bên thứ ba.</div>
                </div>
              </div>

              <Button type="primary" size="large" block onClick={handleNext}
                className="!h-12 !rounded-full !bg-green-600 !text-base hover:!bg-green-700">
                Tiếp tục xác nhận đơn hàng →
              </Button>
            </div>
            <div className="lg:col-span-1"><OrderSummary /></div>
          </div>
        )}

        {/* STEP 2: Order Confirmation */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Shipping info summary */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <h3 className="mb-4 text-lg font-bold text-gray-900">Xác nhận đơn hàng</h3>

                <div className="mb-6 rounded-xl bg-gray-50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-gray-700">📍 Thông tin nhận hàng</h4>
                  <p className="text-sm text-gray-800"><strong>{shipping.fullName}</strong> — {shipping.phone}</p>
                  <p className="text-sm text-gray-600">{shipping.address}</p>
                  {shipping.email && <p className="text-xs text-gray-500">{shipping.email}</p>}
                </div>

                {/* Items */}
                <div className="mb-6">
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">🛒 Sản phẩm ({summary.totalItems})</h4>
                  <div className="space-y-2">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                        <img src={item.product.thumbnail || '/placeholder.png'} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.product.name}</p>
                          <p className="text-xs text-gray-500">{[item.selectedColor, item.selectedStorage].filter(Boolean).join(' • ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatVND(item.product.price * item.quantity)}</p>
                          <p className="text-xs text-gray-500">SL: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Tạm tính</span><span>{formatVND(summary.subtotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Phí giao hàng</span><span className="text-green-600">{summary.shippingFee === 0 ? 'Miễn phí' : formatVND(summary.shippingFee)}</span></div>
                  {voucherDiscount > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Giảm giá ({voucherCode})</span><span className="text-green-600">-{formatVND(voucherDiscount)}</span></div>
                  )}
                  <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold">
                    <span>Tổng thanh toán</span>
                    <span className="text-red-600">{formatVND(summary.total)}</span>
                  </div>
                </div>

                {/* Payment method */}
                <div className="mt-4 rounded-xl bg-gray-50 p-3">
                  <span className="text-sm text-gray-700">
                    💳 {payment === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : payment === 'bank-transfer' ? 'Chuyển khoản ngân hàng (VietQR)' : payment === 'e-wallet' ? 'Ví điện tử' : payment === 'credit-card' ? 'Thẻ tín dụng' : 'Thẻ ATM'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button size="large" onClick={() => dispatch(prevStep())} className="!rounded-full">← Quay lại</Button>
                <Button type="primary" size="large" loading={placing} onClick={handlePlaceOrder}
                  icon={<CheckCircle className="h-5 w-5" />}
                  className="!flex-1 !h-12 !rounded-full !bg-green-600 !text-base hover:!bg-green-700">
                  {payment === 'bank-transfer' ? 'Đặt hàng & Thanh toán' : 'Đặt hàng (COD)'}
                </Button>
              </div>
            </div>
            <div className="lg:col-span-1"><OrderSummary /></div>
          </div>
        )}

      </div>
    </>
  );
}
