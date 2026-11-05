import ChangePasswordForm from '@/components/account/ChangePasswordForm';

export default function AccountPasswordPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Đổi mật khẩu</h2>
        <p className="mt-1 text-sm text-gray-500">
          Cập nhật mật khẩu để bảo vệ an toàn cho tài khoản GreenPhone của bạn
        </p>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
