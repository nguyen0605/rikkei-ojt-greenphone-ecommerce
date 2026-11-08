import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Button, Card, App, Skeleton } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ShoppingOutlined,
  StarOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { userService, orderService, reviewService } from '@/services';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateUserProfile } from '@/store/slices/authSlice';
import type { UserProfileRequest } from '@/types/api';
import { formatVND } from '@/utils';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function AccountProfilePage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s) => s.auth.user);

  const [form] = Form.useForm<UserProfileRequest>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quản lý preview avatar an toàn (thu hồi Object URL tránh memory leak)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const prevObjectUrlRef = useRef<string | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: userService.getProfile,
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.list(),
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => reviewService.myReviews(),
  });

  // Đồng bộ form khi có dữ liệu profile
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        fullName: user.fullName || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user, form]);

  // Thu hồi Object URL khi unmount hoặc khi chọn ảnh mới
  useEffect(() => {
    return () => {
      if (prevObjectUrlRef.current) {
        URL.revokeObjectURL(prevObjectUrlRef.current);
      }
    };
  }, []);

  // Mutation cập nhật thông tin cá nhân
  const updateProfileMutation = useMutation({
    mutationFn: (values: UserProfileRequest) => userService.updateProfile(values),
    onSuccess: (updatedUser) => {
      message.success('Cập nhật hồ sơ thành công!');
      // Đồng bộ vào Redux Auth Store -> Header & Layout cập nhật ngay tức thì
      dispatch(
        updateUserProfile({
          fullName: updatedUser.fullName,
          phone: updatedUser.phone,
          address: updatedUser.address,
        })
      );
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Lỗi khi cập nhật thông tin');
    },
  });

  // Mutation upload avatar
  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => userService.uploadAvatar(file),
    onSuccess: (avatarUrl: string) => {
      message.success('Cập nhật ảnh đại diện thành công!');
      // Đồng bộ ảnh đại diện vào Redux Auth Store
      dispatch(updateUserProfile({ avatar: avatarUrl }));
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Xóa file đã chọn và dọn dẹp preview URL
      setSelectedFile(null);
      if (prevObjectUrlRef.current) {
        URL.revokeObjectURL(prevObjectUrlRef.current);
        prevObjectUrlRef.current = null;
      }
      setPreviewUrl(null);
    },
    onError: (err: Error) => {
      message.error(err.message || 'Lỗi tải ảnh đại diện');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      message.error('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP hoặc GIF).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate kích thước tối đa (2MB)
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      message.error('Kích thước ảnh không được vượt quá 2MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Thu hồi preview cũ nếu có
    if (prevObjectUrlRef.current) {
      URL.revokeObjectURL(prevObjectUrlRef.current);
    }

    // Tạo preview an toàn
    const objectUrl = URL.createObjectURL(file);
    prevObjectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
  };

  const handleUploadConfirm = () => {
    if (!selectedFile) return;
    uploadAvatarMutation.mutate(selectedFile);
  };

  const handleCancelPreview = () => {
    if (prevObjectUrlRef.current) {
      URL.revokeObjectURL(prevObjectUrlRef.current);
      prevObjectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (values: UserProfileRequest) => {
    // Trim dữ liệu để tránh gửi chuỗi chỉ toàn khoảng trắng
    const trimmedValues: UserProfileRequest = {
      fullName: values.fullName?.trim() || '',
      phone: values.phone?.trim() || '',
      address: values.address?.trim() || '',
    };
    updateProfileMutation.mutate(trimmedValues);
  };

  if (isLoading) {
    return (
      <div className="py-8" role="status" aria-label="Đang tải dữ liệu">
        <Skeleton active avatar paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-12 text-center text-gray-500">
        Không tìm thấy thông tin tài khoản. Vui lòng đăng nhập lại.
      </div>
    );
  }

  const orders = ordersData?.content || [];
  const reviews = reviewsData?.content || [];
  const totalSpent = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((s, o) => s + (o.finalAmount || 0), 0);

  const displayAvatar = previewUrl || authUser?.avatar || user.avatar;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Hồ sơ cá nhân</h2>
        <p className="mt-1 text-sm text-gray-500">
          Xem và cập nhật thông tin cá nhân của bạn
        </p>
      </div>

      {/* Avatar Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 via-green-700 to-emerald-800 p-6 text-white shadow-lg shadow-green-200">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 right-20 h-32 w-32 rounded-full bg-white/10" />

        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          {/* Avatar Container with Upload overlay */}
          <div className="relative group shrink-0">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={user.fullName || 'Avatar'}
                className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white/50 shadow-md transition-all group-hover:brightness-90"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/20 text-4xl font-bold ring-4 ring-white/40 shadow-md">
                {(user.fullName || 'U')[0].toUpperCase()}
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              aria-label="Tải lên ảnh đại diện"
            />

            {/* Change Avatar Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatarMutation.isPending}
              aria-label="Chọn ảnh đại diện mới"
              className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-green-700 shadow-lg transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-400"
              title="Đổi ảnh đại diện"
            >
              <CameraOutlined className="text-base" />
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="text-xl font-bold truncate">{user.fullName}</div>
            <div className="text-sm text-green-100 truncate">{user.email}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <CheckCircleOutlined /> Thành viên GreenPhone
            </div>

            {/* Upload preview actions */}
            {selectedFile && (
              <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Button
                  size="small"
                  type="primary"
                  loading={uploadAvatarMutation.isPending}
                  onClick={handleUploadConfirm}
                  className="!rounded-lg !bg-white !text-green-700 !font-semibold hover:!bg-green-50 !border-none"
                >
                  Lưu ảnh đại diện
                </Button>
                <Button
                  size="small"
                  onClick={handleCancelPreview}
                  disabled={uploadAvatarMutation.isPending}
                  className="!rounded-lg !bg-white/20 !text-white !border-white/40 hover:!bg-white/30"
                >
                  Hủy
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/tai-khoan/don-hang"
          className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-green-200 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <ShoppingOutlined className="text-lg" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{orders.length}</div>
              <div className="text-xs text-gray-500">Đơn hàng đã đặt</div>
            </div>
          </div>
        </Link>

        <Link
          to="/tai-khoan/danh-gia"
          className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-green-200 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <StarOutlined className="text-lg" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{reviews.length}</div>
              <div className="text-xs text-gray-500">Đánh giá sản phẩm</div>
            </div>
          </div>
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
              <SafetyOutlined className="text-lg" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{formatVND(totalSpent)}</div>
              <div className="text-xs text-gray-500">Tổng chi tiêu tích lũy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form Card */}
      <Card className="!border-gray-100 !rounded-2xl !shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <UserOutlined className="text-green-600 text-lg" />
            <span className="text-base font-bold text-gray-900">Thông tin cá nhân</span>
          </div>
          <Link
            to="/tai-khoan/dia-chi"
            className="text-xs font-semibold text-green-600 hover:text-green-700 hover:underline"
          >
            Quản lý sổ địa chỉ →
          </Link>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="max-w-xl"
          requiredMark="optional"
        >
          {/* Email (Readonly - Backend business rule) */}
          <Form.Item
            label={
              <span className="text-sm font-medium text-gray-700">
                Email <span className="text-xs text-gray-400 font-normal">(Không thể thay đổi)</span>
              </span>
            }
          >
            <Input
              value={user.email}
              disabled
              prefix={<MailOutlined className="text-gray-400" />}
              size="large"
              className="!rounded-xl bg-gray-50 text-gray-500"
            />
          </Form.Item>

          {/* Full Name */}
          <Form.Item
            name="fullName"
            label={<span className="text-sm font-medium text-gray-700">Họ và tên</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập họ tên của bạn' },
              {
                validator: (_, value) => {
                  if (value && value.trim().length < 2) {
                    return Promise.reject(new Error('Họ tên phải có ít nhất 2 ký tự'));
                  }
                  if (value && value.trim().length > 100) {
                    return Promise.reject(new Error('Họ tên không được vượt quá 100 ký tự'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              size="large"
              className="!rounded-xl"
              placeholder="Ví dụ: Nguyễn Văn A"
            />
          </Form.Item>

          {/* Phone */}
          <Form.Item
            name="phone"
            label={<span className="text-sm font-medium text-gray-700">Số điện thoại</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại' },
              {
                pattern: /^0\d{9,10}$/,
                message: 'Số điện thoại không hợp lệ (10-11 chữ số, bắt đầu bằng số 0)',
              },
            ]}
          >
            <Input
              prefix={<PhoneOutlined className="text-gray-400" />}
              size="large"
              className="!rounded-xl"
              placeholder="Ví dụ: 0912345678"
            />
          </Form.Item>

          {/* Default Address */}
          <Form.Item
            name="address"
            label={<span className="text-sm font-medium text-gray-700">Địa chỉ chính</span>}
            tooltip="Địa chỉ mặc định sẽ tự động đồng bộ khi bạn chọn địa chỉ mặc định trong Sổ địa chỉ"
          >
            <Input.TextArea
              rows={3}
              className="!rounded-xl"
              placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
              style={{ resize: 'none' }}
            />
          </Form.Item>

          <div className="pt-2">
            <Button
              type="primary"
              htmlType="submit"
              loading={updateProfileMutation.isPending}
              disabled={updateProfileMutation.isPending}
              className="!h-11 !rounded-xl !bg-green-600 !px-8 !text-sm !font-semibold hover:!bg-green-700 shadow-md shadow-green-200"
            >
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
