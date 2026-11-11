import { Modal, Form, Select, Button, message, Alert } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminStaffService } from '@/services/adminStaffService';
import type { StaffDTO } from '@/types/api';
import { useEffect } from 'react';

interface StaffRoleModalProps {
  staff: StaffDTO | null;
  open: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: 'ROLE_SALES', label: 'Nhân viên kinh doanh & Đơn hàng' },
  { value: 'ROLE_WAREHOUSE', label: 'Nhân viên thủ kho & Bảo hành' },
  { value: 'ROLE_MARKETING', label: 'Nhân viên marketing & Sản phẩm' },
  { value: 'ROLE_ADMIN', label: 'Quản trị viên tối cao' },
];

export default function StaffRoleModal({ staff, open, onClose }: StaffRoleModalProps) {
  const [form] = Form.useForm();
  const qc = useQueryClient();

  useEffect(() => {
    if (staff) {
      form.setFieldsValue({ role: staff.role });
    }
  }, [staff, form]);

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      adminStaffService.updateRole(id, { role }),
    onSuccess: () => {
      message.success('Cập nhật vai trò nhân viên thành công');
      qc.invalidateQueries({ queryKey: ['admin-staff'] });
      onClose();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || err?.message || 'Không thể cập nhật vai trò');
    },
  });

  const handleSubmit = async () => {
    if (!staff) return;
    try {
      const values = await form.validateFields();
      updateMutation.mutate({ id: staff.id, role: values.role });
    } catch {
      // form error
    }
  };

  return (
    <Modal
      title="Điều chỉnh vai trò nhân viên"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={updateMutation.isPending}
          onClick={handleSubmit}
          className="!bg-primary-600 hover:!bg-primary-700"
        >
          Lưu thay đổi
        </Button>,
      ]}
      destroyOnClose
    >
      <div className="pt-2">
        <Alert
          message="Lưu ý quyền hạn"
          description={`Thay đổi vai trò của nhân viên "${staff?.fullName}" sẽ điều chỉnh ngay lập tức các quyền truy cập trên thanh menu và API quản trị.`}
          type="info"
          showIcon
          className="mb-4"
        />

        <Form form={form} layout="vertical">
          <Form.Item
            name="role"
            label="Chọn vai trò mới"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
