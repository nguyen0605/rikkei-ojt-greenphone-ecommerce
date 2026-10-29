import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, App, Alert } from 'antd';
import { ShieldCheck, KeyRound, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import authHeroImg from '@/assets/auth_img.jpg';
import { useAuthLayout } from './AuthLayout';
import { cn } from '@/utils';
import { ROUTES } from '@/routes/routePaths';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { verifyOTPThunk, clearError } from '@/store/slices/authSlice';
import { post } from '@/services/api';

const OTP_LENGTH = 6;

export default function VerifyOTPpage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const { loading, error, isAuthenticated } = useAppSelector((s) => s.auth);

  const { setConfig } = useAuthLayout();
  useEffect(() => {
    setConfig({ title: 'Xác thực tài khoản', subtitle: 'Nhập mã OTP 6 số được gỽi đến email của bạn.', heroImage: authHeroImg });
  }, [setConfig]);

  useEffect(() => {
    if (isAuthenticated) { navigate('/', { replace: true }); }
  }, [isAuthenticated, navigate]);

  useEffect(() => { return () => { dispatch(clearError()); }; }, [dispatch]);

  const [otp, setOtp] = useState<Array<string>>(Array(OTP_LENGTH).fill(''));
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => { if (resendCooldown <= 0) return; const t = setTimeout(() => setResendCooldown(c => c - 1), 1000); return () => clearTimeout(t); }, [resendCooldown]);
  const handleChange = (idx: number, val: string) => { const d = val.replace(/\D/g, '').slice(0, 1); const n = [...otp]; n[idx] = d; setOtp(n); if (d && idx < OTP_LENGTH - 1) inputsRef.current[idx + 1]?.focus(); };
  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputsRef.current[idx - 1]?.focus(); };
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => { const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH); if (!p) return; e.preventDefault(); const n = Array(OTP_LENGTH).fill('').map((_, i) => p[i] || ''); setOtp(n); inputsRef.current[Math.min(p.length, OTP_LENGTH) - 1]?.focus(); };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) { message.warning('Vui lòng nhập đủ 6 số'); return; }
    setOtpLoading(true);
    dispatch(verifyOTPThunk({ email, otp: code }));
  };

  useEffect(() => {
    if (isAuthenticated) {
      message.success('Xác thực thành công!');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, message]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    try { await post('/auth/resend-otp', { email }); message.success('Đã gỽi lại mã OTP'); } catch { message.error('Không thể gửi lại mã'); }
  };

  return (
    <>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600"><KeyRound className="h-6 w-6" /></div>
        <h2 className="text-2xl font-bold text-gray-900">Nhập mã OTP</h2>
        <p className="mt-1 text-sm text-gray-500">Mã xác thực đã gửi đến <span className="font-semibold text-gray-700">{email || 'email của bạn'}</span></p>
      </div>
      {error && <Alert title={error} type="error" showIcon closable className="mb-4" onClose={() => dispatch(clearError())} />}
      <div className="mb-6 flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
        {otp.map((d, i) => (
          <input key={i} ref={el => { inputsRef.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={d} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} className={cn('h-14 w-12 rounded-xl border-2 bg-white text-center text-2xl font-bold text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none', d ? 'border-green-500' : 'border-gray-200')} />
        ))}
      </div>
      <Button type="primary" block size="large" loading={loading || otpLoading} onClick={handleVerify} icon={<CheckCircle2 className="h-4 w-4" />} className="!h-12 !rounded-full !bg-green-600 !font-semibold hover:!bg-green-700">Xác nhận</Button>
      <div className="mt-6 text-center text-sm text-gray-600">Không nhận được mã? {resendCooldown > 0 ? <span className="text-gray-400">Gửi lại sau {resendCooldown}s</span> : <button onClick={handleResend} className="inline-flex items-center gap-1 font-semibold text-green-600 hover:text-green-700"><RefreshCw className="h-3.5 w-3.5" /> Gửi lại</button>}</div>
      <div className="mt-4 text-center"><Link to={ROUTES.LOGIN} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-green-600"><ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập</Link></div>
    </>
  );
}