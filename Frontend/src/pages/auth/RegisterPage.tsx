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
      const cleanPhone = values.phone.trim().replace(/[\s\-\.]/g, '');
      const normalizedPhone = cleanPhone.startsWith('+84')
        ? '0' + cleanPhone.substring(3)
        : cleanPhone.startsWith('84') && cleanPhone.length === 11
          ? '0' + cleanPhone.substring(2)
          : cleanPhone;

      await dispatch(
        registerThunk({
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          phone: normalizedPhone,
          password: values.password,
        }),
      ).unwrap();
      message.success('Mã OTP đã được gửi đến email của bạn');
      navigate(ROUTES.VERIFY_OTP + '?email=' + encodeURIComponent(values.email.trim()), { replace: true });
    } catch (err: any) {
      const errorMsg = err?.message || 'Đăng ký không thành công';
      if (errorMsg.toLowerCase().includes('số điện thoại')) {
        form.setFields([{ name: 'phone', errors: [errorMsg] }]);
      } else if (errorMsg.toLowerCase().includes('email')) {
        form.setFields([{ name: 'email', errors: [errorMsg] }]);
      }
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
            { whitespace: true, message: 'Họ tên không được chỉ chứa khoảng trắng' },
            { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự' },
            { max: 50, message: 'Họ tên không được vượt quá 50 ký tự' },
          ]}
        >
          <Input
            size="large"
            maxLength={50}
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
            { max: 100, message: 'Email không được vượt quá 100 ký tự' },
          ]}
        >
          <Input
            size="large"
            maxLength={100}
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
              pattern: /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/,
              message: 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08, 09 hoặc +84)',
            },
          ]}
        >
          <Input
            size="large"
            maxLength={12}
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
            { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
            { max: 64, message: 'Mật khẩu không được vượt quá 64 ký tự' },
            () => ({
              validator(_, value) {
                if (!value) return Promise.resolve();
                if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
                  return Promise.reject(new Error('Mật khẩu cần chứa cả chữ cái và số'));
                }
                return Promise.resolve();
              },
            }),
          ]}
          extra={
            showStrength ? <PasswordStrength password={password} /> : null
          }
        >
          <Input
            size="large"
            maxLength={64}
            prefix={<Lock className="h-4 w-4 text-gray-400" />}
            type={showPassword ? 'text' : 'password'}
            placeholder="Tối thiểu 6 ký tự, gồm cả chữ và số"
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
            maxLength={64}
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
