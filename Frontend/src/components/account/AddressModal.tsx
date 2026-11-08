import { useEffect } from 'react';
import { Modal, Form, Input, Select, Checkbox, Button } from 'antd';
import { UserOutlined, PhoneOutlined, HomeOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { VIETNAM_PROVINCES } from '@/utils/provinces';
import type { AddressItem, AddressRequest } from '@/types/api';

interface AddressModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: AddressRequest) => Promise<void>;
  initialData?: AddressItem | null;
  loading?: boolean;
}

export default function AddressModal({
  open,
  onCancel,
  onSubmit,
  initialData,
  loading = false,
}: AddressModalProps) {
  const [form] = Form.useForm<AddressRequest>();

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          receiverName: initialData.receiverName,
          receiverPhone: initialData.receiverPhone,
          province: initialData.province,
          district: initialData.district || '',
          ward: initialData.ward || '',
          streetAddress: initialData.streetAddress,
          note: initialData.note || '',
          isDefault: initialData.isDefault,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          province: 'Hà Nội',
          isDefault: false,
        });
      }
    }
  }, [open, initialData, form]);

  const handleFinish = async (values: AddressRequest) => {
    await onSubmit({
      receiverName: values.receiverName.trim(),
      receiverPhone: values.receiverPhone.trim(),
      province: values.province.trim(),
      district: values.district?.trim() || '',
      ward: values.ward?.trim() || '',
      streetAddress: values.streetAddress.trim(),
      note: values.note?.trim() || '',
      isDefault: !!values.isDefault,
    });
  };

  const isEditing = !!initialData;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
          <EnvironmentOutlined className="text-green-600" />
          <span>{isEditing ? 'Chỉnh sửa địa chỉ nhận hàng' : 'Thêm địa chỉ nhận hàng mới'}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      centered
      className="max-w-xl"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        className="pt-2"
        requiredMark="optional"
      >
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          {/* Receiver Name */}
          <Form.Item
            name="receiverName"
            label={<span className="text-sm font-medium text-gray-700">Tên người nhận</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập tên người nhận' },
              {
                validator: (_, val) => {
                  if (val && val.trim().length < 2) {
                    return Promise.reject(new Error('Tên người nhận tối thiểu 2 ký tự'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              size="large"
              placeholder="Nguyễn Văn A"
              className="!rounded-xl"
            />
          </Form.Item>

          {/* Receiver Phone */}
          <Form.Item
            name="receiverPhone"
            label={<span className="text-sm font-medium text-gray-700">Số điện thoại</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại' },
              {
                pattern: /^0\d{9}$/,
                message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng số 0',
              },
            ]}
          >
            <Input
              prefix={<PhoneOutlined className="text-gray-400" />}
              size="large"
              placeholder="0912345678"
              className="!rounded-xl"
            />
          </Form.Item>
        </div>

        {/* Administrative divisions */}
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          {/* Province / City */}
          <Form.Item
            name="province"
            label={<span className="text-sm font-medium text-gray-700">Tỉnh / Thành phố</span>}
            rules={[{ required: true, message: 'Chọn Tỉnh/Thành' }]}
          >
            <Select
              size="large"
              showSearch
              placeholder="Chọn Tỉnh/TP"
              className="w-full !rounded-xl"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={VIETNAM_PROVINCES.map((p) => ({ value: p, label: p }))}
            />
          </Form.Item>

          {/* District */}
          <Form.Item
            name="district"
            label={<span className="text-sm font-medium text-gray-700">Quận / Huyện</span>}
            rules={[{ required: true, message: 'Nhập Quận/Huyện' }]}
          >
            <Input size="large" placeholder="Quận / Huyện" className="!rounded-xl" />
          </Form.Item>

          {/* Ward */}
          <Form.Item
            name="ward"
            label={<span className="text-sm font-medium text-gray-700">Phường / Xã</span>}
            rules={[{ required: true, message: 'Nhập Phường/Xã' }]}
          >
            <Input size="large" placeholder="Phường / Xã" className="!rounded-xl" />
          </Form.Item>
        </div>

        {/* Street Address */}
        <Form.Item
          name="streetAddress"
          label={<span className="text-sm font-medium text-gray-700">Địa chỉ cụ thể (Số nhà, tên đường)</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập số nhà, tên đường' },
            {
              validator: (_, val) => {
                if (val && val.trim().length < 5) {
                  return Promise.reject(new Error('Địa chỉ cụ thể tối thiểu 5 ký tự'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            prefix={<HomeOutlined className="text-gray-400" />}
            size="large"
            placeholder="Số 123 Đường Cầu Giấy, Tòa nhà Green"
            className="!rounded-xl"
          />
        </Form.Item>

        {/* Note */}
        <Form.Item
          name="note"
          label={<span className="text-sm font-medium text-gray-700">Ghi chú giao hàng (Tùy chọn)</span>}
        >
          <Input.TextArea
            rows={2}
            placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến..."
            className="!rounded-xl"
            style={{ resize: 'none' }}
          />
        </Form.Item>

        {/* Default Checkbox */}
        <Form.Item name="isDefault" valuePropName="checked" className="mb-6">
          <Checkbox className="text-sm font-medium text-gray-700">
            Đặt làm địa chỉ nhận hàng mặc định
          </Checkbox>
        </Form.Item>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button
            onClick={onCancel}
            disabled={loading}
            className="!h-10 !rounded-xl !px-5 text-sm"
          >
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="!h-10 !rounded-xl !bg-green-600 !px-6 text-sm font-semibold hover:!bg-green-700 shadow-sm"
          >
            {isEditing ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
