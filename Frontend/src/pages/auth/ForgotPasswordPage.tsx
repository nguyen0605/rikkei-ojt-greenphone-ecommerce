import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, App } from 'antd';
import {
  ShieldCheck,
  KeyRound,
  Mail,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import authHeroImg from '@/assets/auth_img.jpg';
import { post } from '@/services/api';
import { useAuthLayout } from './AuthLayout';

export default function ForgotPasswordPage() {

  const navigate = useNavigate();
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const { setConfig } = useAuthLayout();
  useEffect(() => {
    setConfig({
      title: 'Quên mật khẩu?',
      subtitle:
        'Đừng lo lắng! Chúng tôi sẽ giúp bạn khôi phục mật khẩu để tiếp tục mua sắm tại GreenPhone.',
      heroImage: authHeroImg,
    });
  }, [setConfig]);

  const [submitted, setSubmitted] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm<{ email: string }>();

  useEffect(() => {
    if (initialEmail) form.setFieldsValue({ email: initialEmail });
  }, [initialEmail, form]);

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    setError(null);
    try {
      await post('/auth/forgot-password', { email: values.email });
      setSentTo(values.email);
      setSubmitted(true);
      message.success('Đã gửi mã OTP đến email của bạn');
    } catch {
      setError('Không thể gửi yêu cầu. Vui lòng kiểm tra lại email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!submitted ? (
        <>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <KeyRound className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Quên mật khẩu?</h2>
            <p className="mt-1 text-sm text-gray-500">
              Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu
            </p>
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-center text-sm text-red-600">{error}</p>
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
          >
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

            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              className="!h-12 !rounded-full !bg-green-600 !font-semibold hover:!bg-green-700"
            >
              Gửi link đặt lại
            </Button>
          </Form>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mx-auto mt-6 flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-green-600"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
          </button>
        </>
      ) : (
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <ShieldCheck className="h-8 w-8" strokeWidth={2.2} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Đã gửi mã OTP!
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Chúng tôi đã gửi mã OTP 6 số đến email{' '}
            <span className="font-semibold text-gray-700">{sentTo}</span>.
            Vui lòng kiểm tra hộp thư (cả thư mục spam) để xác thực.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              type="primary"
              block
              size="large"
              className="!h-12 !rounded-full !bg-green-600 !font-semibold hover:!bg-green-700"
              onClick={() => navigate('/xac-thuc-otp?email=' + encodeURIComponent(sentTo))}
            >
              Đi đến xác thực OTP
            </Button>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setSentTo('');
                form.resetFields();
              }}
              className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-600 hover:text-green-600"
            >
              <RefreshCw className="h-4 w-4" /> Gửi lại email khác
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-xs text-green-700">
        <ShieldCheck className="h-4 w-4" />
        Liên kết đặt lại có hiệu lực trong 30 phút
      </div>
    </>
  );
}
