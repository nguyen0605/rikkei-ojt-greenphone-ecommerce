import { Link, useSearchParams } from 'react-router-dom';
import { Button, Spin } from 'antd';
import { CheckCircle2, Home, Package } from 'lucide-react';
import { Breadcrumb } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { selectCartSummary } from '@/store/selectors/cartSelectors';
import { formatVND } from '@/utils';
import { useEffect } from 'react';
import { clearCart } from '@/store/slices/cartSlice';
import { useAppDispatch } from '@/store/hooks';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '@/services';

const paymentMethodLabel: Record<string, string> = {
  VIETQR: 'Chuyển khoản ngân hàng (VietQR)',
  COD: 'Thanh toán khi nhận hàng (COD)',
};

export default function CheckoutSuccessPage() {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const summary = useAppSelector(selectCartSummary);
  const reduxOrderId = useAppSelector((s) => s.checkout.orderId);
  // URL param survives refresh; redux does not (checkout not persisted)
  const urlOrderId = searchParams.get('orderId');
  const orderId = urlOrderId ?? reduxOrderId;

  // Fetch the real order so a refreshed page shows the correct amount + method
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', 'success', orderId],
    queryFn: () => orderService.detail(Number(orderId)),
    enabled: !!orderId,
  });

  useEffect(() => {
    // Sau 5s clear cart để tránh mất state ngay lập tức
    const t = setTimeout(() => dispatch(clearCart()), 5000);
    return () => clearTimeout(t);
  }, [dispatch]);

  const total = order?.finalAmount ?? summary.total;
  const method = order ? (paymentMethodLabel[order.paymentMethod] ?? order.paymentMethod) : 'COD';

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Giỏ hàng' },
          { label: 'Thanh toán' },
          { label: 'Hoàn tất' },
        ]}
        className="mb-8"
      />

      <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>

        <h1 className="mb-3 text-3xl font-bold text-gray-900">
          Đặt hàng thành công!
        </h1>
        <p className="mb-8 text-gray-600">
          Cảm ơn bạn đã mua hàng tại GreenPhone. Đơn hàng của bạn đang được xử lý.
        </p>

        {orderId && (
          <div className="mx-auto mb-6 inline-block rounded-lg bg-green-50 px-6 py-3">
            <div className="text-xs text-gray-500">Mã đơn hàng</div>
            <div className="text-lg font-bold text-green-700">{orderId}</div>
          </div>
        )}

        <div className="mx-auto mb-8 grid max-w-md grid-cols-3 gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6">
          <div>
            <div className="text-xs text-gray-500">Tổng tiền</div>
            <div className="text-base font-bold text-red-600">
              {isLoading ? <Spin size="small" /> : formatVND(total)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Sản phẩm</div>
            <div className="text-base font-bold text-gray-900">
              {summary.totalItems || order?.orderDetails?.length || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Thanh toán</div>
            <div className="text-base font-bold text-gray-900">{method}</div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/">
            <Button
              size="large"
              icon={<Home className="h-4 w-4" />}
              className="!rounded-full !border-green-600 !text-green-600 hover:!bg-green-50"
            >
              Về trang chủ
            </Button>
          </Link>
          <Link to="/san-pham">
            <Button
              type="primary"
              size="large"
              icon={<Package className="h-4 w-4" />}
              className="!rounded-full !bg-green-600 hover:!bg-green-700"
            >
              Tiếp tục mua sắm
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
