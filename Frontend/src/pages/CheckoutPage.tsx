import { Breadcrumb } from '@/components/common';
import CheckoutSteps from '@/components/checkout/CheckoutSteps';
import ShippingForm from '@/components/checkout/ShippingForm';
import PaymentMethodSelect from '@/components/checkout/PaymentMethodSelect';
import OrderSummary from '@/components/checkout/OrderSummary';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectCheckoutItems, selectCheckoutSummary } from '@/store/selectors/cartSelectors';
import { nextStep, prevStep, completeOrder, setCurrentStep, removeCheckoutVoucher, clearBuyNow } from '@/store/slices/checkoutSlice';
import { clearCart, removeVoucher } from '@/store/slices/cartSlice';
import { orderService, paymentService, phoneService } from '@/services';
import { Button, App, Input } from 'antd';
import { Shield, CheckCircle, Banknote, Building2, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { formatVND } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/routes/routePaths';

const vatInvoiceSchema = z
  .object({
    requestInvoice: z.boolean(),
    companyName: z.string().optional(),
    taxCode: z.string().optional(),
    companyAddress: z.string().optional(),
    invoiceEmail: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.requestInvoice) {
      if (!data.companyName || !data.companyName.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tên công ty / đơn vị không được để trống khi yêu cầu hóa đơn VAT',
          path: ['companyName'],
        });
      }
      const cleanTax = (data.taxCode || '').trim();
      if (!cleanTax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mã số thuế không được để trống',
          path: ['taxCode'],
        });
      } else if (!/^(\d{10}|\d{13}|\d{10}-\d{3})$/.test(cleanTax)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mã số thuế không hợp lệ (phải gồm 10 hoặc 13 chữ số)',
          path: ['taxCode'],
        });
      }
      if (!data.companyAddress || !data.companyAddress.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Địa chỉ công ty không được để trống',
          path: ['companyAddress'],
        });
      }
      const email = (data.invoiceEmail || '').trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Email nhận hóa đơn không đúng định dạng',
          path: ['invoiceEmail'],
        });
      }
    }
  });

