import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Package,
} from 'lucide-react';
import { message } from 'antd';
import ProofImageUploader from '@/components/warranty/ProofImageUploader';
import ClaimProgressModal from '@/components/warranty/ClaimProgressModal';
import { returnService, type ReturnResponse, type ReturnType } from '@/services/returnService';
import { formatVND } from '@/utils';

// Zod schema validation bắt buộc
const returnSchema = z
  .object({
    reason: z.string().min(1, 'Vui lòng chọn lý do đổi trả sản phẩm'),
    customReason: z.string().optional(),
    type: z.enum(['EXCHANGE', 'REFUND']),
    errorDescription: z
      .string()
      .min(10, 'Mô tả chi tiết lỗi phải có ít nhất 10 ký tự')
      .max(500, 'Mô tả không được vượt quá 500 ký tự'),
    proofImages: z
      .array(z.string().url('Đường dẫn ảnh không hợp lệ'))
      .min(1, 'Bắt buộc tải lên tối thiểu 1 hình ảnh minh chứng lỗi phần cứng'),
  })
  .refine(
    (data) => {
      if (data.reason === 'Lý do khác') {
        return !!data.customReason && data.customReason.trim().length >= 3;
      }
      return true;
    },
    {
      message: 'Vui lòng nhập cụ thể lý do khác (tối thiểu 3 ký tự)',
      path: ['customReason'],
    }
  );

type ReturnFormValues = z.infer<typeof returnSchema>;

const REASONS = [
  'Lỗi nguồn (không lên nguồn, sập nguồn liên tục)',
  'Lỗi màn hình cảm ứng (sọc màn, liệt cảm ứng, ám màu)',
  'Lỗi camera (mất nét, đen màn hình, rung lắc)',
  'Loa rè, mic không thu tiếng',
  'Hàng không đúng mô tả so với đơn đặt',
  'Lỗi kết nối (Wi-Fi, Bluetooth, Sóng di động)',
  'Lý do khác',
];

