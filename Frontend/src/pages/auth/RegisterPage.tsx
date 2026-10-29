import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Alert, App } from 'antd';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  registerThunk,
  clearError,
} from '@/store/slices/authSlice';
import authHeroImg from '@/assets/auth_img.jpg';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { useAuthLayout } from './AuthLayout';
import { ROUTES } from '@/routes/routePaths';

interface RegisterFormValues {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agree: boolean;
}

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const { setConfig } = useAuthLayout();
  useEffect(() => {
    setConfig({
      title: 'Tạo tài khoản GreenPhone',
      subtitle:
        'Trở thành thành viên để nhận ngay ưu đãi sinh nhật, voucher độc quyền và tích điểm đổi quà mỗi đơn hàng.',
      heroImage: authHeroImg,
    });
  }, [setConfig]);

  const { error, loading, isAuthenticated, user } = useAppSelector((s) => s.auth);
  const [form] = Form.useForm<RegisterFormValues>();
  const password = Form.useWatch('password', form) || '';
  const showStrength = !!password;

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = async (values: RegisterFormValues) => {
    try {
      const result = await dispatch(
        registerThunk({
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          password: values.password,
        }),
      ).unwrap();
      message.success('Mã OTP đã được gửi đến email của bạn');
      navigate(ROUTES.VERIFY_OTP + '?email=' + encodeURIComponent(values.email), { replace: true });
    } catch {
      // Error handled by Redux state — show Alert via `error` selector
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <Sparkles className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Đăng ký tài khoản</h2>
        <p className="mt-1 text-sm text-gray-500">
          Tạo tài khoản miễn phí để trải nghiệm mua sắm thông minh
        </p>
      </div>

      {error && (
        <Alert
          title={error}
          type="error"
          showIcon
          closable
          className="mb-4"
          onClose={() => dispatch(clearError())}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
        autoComplete="off"
      >
        <Form.Item
          label={<span className="text-sm font-medium text-gray-700">Họ và tên</span>}
          name="fullName"
          rules={[
            { required: true, message: 'Vui lòng nhập họ tên' },
            { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự' },
          ]}
        >
          <Input
            size="large"
            prefix={<User className="h-4 w-4 text-gray-400" />}
            placeholder="Nguyễn Văn A"
            className="!h-12 !rounded-xl"
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-sm font-medium text-gray-700">Email</span>}
          name="email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input
            size="large"
            prefix={<Mail className="h-4 w-4 text-gray-400" />}
            placeholder="example@gmail.com"
            className="!h-12 !rounded-xl"
            autoComplete="email"
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-sm font-medium text-gray-700">Số điện thoại</span>}
          name="phone"
          rules={[
            { required: true, message: 'Vui lòng nhập số điện thoại' },
            {
              pattern: /^(0|\+84)\d{9,10}$/,
              message: 'Số điện thoại không hợp lệ',
            },
          ]}
        >
          <Input
            size="large"
            prefix={<Phone className="h-4 w-4 text-gray-400" />}
            placeholder="0901234567"
            className="!h-12 !rounded-xl"
            autoComplete="tel"
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-sm font-medium text-gray-700">Mật khẩu</span>}
          name="password"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu' },
            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
          ]}
          extra={
            showStrength ? <PasswordStrength password={password} /> : null
          }
        >
          <Input
            size="large"
            prefix={<Lock className="h-4 w-4 text-gray-400" />}
            type={showPassword ? 'text' : 'password'}
            placeholder="Nhập mật khẩu"
            className="!h-12 !rounded-xl"
            autoComplete="new-password"
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-sm font-medium text-gray-700">Xác nhận mật khẩu</span>}
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error('Mật khẩu xác nhận không khớp'),
                );
              },
            }),
          ]}
        >
          <Input
            size="large"
            prefix={<Lock className="h-4 w-4 text-gray-400" />}
            type={showConfirm ? 'text' : 'password'}
            placeholder="Nhập lại mật khẩu"
            className="!h-12 !rounded-xl"
            autoComplete="new-password"
            suffix={
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />
        </Form.Item>

        <Form.Item
          name="agree"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error('Bạn cần đồng ý với điều khoản để tiếp tục'),
                    ),
            },
          ]}
          className="!mb-4"
        >
          <Checkbox className="text-xs text-gray-600">
            Tôi đồng ý với{' '}
            <Link to={ROUTES.DIEU_KHOAN} className="font-medium text-green-600">
              Điều khoản
            </Link>{' '}
            &{' '}
            <Link to={ROUTES.CHINH_SACH_BAO_MAT} className="font-medium text-green-600">
              Chính sách bảo mật
            </Link>{' '}
            của GreenPhone
          </Checkbox>
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={loading}
          className="!h-12 !rounded-full !bg-green-600 !font-semibold hover:!bg-green-700"
        >
          Tạo tài khoản
        </Button>
      </Form>

      {/* Footer link */}
      <p className="mt-6 text-center text-sm text-gray-600">
        Đã có tài khoản?{' '}
        <Link
          to={ROUTES.LOGIN}
          className="font-semibold text-green-600 hover:text-green-700"
        >
          Đăng nhập
        </Link>
      </p>

      {/* Trust footer */}
      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-xs text-green-700">
        <ShieldCheck className="h-4 w-4" />
        Thông tin của bạn được bảo mật an toàn
      </div>
    </>
  );
}
