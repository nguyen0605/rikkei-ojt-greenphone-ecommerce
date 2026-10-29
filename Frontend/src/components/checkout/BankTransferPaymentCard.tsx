import { QrCode, Clock, Copy, Check } from 'lucide-react';
import { Button, message } from 'antd';
import { useState } from 'react';
import type { OrderDTO, PaymentQRInfo } from '@/types/api';
import { formatVND } from '@/utils';
import { formatCountdown } from '@/hooks/usePaymentCountdown';

interface BankTransferPaymentCardProps {
  order: OrderDTO;
  qrData: PaymentQRInfo | undefined;
  qrLoading: boolean;
  remainingSeconds: number;
}

/**
 * Bank-transfer payment card: QR + account info + live countdown.
 * Shared by the checkout payment page and the account order detail page.
 * NOTE: the countdown is display-only — the server cancels the order on a
 * 60s tick once 10 minutes pass (OrderTimeoutScheduler).
 */
export default function BankTransferPaymentCard({
  order,
  qrData,
  qrLoading,
  remainingSeconds,
}: BankTransferPaymentCardProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const expired = remainingSeconds === 0 && order.orderStatus === 'PENDING' && order.paymentStatus === 'UNPAID';
  const urgent = remainingSeconds > 0 && remainingSeconds < 60;

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      message.success(`Đã sao chép ${label.toLowerCase()}`);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      message.error('Không thể sao chép');
    }
  };

  const row = (label: string, value: string, copyKey?: string) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        {value}
        {copyKey && (
          <button
            type="button"
            onClick={() => copy(copyKey, value)}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600"
            aria-label={`Sao chép ${label}`}
          >
            {copied === copyKey ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </span>
    </div>
  );

  return (
    <div className="rounded-2xl border border-green-200 bg-white p-6 text-center">
      <QrCode className="mx-auto mb-4 h-12 w-12 text-green-600" />
      <h3 className="mb-2 text-xl font-bold text-gray-900">Quét mã QR để thanh toán</h3>
      <p className="mb-4 text-sm text-gray-600">
        Đơn hàng <strong>#{order.id}</strong> — Số tiền: <strong className="text-red-600">{formatVND(qrData?.amount ?? order.finalAmount)}</strong>
      </p>

      {/* Countdown */}
      {expired ? (
        <div className="mx-auto mb-4 inline-block rounded-full bg-red-50 px-4 py-1.5 text-sm font-bold text-red-600">
          Đơn hàng đã bị hủy do quá hạn thanh toán
        </div>
      ) : (
        <div className={`mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${urgent ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
          <Clock className="h-4 w-4" />
          Thanh toán trong: {formatCountdown(remainingSeconds)}
        </div>
      )}

      {/* QR */}
      <div className="mb-4">
        {qrLoading ? (
          <div className="mx-auto h-[280px] w-[280px] animate-pulse rounded-xl bg-gray-100" />
        ) : qrData?.qrUrl ? (
          <img src={qrData.qrUrl} alt="QR VietQR" width={280} height={280} className="mx-auto rounded-xl border" />
        ) : (
          <p className="text-sm text-gray-400">Không thể tạo mã QR. Vui lòng thử lại sau.</p>
        )}
      </div>

      {/* Account info */}
      {qrData && (
        <div className="mx-auto mb-4 max-w-md divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/50 px-5 text-left">
          {row('Chủ tài khoản', qrData.accountHolder)}
          {row('Số tài khoản', qrData.accountNumber, 'acc')}
          {row('Ngân hàng', qrData.bankCode)}
          {row('Nội dung chuyển khoản', qrData.transferContent, 'content')}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        Sau khi chuyển khoản, đơn hàng sẽ tự động xác nhận. Vui lòng nhập đúng nội dung chuyển khoản.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="primary"
          onClick={() => window.location.assign(`/tai-khoan/don-hang/${order.id}`)}
          className="!rounded-full !bg-green-600 hover:!bg-green-700"
        >
          Xem đơn hàng của tôi
        </Button>
      </div>
    </div>
  );
}