export const ReturnRequestPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<ReturnResponse | null>(null);
  const [progressModalOpen, setProgressModalOpen] = useState(false);

  // Nhận thông tin order và variant được truyền qua state router
  const stateData = location.state as {
    orderId?: number;
    phoneVariantId?: number;
    productName?: string;
    variantSpecs?: string;
    price?: number;
    imageUrl?: string;
  } | null;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReturnFormValues>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      reason: '',
      type: 'EXCHANGE',
      errorDescription: '',
      proofImages: [],
    },
  });

  const selectedType = watch('type');
  const selectedReason = watch('reason');
  const proofImages = watch('proofImages');

  if (!stateData?.orderId || !stateData?.phoneVariantId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-gray-900">Không tìm thấy thông tin sản phẩm</h2>
        <p className="mt-1 text-sm text-gray-500 mb-6">
          Vui lòng chọn sản phẩm cần yêu cầu đổi trả từ trang chi tiết đơn hàng của bạn.
        </p>
        <Link
          to="/tai-khoan/don-hang"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const onSubmit = async (values: ReturnFormValues) => {
    setIsSubmitting(true);
    try {
      const finalReason =
        values.reason === 'Lý do khác' && values.customReason?.trim()
          ? `Khác: ${values.customReason.trim()}`
          : values.reason;

      const response = await returnService.createRequest({
        orderId: stateData.orderId!,
        phoneVariantId: stateData.phoneVariantId!,
        reason: finalReason,
        errorDescription: values.errorDescription,
        type: values.type as ReturnType,
        proofImages: values.proofImages,
      });

      message.success('Gửi yêu cầu đổi trả thành công!');
      setCreatedRequest(response);
      setProgressModalOpen(true);
    } catch (err: any) {
      message.error(err.message || 'Không thể gửi yêu cầu đổi trả. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setProgressModalOpen(false);
    navigate(`/tai-khoan/don-hang/${stateData.orderId}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header điều hướng */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại chi tiết đơn hàng #{stateData.orderId}
        </button>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="h-4 w-4" /> Chính sách lỗi 1 đổi 1 trong 7 ngày
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
        {/* Banner thông tin sản phẩm */}
        <div className="border-b border-gray-100 bg-gray-50/60 p-5">
          <h2 className="text-base font-bold text-gray-900">Yêu cầu Đổi trả / Hoàn tiền</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            GreenPhone cam kết tiếp nhận và thẩm định bảo vệ quyền lợi tối đa cho khách hàng.
          </p>

          <div className="mt-4 flex items-center gap-4 rounded-xl border border-gray-200/80 bg-white p-3.5">
            {stateData.imageUrl ? (
              <img
                src={stateData.imageUrl}
                alt={stateData.productName}
                className="h-16 w-16 rounded-lg object-cover border border-gray-100"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <Package className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{stateData.productName}</h4>
              {stateData.variantSpecs && (
                <div className="mt-0.5 text-xs text-gray-500">{stateData.variantSpecs}</div>
              )}
              {stateData.price && (
                <div className="mt-1 text-xs font-semibold text-emerald-700">
                  Giá mua: {formatVND(stateData.price)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form nhập liệu */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* 1. Chọn hình thức: Đổi mới hoặc Hoàn tiền */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Hình thức xử lý mong muốn <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                  selectedType === 'EXCHANGE'
                    ? 'border-emerald-500 bg-emerald-50/30 text-emerald-950 ring-1 ring-emerald-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  value="EXCHANGE"
                  {...control.register('type')}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-bold">Lỗi 1 đổi 1 trong 7 ngày</div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    Áp dụng khi thiết bị phát sinh lỗi phần cứng trong 7 ngày, đổi ngay máy mới 100% cùng phiên bản và kích hoạt bảo hành 12 tháng.
                  </div>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                  selectedType === 'REFUND'
                    ? 'border-emerald-500 bg-emerald-50/30 text-emerald-950 ring-1 ring-emerald-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  value="REFUND"
                  {...control.register('type')}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-bold">Trả hàng & Hoàn tiền trong 7 ngày</div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    Trả lại sản phẩm lỗi trong vòng 7 ngày kể từ khi nhận hàng, hoàn trả 100% số tiền đã thanh toán.
                  </div>
                </div>
              </label>
            </div>
            {errors.type && <p className="mt-1.5 text-xs text-red-500">{errors.type.message}</p>}
          </div>

          {/* 2. Chọn lý do đổi trả */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Lý do phát sinh sự cố <span className="text-red-500">*</span>
            </label>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Chọn lý do sự cố từ nhà sản xuất --</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.reason && <p className="mt-1.5 text-xs text-red-500">{errors.reason.message}</p>}

            {/* Ô nhập lý do khác nếu chọn "Lý do khác" */}
            {selectedReason === 'Lý do khác' && (
              <div className="mt-3">
                <Controller
                  name="customReason"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Nhập cụ thể lý do sự cố bạn gặp phải..."
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  )}
                />
                {errors.customReason && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.customReason.message}</p>
                )}
              </div>
            )}
          </div>

          {/* 3. Chi tiết mô tả lỗi */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Mô tả chi tiết biểu hiện lỗi <span className="text-red-500">*</span>
            </label>
            <Controller
              name="errorDescription"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  rows={4}
                  placeholder="Vui lòng mô tả cụ thể tình trạng lỗi (ví dụ: màn hình xuất hiện 1 vạch sọc xanh sau khi cắm sạc, chạm vào mép phải không phản hồi...)"
                  className="w-full rounded-xl border border-gray-300 p-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              )}
            />
            {errors.errorDescription && (
              <p className="mt-1.5 text-xs text-red-500">{errors.errorDescription.message}</p>
            )}
          </div>

          {/* 4. Tải lên ảnh bằng chứng lỗi (Cloudflare R2) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Hình ảnh bằng chứng lỗi (Tối đa 3 ảnh) <span className="text-red-500">*</span>
            </label>
            <ProofImageUploader
              images={proofImages}
              onChange={(newImgs) => setValue('proofImages', newImgs, { shouldValidate: true })}
              maxImages={3}
              disabled={isSubmitting}
            />
            {errors.proofImages && (
              <p className="mt-1.5 text-xs text-red-500">{errors.proofImages.message}</p>
            )}
          </div>

          {/* Nút gửi yêu cầu */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang gửi yêu cầu...
                </>
              ) : (
                'Gửi yêu cầu đổi trả'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal theo dõi tiến độ sau khi gửi */}
      <ClaimProgressModal
        open={progressModalOpen}
        onClose={handleModalClose}
        returnRequest={createdRequest}
      />
    </div>
  );
};

export default ReturnRequestPage;
