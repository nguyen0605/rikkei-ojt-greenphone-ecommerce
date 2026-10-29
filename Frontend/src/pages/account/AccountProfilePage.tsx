import { useQuery, useMutation } from '@tanstack/react-query';
import { Form, Input, Button, Card, App, Skeleton } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, HomeOutlined, ShoppingOutlined, StarOutlined, SafetyOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { userService, orderService, reviewService } from '@/services';
import type { UserProfileRequest } from '@/types/api';
import { formatVND } from '@/utils';

export default function AccountProfilePage() {
  const { message } = App.useApp();
  const { data: user, isLoading } = useQuery({ queryKey: ['profile'], queryFn: userService.getProfile });
  const { data: ordersData } = useQuery({ queryKey: ['orders'], queryFn: () => orderService.list() });
  const { data: reviewsData } = useQuery({ queryKey: ['my-reviews'], queryFn: () => reviewService.myReviews() });
  const [form] = Form.useForm<UserProfileRequest>();

  const mut = useMutation({
    mutationFn: (v: UserProfileRequest) => userService.updateProfile(v),
    onSuccess: () => message.success('Cập nhật thành công'),
    onError: () => message.error('Lỗi khi cập nhật'),
  });

  if (isLoading) return <div className="py-8"><Skeleton active paragraph={{ rows: 4 }} /></div>;
  if (!user) return <div className="py-8 text-center text-gray-400">Không tìm thấy</div>;

  const orders = ordersData?.content || [];
  const reviews = reviewsData?.content || [];
  const totalSpent = orders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + o.finalAmount, 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Thông tin tài khoản</h2>
        <p className="mt-1 text-sm text-gray-500">Cập nhật thông tin cá nhân của bạn</p>
      </div>

      {/* Avatar banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 to-green-700 p-6 text-white shadow-lg shadow-green-200">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 right-20 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl font-bold ring-2 ring-white/40">
            {(user.fullName || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div className="text-xl font-bold">{user.fullName}</div>
            <div className="text-sm text-green-100">{user.email}</div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/tai-khoan/don-hang" className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-green-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600"><ShoppingOutlined /></div>
            <div>
              <div className="text-lg font-bold text-gray-900">{orders.length}</div>
              <div className="text-xs text-gray-500">Đơn hàng</div>
            </div>
          </div>
        </Link>
        <Link to="/tai-khoan/danh-gia" className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-green-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><StarOutlined /></div>
            <div>
              <div className="text-lg font-bold text-gray-900">{reviews.length}</div>
              <div className="text-xs text-gray-500">Đánh giá</div>
            </div>
          </div>
        </Link>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><SafetyOutlined /></div>
            <div>
              <div className="text-lg font-bold text-gray-900">{formatVND(totalSpent)}</div>
              <div className="text-xs text-gray-500">Đã chi tiêu</div>
            </div>
          </div>
        </div>
      </div>

      <Card className="!border-gray-100 !rounded-2xl !shadow-sm">
        <div className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-4">
          <UserOutlined className="text-green-600" />
          <span className="text-base font-bold text-gray-900">Hồ sơ cá nhân</span>
        </div>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ fullName: user.fullName, phone: user.phone || '', address: user.address || '' }}
          onFinish={(v) => mut.mutate(v)}
          className="max-w-lg"
        >
          <Form.Item label={<span className="text-sm font-medium text-gray-700">Email</span>}>
            <Input value={user.email} disabled prefix={<MailOutlined className="text-gray-400" />} size="large" className="!rounded-xl" />
          </Form.Item>
          <Form.Item
            name="fullName"
            label={<span className="text-sm font-medium text-gray-700">Họ tên</span>}
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input prefix={<UserOutlined className="text-gray-400" />} size="large" className="!rounded-xl" placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item
            name="phone"
            label={<span className="text-sm font-medium text-gray-700">Số điện thoại</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại' },
              { pattern: /^0\d{9}$/, message: 'SĐT không hợp lệ (10 số, bắt đầu 0)' },
            ]}
          >
            <Input prefix={<PhoneOutlined className="text-gray-400" />} size="large" className="!rounded-xl" placeholder="0912345678" />
          </Form.Item>
          <Form.Item name="address" label={<span className="text-sm font-medium text-gray-700">Địa chỉ</span>}>
            <Input.TextArea rows={3} className="!rounded-xl" placeholder="123 Đường ABC, Quận 1, TP.HCM" style={{ resize: 'none' }} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={mut.isPending}
            className="!h-11 !rounded-xl !bg-green-600 !px-8 !text-sm !font-semibold hover:!bg-green-700"
          >
            Lưu thay đổi
          </Button>
        </Form>
      </Card>
    </div>
  );
}
