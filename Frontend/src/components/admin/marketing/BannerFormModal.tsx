import { Modal, Form, Input, InputNumber, Select, Upload, Button, message, AutoComplete, Tag, Spin } from 'antd';
import { WarningOutlined, UploadOutlined, LoadingOutlined, LinkOutlined, MobileOutlined } from '@ant-design/icons';
import { useEffect, useState, useRef } from 'react';
import type { BannerDTO, BannerRequest, PhoneDTO } from '@/types/api';
import adminMarketingService from '@/services/adminMarketingService';
import { phoneService } from '@/services';
import { ROUTES } from '@/routes/routePaths';

// Danh sách các trang đích phổ biến để gợi ý chọn nhanh
const COMMON_DESTINATIONS = [
  { value: ROUTES.PRODUCTS, label: 'Trang danh sách sản phẩm (/san-pham)', tag: 'Sản phẩm' },
  { value: ROUTES.VOUCHERS, label: 'Trang mã giảm giá & ưu đãi (/khuyen-mai)', tag: 'Khuyến mãi' },
  { value: '/san-pham?brand=apple', label: 'Lọc sản phẩm Apple iPhone (/san-pham?brand=apple)', tag: 'Hãng' },
  { value: '/san-pham?brand=samsung', label: 'Lọc sản phẩm Samsung (/san-pham?brand=samsung)', tag: 'Hãng' },
  { value: '/san-pham?brand=xiaomi', label: 'Lọc sản phẩm Xiaomi (/san-pham?brand=xiaomi)', tag: 'Hãng' },
  { value: ROUTES.PHONE_COMPARE, label: 'Trang so sánh điện thoại (/so-sanh)', tag: 'Tiện ích' },
  { value: ROUTES.WARRANTY_CHECK, label: 'Trang tra cứu bảo hành (/tra-cuu-bao-hanh)', tag: 'Dịch vụ' },
];

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
  const [uploading, setUploading] = useState<boolean>(false);

  // Trạng thái tìm kiếm điện thoại realtime
  const [phoneSearchText, setPhoneSearchText] = useState<string>('');
  const [phoneOptions, setPhoneOptions] = useState<PhoneDTO[]>([]);
  const [isSearchingPhone, setIsSearchingPhone] = useState<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      if (editData) {
        form.setFieldsValue({
          title: editData.title,
          imageUrl: editData.imageUrl,
          linkUrl: editData.linkUrl,
          sortOrder: editData.sortOrder ?? 0,
          position: editData.position || 'HERO',
        });
        checkImageAspect(editData.imageUrl);
      } else {
        form.resetFields();
        form.setFieldsValue({
          sortOrder: 0,
          position: 'HERO',
        });
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

  // Tìm kiếm điện thoại theo từ khóa realtime (debounce 300ms)
  const handleSearchPhone = (keyword: string) => {
    setPhoneSearchText(keyword);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = keyword.trim();
    if (!trimmed || trimmed.startsWith('http') || (trimmed.startsWith('/') && !trimmed.includes(' '))) {
      // Nếu là link tĩnh hoặc đường dẫn thì chỉ lọc danh mục tĩnh
      setPhoneOptions([]);
      setIsSearchingPhone(false);
      return;
    }

    setIsSearchingPhone(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await phoneService.search({ q: trimmed, size: '6' });
        setPhoneOptions(res?.content || []);
      } catch {
        setPhoneOptions([]);
      } finally {
        setIsSearchingPhone(false);
      }
    }, 300);
  };

  const handleUploadFile = async (file: File) => {
    // Kiểm tra định dạng ảnh
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Vui lòng chỉ tải lên tệp hình ảnh (JPG, PNG, WEBP, ...)!');
      return false;
    }
    // Kiểm tra dung lượng tối đa 10MB
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('Dung lượng ảnh banner không được vượt quá 10MB!');
      return false;
    }

    try {
      setUploading(true);
      const url = await adminMarketingService.uploadBannerImage(file);
      form.setFieldsValue({ imageUrl: url });
      checkImageAspect(url);
      message.success('Tải ảnh banner lên Cloudflare R2 thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload ảnh lên Cloudflare R2 thất bại';
      message.error(msg);
    } finally {
      setUploading(false);
    }
    return false; // Chặn upload mặc định của Antd
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
      width={600}
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
          label="Hình ảnh banner (Khuyến nghị tỷ lệ 3:1, vd: 1200x400)"
          rules={[
            { required: true, message: 'Vui lòng tải ảnh lên hoặc nhập URL hình ảnh' },
          ]}
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nhập URL ảnh hoặc bấm Tải ảnh lên R2 bên cạnh..."
                value={form.getFieldValue('imageUrl')}
                onChange={(e) => {
                  form.setFieldsValue({ imageUrl: e.target.value.trim() });
                  checkImageAspect(e.target.value.trim());
                }}
              />
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={handleUploadFile}
              >
                <Button
                  icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}
                  loading={uploading}
                  className="!rounded-xl border-emerald-500 text-emerald-700 hover:!border-emerald-600 hover:!text-emerald-800"
                >
                  Tải lên R2
                </Button>
              </Upload>
            </div>
            <p className="text-xs text-gray-400">
              Hỗ trợ tải trực tiếp file từ máy tính lên Cloudflare R2 hoặc dán đường dẫn link ảnh.
            </p>
          </div>
        </Form.Item>

        {aspectRatioWarning && (
          <div className="mb-4 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700 border border-amber-200 flex items-center gap-1.5">
            <WarningOutlined className="text-amber-500 flex-shrink-0" />
            <span>{aspectRatioWarning}</span>
          </div>
        )}

        <Form.Item
          name="linkUrl"
          label={
            <div className="flex items-center gap-1.5">
              <span>Liên kết điều hướng (Khi bấm vào banner)</span>
              <LinkOutlined className="text-gray-400" />
            </div>
          }
          rules={[{ required: true, message: 'Nhập hoặc chọn link điều hướng' }]}
        >
          <AutoComplete
            onSearch={handleSearchPhone}
            placeholder="Gõ tên điện thoại (vd: iPhone 15, S24...) hoặc chọn trang đích..."
            allowClear
            options={[
              // Nhóm 1: Kết quả tìm kiếm điện thoại realtime
              ...(phoneOptions.length > 0
                ? [
                    {
                      label: (
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 bg-emerald-50/70 px-2 py-1 rounded">
                          <span className="flex items-center gap-1">
                            <MobileOutlined /> Sản phẩm gợi ý phù hợp
                          </span>
                          {isSearchingPhone && <Spin size="small" />}
                        </div>
                      ),
                      options: phoneOptions.map((phone) => ({
                        value: `/san-pham/${phone.id}`,
                        label: (
                          <div className="flex items-center justify-between py-1 px-1 hover:bg-emerald-50/40 rounded transition">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {phone.mainImageUrl ? (
                                <img
                                  src={phone.mainImageUrl}
                                  alt={phone.name}
                                  className="h-7 w-7 rounded object-cover border border-gray-100 shrink-0"
                                />
                              ) : (
                                <div className="h-7 w-7 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                  <MobileOutlined className="text-gray-400 text-xs" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-gray-900 truncate">{phone.name}</p>
                                <p className="text-[10px] text-gray-400">/san-pham/{phone.id}</p>
                              </div>
                            </div>
                            <Tag color="green" className="!mr-0 text-[10px] shrink-0">
                              {phone.brandName || 'Điện thoại'}
                            </Tag>
                          </div>
                        ),
                      })),
                    },
                  ]
                : []),

              // Nhóm 2: Các trang điều hướng phổ biến
              {
                label: (
                  <div className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    Trang đích hệ thống
                  </div>
                ),
                options: COMMON_DESTINATIONS.filter(
                  (dest) =>
                    !phoneSearchText ||
                    dest.label.toLowerCase().includes(phoneSearchText.toLowerCase()) ||
                    dest.value.toLowerCase().includes(phoneSearchText.toLowerCase())
                ).map((dest) => ({
                  value: dest.value,
                  label: (
                    <div className="flex items-center justify-between py-1 px-1">
                      <span className="text-xs font-medium text-gray-800">{dest.label}</span>
                      <Tag color="cyan" className="!mr-0 text-[10px]">
                        {dest.tag}
                      </Tag>
                    </div>
                  ),
                })),
              },
            ]}
          />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4 items-start">
          <Form.Item
            name="position"
            label="Vị trí hiển thị"
            rules={[{ required: true, message: 'Chọn vị trí hiển thị' }]}
            className="mb-0"
          >
            <Select
              className="w-full"
              options={[
                { value: 'HERO', label: 'Slider chính (Hero Banner)' },
                { value: 'SUB_BANNER', label: 'Banner phụ (Sub Banner)' },
                { value: 'PROMOTION', label: 'Banner khuyến mãi nổi bật' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="sortOrder"
            label="Thứ tự hiển thị"
            tooltip="Số càng nhỏ sẽ được ưu tiên hiển thị trước (vd: 0, 1, 2...)"
            rules={[{ required: true, message: 'Nhập thứ tự hiển thị' }]}
            className="mb-0"
          >
            <InputNumber className="!w-full" min={0} placeholder="VD: 0" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

