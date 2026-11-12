import React, { useRef, useState } from 'react';
import { UploadCloud, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { message } from 'antd';
import { returnService } from '@/services/returnService';

interface ProofImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ProofImageUploader: React.FC<ProofImageUploaderProps> = ({
  images,
  onChange,
  maxImages = 3,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      message.error(`Chỉ được tải lên tối đa ${maxImages} hình ảnh minh chứng.`);
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises: Promise<string>[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!ALLOWED_TYPES.includes(file.type)) {
          message.error(`File "${file.name}" không hợp lệ. Chỉ chấp nhận định dạng PNG, JPEG, WEBP.`);
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          message.error(`File "${file.name}" vượt quá dung lượng tối đa 5MB.`);
          continue;
        }

        uploadPromises.push(returnService.uploadProofImage(file));
      }

      if (uploadPromises.length > 0) {
        const uploadedUrls = await Promise.all(uploadPromises);
        onChange([...images, ...uploadedUrls]);
        message.success('Tải ảnh minh chứng lỗi lên Cloudflare R2 thành công!');
      }
    } catch (error: any) {
      message.error(error.message || 'Tải ảnh thất bại, vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {images.map((url, idx) => (
          <div
            key={url + idx}
            className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-xs"
          >
            <img
              src={url}
              alt={`Minh chứng lỗi ${idx + 1}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors"
                title="Xóa ảnh"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="absolute bottom-1 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
              Ảnh {idx + 1}
            </div>
          </div>
        ))}

        {images.length < maxImages && !disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 p-2 text-center text-gray-500 hover:border-emerald-500 hover:bg-emerald-50/30 hover:text-emerald-700 transition-all disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mb-1" />
                <span className="text-[11px] font-medium">Đang tải lên...</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-gray-400 mb-1 group-hover:text-emerald-600" />
                <span className="text-xs font-semibold">Tải ảnh</span>
                <span className="text-[10px] text-gray-400">Tối đa 5MB</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <ImageIcon className="h-3.5 w-3.5 text-gray-400" />
        <span>
          Đã tải {images.length}/{maxImages} ảnh. Bắt buộc tối thiểu 1 ảnh chụp rõ tình trạng lỗi thiết bị.
        </span>
      </div>
    </div>
  );
};

export default ProofImageUploader;
