import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Form, Input, Button, Card, App, Progress } from 'antd';
import {
  LockOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { userService } from '@/services';
import type { ChangePasswordRequest } from '@/types/api';

interface PasswordFormValues {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface StrengthResult {
  score: number; // 0 - 4
  label: string;
  color: string;
  hasMinLength: boolean;
  hasLetterAndNumber: boolean;
  hasSpecialChar: boolean;
}

function calculatePasswordStrength(pass: string): StrengthResult {
  if (!pass) {
    return {
      score: 0,
      label: 'Chưa nhập',
      color: '#d9d9d9',
      hasMinLength: false,
      hasLetterAndNumber: false,
      hasSpecialChar: false,
    };
  }

  const hasMinLength = pass.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(pass);
  const hasNumber = /\d/.test(pass);
  const hasLetterAndNumber = hasLetter && hasNumber;
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass);
  const isLonger = pass.length >= 8;

  let score = 0;
  if (hasMinLength) score += 1;
  if (isLonger) score += 1;
  if (hasLetterAndNumber) score += 1;
  if (hasSpecialChar) score += 1;

  switch (score) {
    case 1:
      return { score, label: 'Yếu', color: '#ff4d4f', hasMinLength, hasLetterAndNumber, hasSpecialChar };
    case 2:
      return { score, label: 'Trung bình', color: '#faad14', hasMinLength, hasLetterAndNumber, hasSpecialChar };
    case 3:
      return { score, label: 'Khá tốt', color: '#52c41a', hasMinLength, hasLetterAndNumber, hasSpecialChar };
    case 4:
      return { score, label: 'Rất mạnh', color: '#16a34a', hasMinLength, hasLetterAndNumber, hasSpecialChar };
    default:
      return { score: 0, label: 'Rất yếu', color: '#ff4d4f', hasMinLength, hasLetterAndNumber, hasSpecialChar };
  }
}

export default function ChangePasswordForm() {
  const { message } = App.useApp();
  const [form] = Form.useForm<PasswordFormValues>();
  const [newPasswordVal, setNewPasswordVal] = useState('');

  const strength = useMemo(() => calculatePasswordStrength(newPasswordVal), [newPasswordVal]);

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) => userService.changePassword(data),
    onSuccess: () => {
      message.success('Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật.');
      form.resetFields();
      setNewPasswordVal('');
    },
    onError: (err: Error) => {
      // Backend error message (ví dụ: "Current password is incorrect")
      const errMsg = err.message || 'Mật khẩu hiện tại không chính xác';
      message.error(errMsg);
    },
  });

  const handleFinish = (values: PasswordFormValues) => {
    // Không ghi log mật khẩu ra console hoặc storage
    changePasswordMutation.mutate({
      oldPassword: values.oldPassword,
      newPassword: values.newPassword,
    });
  };

  return (
    <Card className="max-w-lg !border-gray-100 !rounded-2xl !shadow-sm">
      <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
        <SafetyCertificateOutlined className="text-green-600 text-lg" />
        <div>
          <h3 className="text-base font-bold text-gray-900">Thiết lập mật khẩu mới</h3>
          <p className="text-xs text-gray-500">Mật khẩu cần tối thiểu 6 ký tự để đảm bảo an toàn</p>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark="optional"
        autoComplete="off"
      >
        {/* Old password */}
        <Form.Item
          name="oldPassword"
          label={<span className="text-sm font-medium text-gray-700">Mật khẩu hiện tại</span>}
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            size="large"
            placeholder="Nhập mật khẩu đang sử dụng"
            className="!rounded-xl"
            autoComplete="current-password"
          />
        </Form.Item>

        {/* New password */}
        <Form.Item
          name="newPassword"
          label={<span className="text-sm font-medium text-gray-700">Mật khẩu mới</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            { min: 6, message: 'Mật khẩu mới tối thiểu 6 ký tự' },
            ({ getFieldValue }) => ({
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                if (value === getFieldValue('oldPassword')) {
                  return Promise.reject(new Error('Mật khẩu mới không được trùng với mật khẩu hiện tại'));
                }
                if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
                  return Promise.reject(new Error('Mật khẩu mới cần chứa cả chữ cái và số'));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            size="large"
            placeholder="Tối thiểu 6 ký tự, gồm cả chữ và số"
            className="!rounded-xl"
            autoComplete="new-password"
            onChange={(e) => setNewPasswordVal(e.target.value)}
          />
        </Form.Item>

        {/* Password Strength Indicator */}
        {newPasswordVal && (
          <div className="mb-4 rounded-xl bg-gray-50 p-3.5 border border-gray-100">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-gray-600">Độ mạnh mật khẩu:</span>
              <span className="font-bold" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
            <Progress
              percent={(strength.score / 4) * 100}
              showInfo={false}
              strokeColor={strength.color}
              size="small"
              className="!mb-3"
            />

            {/* Checklist */}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                {strength.hasMinLength ? (
                  <CheckCircleFilled className="text-green-600" />
                ) : (
                  <CloseCircleFilled className="text-gray-300" />
                )}
                <span className={strength.hasMinLength ? 'text-gray-800' : 'text-gray-400'}>
                  Tối thiểu 6 ký tự
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {strength.hasLetterAndNumber ? (
                  <CheckCircleFilled className="text-green-600" />
                ) : (
                  <CloseCircleFilled className="text-gray-300" />
                )}
                <span className={strength.hasLetterAndNumber ? 'text-gray-800' : 'text-gray-400'}>
                  Bao gồm chữ và số
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {strength.hasSpecialChar ? (
                  <CheckCircleFilled className="text-green-600" />
                ) : (
                  <CloseCircleFilled className="text-gray-300" />
                )}
                <span className={strength.hasSpecialChar ? 'text-gray-800' : 'text-gray-400'}>
                  Ký tự đặc biệt (tùy chọn)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Confirm password */}
        <Form.Item
          name="confirmPassword"
          label={<span className="text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</span>}
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận lại mật khẩu mới' },
            ({ getFieldValue }) => ({
              validator: (_, value) => {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            size="large"
            placeholder="Nhập lại mật khẩu mới vừa đặt"
            className="!rounded-xl"
            autoComplete="new-password"
          />
        </Form.Item>

        <div className="pt-2">
          <Button
            type="primary"
            htmlType="submit"
            loading={changePasswordMutation.isPending}
            disabled={changePasswordMutation.isPending}
            className="!h-11 !w-full !rounded-xl !bg-green-600 !text-sm !font-semibold hover:!bg-green-700 shadow-md shadow-green-200"
          >
            Đổi mật khẩu
          </Button>
        </div>
      </Form>
    </Card>
  );
}
