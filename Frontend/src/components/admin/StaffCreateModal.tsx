import { Modal, Form, Input, Select, Button, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminStaffService } from '@/services/adminStaffService';
import type { CreateStaffRequest } from '@/types/api';

interface StaffCreateModalProps {
  open: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: 'ROLE_SALES', label: 'Nhân viên kinh doanh & Đơn hàng' },
  { value: 'ROLE_WAREHOUSE', label: 'Nhân viên thủ kho & Bảo hành' },
  { value: 'ROLE_MARKETING', label: 'Nhân viên marketing & Sản phẩm' },
  { value: 'ROLE_ADMIN', label: 'Quản trị viên tối cao' },
];

export default function StaffCreateModal({ open, onClose }: StaffCreateModalProps) {
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateStaffRequest) => adminStaffService.create(data),
    onSuccess: () => {
      message.success('Tạo tài khoản nhân viên mới thành công');
      qc.invalidateQueries({ queryKey: ['admin-staff'] });
      form.resetFields();
      onClose();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || err?.message || 'Không thể tạo nhân viên');
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      createMutation.mutate(values);
    } catch {
      // form validation error
    }
  };

  return (
    <Modal
      title="Thêm mới nhân viên nội bộ"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={createMutation.isPending}
          onClick={handleSubmit}
          className="!bg-primary-600 hover:!bg-primary-700"
        >
          Tạo tài khoản
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="pt-2">
        <Form.Item
          name="fullName"
          label="Họ và tên nhân viên"
          rules={[{ required: true, message: 'Vui lòng nhập họ và tên nhân viên' }]}
        >
          <Input placeholder="Ví dụ: Nguyễn Văn Kho" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email đăng nhập"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input placeholder="kho.nguyen@greenphone.vn" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Số điện thoại liên hệ"
          rules={[
            { required: true, message: 'Vui lòng nhập số điện thoại' },
            { pattern: /^[0-9]{9,15}$/, message: 'Số điện thoại từ 9 đến 15 chữ số' },
          ]}
        >
          <Input placeholder="0987654321" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Mật khẩu khởi tạo"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu' },
            { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
          ]}
        >
          <Input.Password placeholder="Nhập mật khẩu ít nhất 6 ký tự" />
        </Form.Item>

        <Form.Item
          name="role"
          label="Vai trò nghiệp vụ"
          rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          initialValue="ROLE_SALES"
        >
          <Select options={ROLE_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
