import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Input, Button, Upload, message, Typography } from 'antd';
import { UploadOutlined, DeleteOutlined, LoadingOutlined, PictureOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import adminCatalogService from '@/services/adminCatalogService';
import type { BrandDTO } from '@/types/api';

const { Text } = Typography;

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];

interface BrandModalProps {
  open: boolean;
  onClose: () => void;
  editingBrand?: BrandDTO | null;
  existingBrands?: BrandDTO[];
  onSuccess: () => void;
}

interface BrandFormValues {
  name: string;
  logoUrl: string;
}

export default function BrandModal({
  open,
  onClose,
  editingBrand,
  existingBrands = [],
  onSuccess,
}: BrandModalProps) {
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form schema validation with Zod
  const brandSchema: z.ZodType<BrandFormValues> = z
    .object({
      name: z
        .string()
        .trim()
        .min(1, 'Tên thương hiệu không được để trống')
        .max(100, 'Tên thương hiệu tối đa 100 ký tự'),
      logoUrl: z.string(),
    })
    .refine(
      (data) => {
        const lowerVal = data.name.trim().toLowerCase();
        return !existingBrands.some(
          (b) =>
            b.name.trim().toLowerCase() === lowerVal &&
            (!editingBrand || b.id !== editingBrand.id)
        );
      },
      {
        message: 'Tên thương hiệu đã tồn tại trong hệ thống',
        path: ['name'],
      }
    );

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema as any) as any,
    defaultValues: {
      name: '',
      logoUrl: '',
    },
  });

  const logoUrl = watch('logoUrl');

  useEffect(() => {
    if (open) {
      if (editingBrand) {
        reset({
          name: editingBrand.name,
          logoUrl: editingBrand.logoUrl || '',
        });
      } else {
        reset({
          name: '',
          logoUrl: '',
        });
      }
    }
  }, [open, editingBrand, reset]);

  const handleCustomUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess: uploadSuccess, onError: uploadError } = options;
    const rawFile = file as File;

    // Validate image format: PNG, JPG, SVG, WebP
    const isValidType =
      ALLOWED_IMAGE_TYPES.includes(rawFile.type) ||
      ALLOWED_EXTENSIONS.some((ext) => rawFile.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      message.error('Định dạng ảnh không hợp lệ! Vui lòng chọn file PNG, JPG hoặc SVG.');
      uploadError?.(new Error('Invalid image type'));
      return;
    }

    // Validate size (max 5MB)
    const isLt5M = rawFile.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Dung lượng ảnh không được vượt quá 5MB!');
      uploadError?.(new Error('File too large'));
      return;
    }

    try {
      setUploading(true);
      const res = await adminCatalogService.uploadLogo(rawFile);
      const uploadedUrl = res.url;
      setValue('logoUrl', uploadedUrl, { shouldValidate: true, shouldDirty: true });
      message.success('Tải logo lên Cloudinary thành công!');
      uploadSuccess?.(uploadedUrl);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Tải ảnh thất bại';
      message.error(errMsg);
      uploadError?.(new Error(errMsg));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: BrandFormValues) => {
    try {
      setSubmitting(true);
      if (editingBrand) {
        await adminCatalogService.updateBrand(editingBrand.id, {
          name: data.name.trim(),
          logoUrl: data.logoUrl || undefined,
        });
        message.success(`Đã cập nhật thương hiệu "${data.name}"`);
      } else {
        await adminCatalogService.createBrand({
          name: data.name.trim(),
          logoUrl: data.logoUrl || undefined,
        });
        message.success(`Đã thêm thương hiệu mới "${data.name}"`);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Thao tác thất bại';
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-base font-semibold text-gray-800">
          <PictureOutlined className="text-primary-600" />
          <span>{editingBrand ? 'Sửa thương hiệu' : 'Thêm thương hiệu mới'}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} className="!rounded-lg" disabled={submitting || uploading}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit(onSubmit)}
          loading={submitting}
          disabled={uploading}
          className="!rounded-lg !bg-primary-600 hover:!bg-primary-700"
        >
          {editingBrand ? 'Lưu thay đổi' : 'Thêm thương hiệu'}
        </Button>,
      ]}
      destroyOnHidden
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
        {/* Tên thương hiệu */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tên thương hiệu <span className="text-red-500">*</span>
          </label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Nhập tên thương hiệu (VD: Apple, Samsung, Xiaomi...)"
                status={errors.name ? 'error' : ''}
                className="!rounded-lg"
                autoFocus
              />
            )}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Upload Logo Cloudinary */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Logo thương hiệu
          </label>
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-gray-300 p-3 bg-gray-50/50">
            {logoUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white p-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 p-1">
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col">
                    <Text className="text-xs font-medium text-gray-700 truncate max-w-[200px]">
                      Logo đã tải lên
                    </Text>
                    <span className="text-[11px] text-emerald-600 font-medium">✓ Sẵn sàng lưu</span>
                  </div>
                </div>
                <Button
                  size="small"
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => setValue('logoUrl', '', { shouldDirty: true })}
                >
                  Gỡ bỏ
                </Button>
              </div>
            ) : null}

            <Upload
              showUploadList={false}
              customRequest={handleCustomUpload}
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              disabled={uploading}
            >
              <Button
                icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}
                loading={uploading}
                className="!rounded-lg"
              >
                {uploading ? 'Đang tải lên Cloudinary...' : 'Tải lên logo (PNG, JPG, SVG)'}
              </Button>
            </Upload>

            {/* Direct URL input fallback */}
            <div className="mt-1">
              <span className="text-[11px] text-gray-400 block mb-1">Hoặc dán đường dẫn ảnh trực tiếp:</span>
              <Controller
                name="logoUrl"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="https://example.com/logo.png"
                    size="small"
                    className="!rounded-md text-xs"
                  />
                )}
              />
            </div>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Hỗ trợ định dạng PNG, JPG, SVG hoặc WebP. Dung lượng tối đa 5MB.
          </p>
        </div>
      </form>
    </Modal>
  );
}
