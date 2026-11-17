import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, App, Alert, Progress } from 'antd';
import { Lock, Mail, KeyRound, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import authHeroImg from '@/assets/auth_img.jpg';
import { ROUTES } from '@/routes/routePaths';
import { authService } from '@/services/authService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCredentials, clearError } from '@/store/slices/authSlice';
import { cn } from '@/utils';
import { useAuthLayout } from './AuthLayout';

const OTP_LENGTH = 6;

interface ResetPasswordFormValues {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const { setConfig } = useAuthLayout();
  useEffect(() => {
    setConfig({
      title: 'Đặt lại mật khẩu',
      subtitle: 'Nhập mã xác thực OTP 6 số và thiết lập mật khẩu mới an toàn cho tài khoản của bạn.',
      heroImage: authHeroImg,
    });
  }, [setConfig]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const [form] = Form.useForm<ResetPasswordFormValues>();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');

  // 6 Pin digits state for beautiful OTP inputs
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState<string | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (initialEmail) {
      form.setFieldsValue({ email: initialEmail });
    }
  }, [initialEmail, form]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const passwordStrength = useMemo(() => {
    if (!passwordValue) return { score: 0, label: '', color: '#d9d9d9' };
    let score = 0;
    if (passwordValue.length >= 6) score += 1;
    if (passwordValue.length >= 8) score += 1;
    if (/[A-Z]/.test(passwordValue) && /[a-z]/.test(passwordValue)) score += 1;
    if (/\d/.test(passwordValue)) score += 1;
    if (/[^A-Za-z0-9]/.test(passwordValue)) score += 1;

    if (score <= 2) return { score: 25, label: 'Yếu', color: '#ff4d4f' };
    if (score === 3) return { score: 50, label: 'Trung bình', color: '#faad14' };
    if (score === 4) return { score: 75, label: 'Khá', color: '#1890ff' };
    return { score: 100, label: 'Mạnh', color: '#52c41a' };
  }, [passwordValue]);

  const handleOtpChange = (index: number, value: string) => {
    setOtpError(null);
    const cleaned = value.replace(/\D/g, '').slice(0, 1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    const fullCode = newDigits.join('');
    form.setFieldValue('otp', fullCode);

    if (cleaned && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setOtpError(null);

    const newDigits = Array(OTP_LENGTH)
      .fill('')
      .map((_, i) => pasted[i] || '');
    setOtpDigits(newDigits);

    const fullCode = newDigits.join('');
    form.setFieldValue('otp', fullCode);

    const nextFocusIndex = Math.min(pasted.length, OTP_LENGTH) - 1;
    inputsRef.current[Math.max(0, nextFocusIndex)]?.focus();
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    const email = form.getFieldValue('email');
    if (!email) {
      message.warning('Vui lòng nhập địa chỉ email trước khi gửi lại mã');
      return;
    }
    setResendLoading(true);
    setErrorMessage(null);
    try {
      await authService.resendOTP(email);
      setResendCooldown(60);
      message.success('Đã gửi lại mã OTP đến email của bạn');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi lại mã OTP';
      message.error(msg);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    const code = otpDigits.join('');
    if (code.length !== OTP_LENGTH) {
      setOtpError('Vui lòng nhập đủ 6 chữ số mã OTP');
      inputsRef.current[Math.min(code.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await authService.resetPassword(values.email, code, values.newPassword);
      if (res && res.token) {
        dispatch(
          setCredentials({
            user: {
              id: res.userId,
              email: res.email,
              fullName: res.fullName,
              role: res.role,
            },
            token: res.token,
          })
        );
        message.success('Đặt lại mật khẩu thành công! Đã đăng nhập vào hệ thống');
        navigate('/', { replace: true });
      } else {
        message.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
        navigate(ROUTES.LOGIN, { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <KeyRound className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h2>
        <p className="mt-1 text-sm text-gray-500">
          Nhập mã OTP 6 số đã được gửi qua email và tạo mật khẩu mới
        </p>
      </div>

      {errorMessage && (
        <Alert
          message={errorMessage}
          title={errorMessage}
          type="error"
          showIcon
          closable
          className="mb-4 rounded-xl"
          onClose={() => setErrorMessage(null)}
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
          label={<span className="text-sm font-medium text-gray-700">Email tài khoản</span>}
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

        {/* Cụm 6 ô nhập mã OTP chuyên nghiệp */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Mã xác thực OTP <span className="text-xs text-gray-400">(6 số)</span>
            </label>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || resendLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 transition-colors hover:text-green-700 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', resendLoading && 'animate-spin')} />
              {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại mã'}
            </button>
          </div>

          <div
            className="flex items-center justify-between gap-2 sm:gap-2.5"
            onPaste={handleOtpPaste}
          >
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                aria-label={`Mã OTP số ${index + 1}`}
                data-testid={`otp-input-${index}`}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className={cn(
                  'h-13 w-11 sm:h-14 sm:w-12 rounded-xl border-2 bg-white text-center text-2xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-green-100 shadow-sm',
                  digit
                    ? 'border-green-600 bg-green-50/40 text-green-900'
                    : 'border-gray-200 text-gray-800 hover:border-gray-300 focus:border-green-500',
                  otpError && 'border-red-400 bg-red-50/20'
                )}
              />
            ))}
          </div>

          {/* Form Item ẩn để Ant Design Form vẫn quản lý và validate field 'otp' */}
          <Form.Item
            name="otp"
            initialValue=""
            rules={[
              {
                validator: () => {
                  const code = otpDigits.join('');
                  if (code.length < OTP_LENGTH) {
                    return Promise.reject(new Error('Vui lòng nhập đủ 6 chữ số mã OTP'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
            className="!mb-0"
          >
            <input type="hidden" />
          </Form.Item>
        </div>

        <Form.Item
          label={<span className="text-sm font-medium text-gray-700">Mật khẩu mới</span>}
          name="newPassword"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            { min: 6, message: 'Mật khẩu phải có tối thiểu 6 ký tự' },
          ]}
        >
          <Input.Password
            size="large"
            prefix={<Lock className="h-4 w-4 text-gray-400" />}
            placeholder="Tối thiểu 6 ký tự"
            className="!h-12 !rounded-xl"
            autoComplete="new-password"
            onChange={(e) => setPasswordValue(e.target.value)}
          />
        </Form.Item>

        {passwordValue && (
          <div className="mb-4 -mt-2">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>Độ mạnh mật khẩu:</span>
              <span style={{ color: passwordStrength.color }} className="font-semibold">
                {passwordStrength.label}
              </span>
            </div>
            <Progress
              percent={passwordStrength.score}
              strokeColor={passwordStrength.color}
              showInfo={false}
              size="small"
            />
          </div>
        )}

        <Form.Item
          label={<span className="text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</span>}
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận lại mật khẩu' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
              },
            }),
          ]}
        >
          <Input.Password
            size="large"
            prefix={<Lock className="h-4 w-4 text-gray-400" />}
            placeholder="Nhập lại mật khẩu mới"
            className="!h-12 !rounded-xl"
            autoComplete="new-password"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={loading}
          className="!h-12 !rounded-full !bg-green-600 !font-semibold hover:!bg-green-700 shadow-sm"
        >
          Đặt lại mật khẩu & Đăng nhập
        </Button>
      </Form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => navigate(ROUTES.LOGIN)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-green-600"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại trang đăng nhập
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-xs text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        Bảo mật 2 lớp: Mã OTP xác thực có thời hạn 5 phút
      </div>
    </>
  );
}