export default function CheckoutPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [placing, setPlacing] = useState(false);
  const [vatInfo, setVatInfo] = useState({
    requestInvoice: false,
    companyName: '',
    taxCode: '',
    companyAddress: '',
    invoiceEmail: '',
  });
  const [includePaperInvoice, setIncludePaperInvoice] = useState(false);
  const [vatErrors, setVatErrors] = useState<Record<string, string>>({});

  const currentStep = useAppSelector((s) => s.checkout.currentStep);

  useEffect(() => {
    if (currentStep === 3) {
      dispatch(setCurrentStep(1));
    }
  }, [currentStep, dispatch]);

  const effectiveStep = currentStep === 3 ? 1 : currentStep;
  const shipping = useAppSelector((s) => s.checkout.shipping);
  const payment = useAppSelector((s) => s.checkout.payment);
  const voucherCode = useAppSelector((s) => s.checkout.voucherCode);
  const voucherDiscount = useAppSelector((s) => s.checkout.voucherDiscount);
  const userPromotionId = useAppSelector((s) => s.checkout.userPromotionId);
  const buyNowItem = useAppSelector((s) => s.checkout.buyNowItem);
  const checkoutItems = useAppSelector(selectCheckoutItems);
  const summary = useAppSelector(selectCheckoutSummary);

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

  const validateVat = (): boolean => {
    setVatErrors({});
    if (!vatInfo.requestInvoice) return true;

    const result = vatInvoiceSchema.safeParse(vatInfo);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (path && !errs[path]) {
          errs[path] = issue.message;
        }
      });
      setVatErrors(errs);
      const firstMsg = result.error.issues[0]?.message || 'Vui lòng kiểm tra lại thông tin hóa đơn VAT';
      message.warning(firstMsg);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (effectiveStep === 1) {
      const isShippingValid = validateShipping();
      const isVatValid = validateVat();
      if (isShippingValid && isVatValid) {
        dispatch(nextStep());
        window.scrollTo(0, 0);
      }
    }
  };

  // Legacy cart items (before variantId) have no variant — resolve one from the phone detail
  const resolveItemVariantId = async (item: (typeof checkoutItems)[number]): Promise<number> => {
    if (item.variantId !== undefined) return item.variantId;
    const detail = await phoneService.detail(Number(item.productId));
    const variant = detail.variants?.[0];
    if (!variant) {
      throw new Error(`Không tìm thấy phiên bản sản phẩm "${item.product.name}"`);
    }
    return variant.id;
  };

  const handlePlaceOrder = async () => {
    if (checkoutItems.length === 0) {
      message.warning('Giỏ hàng trống');
      return;
    }
    const isBuyNow = Boolean(buyNowItem);
    setPlacing(true);
    try {
      const items = await Promise.all(
        checkoutItems.map(async (item) => ({
          phoneVariantId: await resolveItemVariantId(item),
          quantity: item.quantity,
        })),
      );
      const hasCoords =
        typeof shipping.latitude === 'number' &&
        typeof shipping.longitude === 'number' &&
        Number.isFinite(shipping.latitude) &&
        Number.isFinite(shipping.longitude) &&
        shipping.latitude >= -90 &&
        shipping.latitude <= 90 &&
        shipping.longitude >= -180 &&
        shipping.longitude <= 180;

      const noteParts: string[] = [];
      if (includePaperInvoice) {
        noteParts.push('[KÈM_HÓA_ĐƠN_GIẤY]');
      }

      const orderReq = {
        receiverName: shipping.fullName,
        receiverPhone: shipping.phone,
        shippingAddress: shipping.address,
        paymentMethod: payment === 'bank-transfer' ? 'VIETQR' : 'COD',
        note: noteParts.join(' ').trim(),
        includePaperInvoice,
        userPromotionId: userPromotionId ?? null,
        buyNow: isBuyNow,
        latitude: hasCoords ? shipping.latitude : undefined,
        longitude: hasCoords ? shipping.longitude : undefined,
        requestInvoice: vatInfo.requestInvoice,
        companyName: vatInfo.requestInvoice ? vatInfo.companyName.trim() : undefined,
        taxCode: vatInfo.requestInvoice ? vatInfo.taxCode.trim() : undefined,
        companyAddress: vatInfo.requestInvoice ? vatInfo.companyAddress.trim() : undefined,
        invoiceEmail: vatInfo.requestInvoice ? vatInfo.invoiceEmail.trim() : undefined,
        items,
      };
      const order = await orderService.create(orderReq);

      if (payment === 'bank-transfer') {
        // Create the Payment row first — the Sepay webhook looks it up by orderId,
        // then move to the dedicated payment page (QR keyed by orderId in URL).
        await paymentService.create(order.id, 'VIETQR');
        if (isBuyNow) {
          dispatch(clearBuyNow());
        } else {
          dispatch(clearCart());
        }
        dispatch(removeCheckoutVoucher());
        navigate(ROUTES.CHECKOUT_PAYMENT(String(order.id)));
      } else {
        // COD — done
        if (isBuyNow) {
          dispatch(clearBuyNow());
        } else {
          dispatch(clearCart());
        }
        dispatch(removeCheckoutVoucher());
        dispatch(completeOrder({ orderId: String(order.id) }));
        navigate(
          isBuyNow
            ? `/thanh-toan/hoan-tat?orderId=${order.id}&buyNow=1`
            : `/thanh-toan/hoan-tat?orderId=${order.id}`,
        );
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

        <CheckoutSteps current={effectiveStep} />

        {/* STEP 1: Shipping + Payment */}
        {effectiveStep === 1 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <ShippingForm />

              {/* Form đăng ký xuất hóa đơn VAT doanh nghiệp */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Hóa đơn giá trị gia tăng (VAT)</h3>
                      <p className="text-xs text-gray-500">Đăng ký xuất hóa đơn điện tử cho tổ chức / doanh nghiệp</p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      data-testid="request-vat-checkbox"
                      checked={vatInfo.requestInvoice}
                      onChange={(e) => {
                        setVatInfo((prev) => ({ ...prev, requestInvoice: e.target.checked }));
                        if (!e.target.checked) setVatErrors({});
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-gray-800">Yêu cầu hóa đơn công ty</span>
                  </label>
                </div>

                {vatInfo.requestInvoice && (
                  <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Tên công ty / đơn vị <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="Ví dụ: Công ty Cổ phần Công nghệ Green Tech"
                        data-testid="vat-company-name-input"
                        value={vatInfo.companyName}
                        onChange={(e) => {
                          setVatInfo((prev) => ({ ...prev, companyName: e.target.value }));
                          if (vatErrors.companyName) setVatErrors((errs) => ({ ...errs, companyName: '' }));
                        }}
                        status={vatErrors.companyName ? 'error' : ''}
                        className="!rounded-lg"
                      />
                      {vatErrors.companyName && (
                        <p className="mt-1 text-xs text-red-500">{vatErrors.companyName}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Mã số thuế <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder="10 hoặc 13 chữ số"
                          data-testid="vat-tax-code-input"
                          value={vatInfo.taxCode}
                          onChange={(e) => {
                            setVatInfo((prev) => ({ ...prev, taxCode: e.target.value }));
                            if (vatErrors.taxCode) setVatErrors((errs) => ({ ...errs, taxCode: '' }));
                          }}
                          status={vatErrors.taxCode ? 'error' : ''}
                          className="!rounded-lg font-mono"
                        />
                        {vatErrors.taxCode && (
                          <p className="mt-1 text-xs text-red-500">{vatErrors.taxCode}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Email nhận hóa đơn điện tử
                        </label>
                        <Input
                          placeholder="ketoan@congty.com"
                          data-testid="vat-email-input"
                          value={vatInfo.invoiceEmail}
                          onChange={(e) => {
                            setVatInfo((prev) => ({ ...prev, invoiceEmail: e.target.value }));
                            if (vatErrors.invoiceEmail) setVatErrors((errs) => ({ ...errs, invoiceEmail: '' }));
                          }}
                          status={vatErrors.invoiceEmail ? 'error' : ''}
                          className="!rounded-lg"
                        />
                        {vatErrors.invoiceEmail && (
                          <p className="mt-1 text-xs text-red-500">{vatErrors.invoiceEmail}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Địa chỉ công ty (theo đăng ký kinh doanh) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                        data-testid="vat-address-input"
                        value={vatInfo.companyAddress}
                        onChange={(e) => {
                          setVatInfo((prev) => ({ ...prev, companyAddress: e.target.value }));
                          if (vatErrors.companyAddress) setVatErrors((errs) => ({ ...errs, companyAddress: '' }));
                        }}
                        status={vatErrors.companyAddress ? 'error' : ''}
                        className="!rounded-lg"
                      />
                      {vatErrors.companyAddress && (
                        <p className="mt-1 text-xs text-red-500">{vatErrors.companyAddress}</p>
                      )}
                    </div>

                    <div className="rounded-lg bg-blue-50/60 p-3 text-xs text-blue-800">
                      ℹ️ Hóa đơn điện tử sẽ được phát hành và gửi về email doanh nghiệp sau khi đơn hàng giao thành công.
                    </div>
                  </div>
                )}

                {/* Tùy chọn gửi kèm hóa đơn bán lẻ giấy */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      data-testid="include-paper-invoice-checkbox"
                      checked={includePaperInvoice}
                      onChange={(e) => setIncludePaperInvoice(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer shrink-0"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">
                        Yêu cầu gửi kèm hóa đơn bán lẻ (bản giấy) khi giao hàng
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        🌱 GreenPhone mặc định lưu trữ <strong>Hóa đơn điện tử</strong> trực tuyến để bảo vệ môi trường. Tích chọn nếu quý khách cần hóa đơn in giấy kẹp cùng kiện hàng.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

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
        {effectiveStep === 2 && (
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

                {/* Thông tin hóa đơn VAT nếu khách đăng ký */}
                {vatInfo.requestInvoice && (
                  <div className="mb-6 rounded-xl bg-blue-50/70 p-4 border border-blue-200">
                    <h4 className="mb-2 text-sm font-semibold text-blue-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-700" />
                      <span>Thông tin xuất hóa đơn VAT</span>
                    </h4>
                    <p className="text-sm text-gray-900">
                      <strong>{vatInfo.companyName}</strong> — MST: <span className="font-mono font-bold text-blue-900">{vatInfo.taxCode}</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">{vatInfo.companyAddress}</p>
                    {vatInfo.invoiceEmail && (
                      <p className="text-xs text-gray-500 mt-1">Email nhận HĐ: {vatInfo.invoiceEmail}</p>
                    )}
                  </div>
                )}

                {/* Hình thức nhận hóa đơn */}
                <div className="mb-6 rounded-xl bg-gray-50/80 p-3.5 border border-gray-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>Hình thức nhận hóa đơn:</span>
                    </span>
                    {includePaperInvoice ? (
                      <span className="font-semibold text-emerald-700">
                        Kèm hóa đơn giấy khi giao hàng
                      </span>
                    ) : (
                      <span className="text-gray-600">
                        Hóa đơn điện tử trực tuyến (🌱)
                      </span>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="mb-6">
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">🛒 Sản phẩm ({summary.totalItems})</h4>
                  <div className="space-y-2">
                    {checkoutItems.map((item) => (
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
                    <div className="flex justify-between text-sm items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Giảm giá ({voucherCode})</span>
                        <button
                          type="button"
                          onClick={() => {
                            dispatch(removeCheckoutVoucher());
                            if (!buyNowItem) {
                              dispatch(removeVoucher());
                            }
                            message.info('Đã bỏ áp dụng mã khuyến mãi');
                          }}
                          className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50 hover:underline transition-colors"
                          title="Bỏ áp dụng mã khuyến mãi"
                        >
                          [Bỏ áp dụng]
                        </button>
                      </div>
                      <span className="text-green-600 font-medium">-{formatVND(voucherDiscount)}</span>
                    </div>
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
