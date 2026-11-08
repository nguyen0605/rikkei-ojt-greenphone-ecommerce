import { Modal, Form, Input } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { BannerDTO, BannerRequest } from '@/types/api';

interface BannerFormModalProps {
  open: boolean;
  editData: BannerDTO | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (values: BannerRequest) => void;
}

export default function BannerFormModal({
  open,
  editData,
  loading,
  onCancel,
  onSubmit,
}: BannerFormModalProps) {
  const [form] = Form.useForm<BannerRequest>();
  const [aspectRatioWarning, setAspectRatioWarning] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editData) {
        form.setFieldsValue({
          title: editData.title,
          imageUrl: editData.imageUrl,
          linkUrl: editData.linkUrl,
        });
        checkImageAspect(editData.imageUrl);
      } else {
        form.resetFields();
        setAspectRatioWarning(null);
      }
    }
  }, [open, editData, form]);

  const checkImageAspect = (url: string) => {
    if (!url) {
      setAspectRatioWarning(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      // Khuyến nghị tỷ lệ banner trang chủ là ~ 2.5 : 1 đến 3.5 : 1 (ví dụ 1200x400 ~ 3:1)
      if (ratio < 2.0 || ratio > 4.5) {
        setAspectRatioWarning(
          `Cảnh báo: Tỷ lệ ảnh hiện tại là ${(ratio).toFixed(1)}:1 (${img.width}x${img.height}px). Khuyến nghị tỷ lệ chuẩn ~ 3:1 (vd: 1200x400px) để không bị vỡ layout trang chủ.`
        );
      } else {
        setAspectRatioWarning(null);
      }
    };
    img.onerror = () => {
      setAspectRatioWarning('Không thể tải trước ảnh để kiểm tra tỷ lệ.');
    };
    img.src = url;
  };

  return (
    <Modal
      title={
        <span className="text-base font-bold text-ink">
          {editData ? 'Sửa banner' : 'Thêm banner'}
        </span>
      }
      open={open}
      onCancel={() => {
        form.resetFields();
        setAspectRatioWarning(null);
        onCancel();
      }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okButtonProps={{ className: '!rounded-full !bg-primary-600 hover:!bg-primary-700' }}
      cancelButtonProps={{ className: '!rounded-full' }}
      width={560}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          onSubmit(values);
        }}
      >
        <Form.Item
          name="title"
          label="Tiêu đề banner"
          rules={[{ required: true, message: 'Nhập tiêu đề banner' }]}
        >
          <Input placeholder="VD: Khuyến mãi iPhone 15 Pro Max" />
        </Form.Item>

        <Form.Item
          name="imageUrl"
          label="URL hình ảnh (Khuyến nghị tỷ lệ 3:1, vd: 1200x400)"
          rules={[
            { required: true, message: 'Nhập URL hình ảnh' },
            { type: 'url', message: 'URL không hợp lệ' },
          ]}
        >
          <Input
            placeholder="https://..."
            onChange={(e) => checkImageAspect(e.target.value.trim())}
          />
        </Form.Item>

        {aspectRatioWarning && (
          <div className="mb-4 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700 border border-amber-200 flex items-center gap-1.5">
            <WarningOutlined className="text-amber-500 flex-shrink-0" />
            <span>{aspectRatioWarning}</span>
          </div>
        )}

        <Form.Item
          name="linkUrl"
          label="Liên kết điều hướng (Khi bấm vào banner)"
          rules={[{ required: true, message: 'Nhập link điều hướng' }]}
        >
          <Input placeholder="/san-pham hoặc https://..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

