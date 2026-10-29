import { useEffect, useState } from 'react';  
import { Link, useLocation, useNavigate } from 'react-router-dom';  
import { Form, Input, Button, Checkbox, Alert, App } from 'antd';  
import { User, Lock, Eye, EyeOff, ShieldCheck, LogIn } from 'lucide-react'; 
import authHeroImg from '@/assets/auth_img.jpg';  
import { useAppDispatch, useAppSelector } from '@/store/hooks';  
import { loginThunk, clearError } from '@/store/slices/authSlice';  
import { ROUTES } from '@/routes/routePaths';  
import { useAuthLayout } from './AuthLayout'; 
  
interface LoginFormValues { email: string; password: string; remember?: boolean; }  
  
export default function LoginPage() {  
  const dispatch = useAppDispatch();  
  const navigate = useNavigate();  
  const location = useLocation();  

  const { setConfig } = useAuthLayout();  
  useEffect(() => { setConfig({ title: 'Chào mừng bạn quay lại', subtitle: 'Đăng nhập để tiếp tục hành trình mua sắm tại GreenPhone.', heroImage: authHeroImg }); }, [setConfig]);  
  const { isAuthenticated, user, error, loading, rememberedEmail } = useAppSelector((s) => s.auth);  
  const [showPassword, setShowPassword] = useState(false);  
  const [form] = Form.useForm<LoginFormValues>(); 
  useEffect(() => { if (rememberedEmail) form.setFieldsValue({ email: rememberedEmail, remember: true }); }, [rememberedEmail, form]);  
  useEffect(() => { if (isAuthenticated && user) { const from = (location.state as any)?.from; navigate(user.role === 'ADMIN' ? '/admin' : from || ROUTES.HOME, { replace: true }); } }, [isAuthenticated, user]);
  useEffect(() => { return () => { dispatch(clearError()); }; }, [dispatch]);  
  const handleSubmit = (values: LoginFormValues) => { dispatch(loginThunk({ email: values.email, password: values.password, remember: values.remember })); }; 
  return (  
    <>  
      <div className="mb-4 text-center">  
        <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600"><ShieldCheck className="h-5 w-5" strokeWidth={2.2} /></div>  
        <h2 className="text-xl font-bold text-gray-900 md:text-2xl">Đăng nhập</h2>  
      </div> 
      {error && <Alert title={error} type="error" showIcon closable className="mb-4" onClose={() => dispatch(clearError())} />}  
      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="on" requiredMark={false}>  
        <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Vui lòng nhập email' }]}>  
          <Input size="large" prefix={<User className="h-4 w-4 text-gray-400" />} placeholder="Nhập email" className="!h-11 !rounded-xl" autoComplete="username" />  
        </Form.Item> 
        <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}>  
          <Input size="large" prefix={<Lock className="h-4 w-4 text-gray-400" />} type={showPassword ? 'text' : 'password'} placeholder="Nhập mật khẩu" className="!h-11 !rounded-xl" autoComplete="current-password" suffix={<button type="button" onClick={() => setShowPassword((v) => !v)} className="text-gray-400 hover:text-gray-600" tabIndex={-1}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} />  
        </Form.Item> 
        <div className="mb-4 flex items-center justify-between text-sm">  
          <Form.Item name="remember" valuePropName="checked" noStyle><Checkbox>Ghi nhớ đăng nhập</Checkbox></Form.Item>  
          <Link to={ROUTES.FORGOT_PASSWORD} className="font-medium text-green-600 hover:text-green-700">Quên mật khẩu?</Link>  
        </div>  
        <Button type="primary" htmlType="submit" block size="large" loading={loading} className="!h-11 !rounded-full !bg-green-600 !font-semibold hover:!bg-green-700" icon={<LogIn className="h-4 w-4" />}>Đăng nhập</Button>  
      </Form> 
      <p className="mt-4 text-center text-sm text-gray-600">  
        Chưa có tài khoản?{' '}<Link to={ROUTES.REGISTER} className="font-semibold text-green-600 hover:text-green-700">Đăng ký</Link>  
      </p>  
    </>  
  );  
} 
