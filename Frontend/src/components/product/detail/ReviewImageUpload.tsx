import React, { useState } from 'react';
import { Upload, message, Image } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const DEFAULT_MAX_IMAGES = 5;

export interface ReviewImageUploadProps {
  fileList: UploadFile[];
  onChange: (fileList: UploadFile[]) => void;
  maxCount?: number;
  disabled?: boolean;
}

export const ReviewImageUpload: React.FC<ReviewImageUploadProps> = ({
  fileList,
  onChange,
  maxCount = DEFAULT_MAX_IMAGES,
  disabled = false,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const fileBlobMapRef = React.useRef<Map<string, string>>(new Map());

  const beforeUpload: UploadProps['beforeUpload'] = (file, currentFileList) => {
    // 1. Kiểm tra giới hạn số lượng ảnh
    if (fileList.length + currentFileList.length > maxCount) {
      if (file === currentFileList[0]) {
        message.warning('Bạn chỉ có thể tải lên tối đa 5 hình ảnh cho mỗi đánh giá.');
      }
      return Upload.LIST_IGNORE;
    }

    // 2. Kiểm tra định dạng MIME (F-04: hỗ trợ fallback phần mở rộng file nếu OS không nhận diện file.type)
    const hasAllowedMime =
      ALLOWED_IMAGE_TYPES.includes(file.type) || file.type === 'image/jpg';
    const hasAllowedExtension =
      !file.type && /\.(jpe?g|png|webp)$/i.test(file.name);
    const isAllowedType = hasAllowedMime || hasAllowedExtension;

    if (!isAllowedType) {
      message.error('Định dạng ảnh không hợp lệ. Chỉ hỗ trợ JPG, PNG hoặc WEBP.');
      return Upload.LIST_IGNORE;
    }

    // 3. Kiểm tra file rỗng hoặc dung lượng vượt ngưỡng 5MB
    if (file.size === 0) {
      message.error('File ảnh không có dữ liệu hoặc bị rỗng.');
      return Upload.LIST_IGNORE;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      message.error('Ảnh vượt quá dung lượng 5MB. Vui lòng chọn ảnh nhỏ hơn.');
      return Upload.LIST_IGNORE;
    }

    // 4. Cho phép thêm file vào danh sách (preview sẽ được tạo trong handleChange)
    return false;
  };

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    const updated = newFileList.map((item) => {
      if (item.url) {
        return item;
      }
      const cachedUrl = fileBlobMapRef.current.get(item.uid);
      if (cachedUrl) {
        return { ...item, url: cachedUrl, thumbUrl: cachedUrl };
      }
      if (item.originFileObj) {
        try {
          const objectUrl = URL.createObjectURL(item.originFileObj);
          fileBlobMapRef.current.set(item.uid, objectUrl);
          return { ...item, url: objectUrl, thumbUrl: objectUrl };
        } catch {
          return item;
        }
      }
      return item;
    });
    onChange(updated);
  };

  // F-03: Tránh gọi onChange hai lần khi xóa ảnh.
  // Trả về true để Ant Design Upload tự động cập nhật danh sách và kích hoạt duy nhất 1 lần onChange.
  const handleRemove: UploadProps['onRemove'] = (file) => {
    if (disabled) return false;

    fileBlobMapRef.current.delete(file.uid);

    // Giải phóng blob URL để tránh rò rỉ bộ nhớ
    if (file.url && file.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(file.url);
      } catch {}
    }
    if (file.thumbUrl && file.thumbUrl.startsWith('blob:') && file.thumbUrl !== file.url) {
      try {
        URL.revokeObjectURL(file.thumbUrl);
      } catch {}
    }

    return true;
  };

  const handlePreview = async (file: UploadFile) => {
    const src =
      file.url ||
      file.thumbUrl ||
      (file.originFileObj ? URL.createObjectURL(file.originFileObj) : '');
    setPreviewImage(src);
    setPreviewOpen(true);
  };

  const uploadButton = (
    <button
      type="button"
      style={{ border: 0, background: 'none' }}
      className="flex flex-col items-center justify-center text-gray-500 hover:text-green-600 transition"
      aria-label="Thêm ảnh đánh giá"
      disabled={disabled}
    >
      <PlusOutlined style={{ fontSize: 18 }} />
      <div className="mt-1 text-xs font-medium">Thêm ảnh</div>
    </button>
  );

  return (
    <div className="review-image-upload space-y-2">
      <Upload
        listType="picture-card"
        fileList={fileList}
        beforeUpload={beforeUpload}
        onChange={handleChange}
        onRemove={handleRemove}
        onPreview={handlePreview}
        multiple
        maxCount={maxCount}
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
      >
        {fileList.length >= maxCount ? null : uploadButton}
      </Upload>

      <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-gray-500">
        <span>JPG, PNG, WEBP • Tối đa 5MB/ảnh</span>
        <span className="font-medium text-gray-700">
          Đã chọn: {fileList.length}/{maxCount}
        </span>
      </div>

      {previewImage && (
        <Image
          wrapperStyle={{ display: 'none' }}
          preview={{
            open: previewOpen,
            onOpenChange: (visible) => setPreviewOpen(visible),
            afterOpenChange: (visible) => !visible && setPreviewImage(''),
          }}
          src={previewImage}
        />
      )}
    </div>
  );
};

export default ReviewImageUpload;
