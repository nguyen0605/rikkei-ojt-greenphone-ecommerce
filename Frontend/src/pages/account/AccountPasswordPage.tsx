import { useMutation } from '@tanstack/react-query';
import { Form, Input, Button, Card, App } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { userService } from '@/services';

interface PasswordForm { oldPassword: string; newPassword: string; confirmPassword: string }

export default function AccountPasswordPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<PasswordForm>();
  const mut = useMutation({
    mutationFn: (v: { oldPassword: string; newPassword: string }) => userService.changePassword(v),
    onSuccess: () => { message.success('Đổi mật khẩu thành công!'); form.resetFields(); },
    onError: () => message.error('Mật khẩu cũ không đúng'),
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Đổi mật khẩu</h2>
        <p className="mt-1 text-sm text-gray-500">Cập nhật mật khẩu để bảo vệ tài khoản</p>
      </div>

      <Card className="max-w-md !border-gray-100 !rounded-2xl !shadow-sm">
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => mut.mutate({ oldPassword: v.oldPassword, newPassword: v.newPassword })}
        >
          <Form.Item
            name="oldPassword"
            label={<span className="text-sm font-medium text-gray-700">Mật khẩu hiện tại</span>}
            rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              size="large"
              className="!rounded-xl"
              placeholder="Nhập mật khẩu hiện tại"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label={<span className="text-sm font-medium text-gray-700">Mật khẩu mới</span>}
            rules={[
              { required: true, message: 'Nhập mật khẩu mới' },
              { min: 6, message: 'Tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              size="large"
              className="!rounded-xl"
              placeholder="Tối thiểu 6 ký tự"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={<span className="text-sm font-medium text-gray-700">Xác nhận mật khẩu</span>}
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Xác nhận mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator: (_, v) =>
                  v === getFieldValue('newPassword')
                    ? Promise.resolve()
                    : Promise.reject('Mật khẩu không khớp'),
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              size="large"
              className="!rounded-xl"
              placeholder="Nhập lại mật khẩu mới"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={mut.isPending}
            className="!h-11 !w-full !rounded-xl !bg-green-600 !text-sm !font-semibold hover:!bg-green-700"
          >
            Đổi mật khẩu
          </Button>
        </Form>
      </Card>
    </div>
  );
}
