import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Tag, Popconfirm, App, Skeleton, Empty, Tooltip } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleFilled,
  HomeOutlined,
  PhoneOutlined,
  UserOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { userService, formatFullAddress } from '@/services';
import AddressModal from '@/components/account/AddressModal';
import type { AddressItem, AddressRequest, AddressLabel } from '@/types/api';

const LABEL_MAP: Record<AddressLabel, { text: string; color: string }> = {
  HOME: { text: 'Nhà riêng', color: 'blue' },
  OFFICE: { text: 'Văn phòng', color: 'purple' },
  FAMILY: { text: 'Người thân', color: 'orange' },
  OTHER: { text: 'Khác', color: 'default' },
};

export default function AddressBookPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);

  const { data: addresses = [], isLoading } = useQuery<AddressItem[]>({
    queryKey: ['addresses'],
    queryFn: () => userService.getAddresses(),
  });

  const createMutation = useMutation({
    mutationFn: (data: AddressRequest) => userService.createAddress(data),
    onSuccess: () => {
      message.success('Thêm địa chỉ giao hàng thành công!');
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setModalOpen(false);
    },
    onError: (err: Error) => {
      message.error(err.message || 'Lỗi khi thêm địa chỉ');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: AddressRequest }) =>
      userService.updateAddress(id, data),
    onSuccess: () => {
      message.success('Cập nhật địa chỉ thành công!');
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setModalOpen(false);
      setEditingAddress(null);
    },
    onError: (err: Error) => {
      message.error(err.message || 'Lỗi khi cập nhật địa chỉ');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => userService.deleteAddress(id),
    onSuccess: () => {
      message.success('Đã xóa địa chỉ thành công!');
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Lỗi khi xóa địa chỉ');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string | number) => userService.setDefaultAddress(id),
    onSuccess: () => {
      message.success('Đã thiết lập địa chỉ mặc định!');
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Lỗi khi thiết lập mặc định');
    },
  });

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (addr: AddressItem) => {
    setEditingAddress(addr);
    setModalOpen(true);
  };

  const handleModalSubmit = async (data: AddressRequest) => {
    if (editingAddress) {
      await updateMutation.mutateAsync({ id: editingAddress.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDelete = (addr: AddressItem) => {
    if (addr.isDefault && addresses.length === 1) {
      message.warning('Không thể xóa địa chỉ mặc định khi bạn chỉ có duy nhất một địa chỉ.');
      return;
    }
    deleteMutation.mutate(addr.id);
  };

  return (
    <div>
      {/* Header section */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sổ địa chỉ nhận hàng</h2>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý danh sách địa chỉ giao hàng và xác nhận vị trí bản đồ khi nhận điện thoại tại GreenPhone
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenAdd}
          className="!h-10 !rounded-xl !bg-green-600 !px-5 !text-sm !font-semibold hover:!bg-green-700 shadow-sm shrink-0"
        >
          Thêm địa chỉ mới
        </Button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton active paragraph={{ rows: 3 }} className="p-4 border rounded-2xl" />
          <Skeleton active paragraph={{ rows: 3 }} className="p-4 border rounded-2xl" />
        </div>
      ) : addresses.length === 0 ? (
        /* Empty State */
        <Card className="!rounded-2xl !border-gray-100 !py-12 text-center !shadow-sm">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <p className="font-semibold text-gray-700">Chưa có địa chỉ nhận hàng nào</p>
                <p className="mt-1 text-xs text-gray-400">
                  Thêm địa chỉ để việc thanh toán và nhận máy thuận tiện, nhanh chóng hơn.
                </p>
              </div>
            }
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAdd}
              className="mt-2 !rounded-xl !bg-green-600 !font-semibold hover:!bg-green-700"
            >
              Thêm địa chỉ ngay
            </Button>
          </Empty>
        </Card>
      ) : (
        /* Address Cards Grid */
        <div className="grid grid-cols-1 gap-4">
          {addresses.map((addr) => {
            const fullAddressText = formatFullAddress(addr);
            const isSingleDefault = addr.isDefault && addresses.length === 1;
            const labelKey = (addr.label as AddressLabel) || 'HOME';
            const labelInfo = LABEL_MAP[labelKey] || LABEL_MAP.HOME;
            const hasCoords =
              typeof addr.latitude === 'number' &&
              typeof addr.longitude === 'number' &&
              Number.isFinite(addr.latitude) &&
              Number.isFinite(addr.longitude);

            return (
              <div
                key={addr.id}
                className={`relative rounded-2xl border p-5 transition-all ${
                  addr.isDefault
                    ? 'border-green-300 bg-green-50/30 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="space-y-2.5 min-w-0 flex-1">
                    {/* Receiver info & badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 font-bold text-gray-900 text-base">
                        <UserOutlined className="text-gray-400 text-sm" />
                        {addr.receiverName}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                        <PhoneOutlined className="text-gray-400 text-sm" />
                        {addr.receiverPhone}
                      </span>

                      {/* Nhãn địa chỉ */}
                      <Tag
                        color={labelInfo.color}
                        className="!rounded-md !px-2 !py-0.5 !text-xs !font-medium"
                      >
                        {labelInfo.text}
                      </Tag>

                      {/* Trạng thái mặc định */}
                      {addr.isDefault && (
                        <Tag
                          color="success"
                          className="!inline-flex !items-center !gap-1 !rounded-full !px-2.5 !py-0.5 !text-xs !font-semibold !border-green-200"
                        >
                          <CheckCircleFilled className="text-green-600" /> Mặc định
                        </Tag>
                      )}

                      {/* Trạng thái tọa độ trên bản đồ */}
                      {hasCoords ? (
                        <Tag
                          color="cyan"
                          className="!inline-flex !items-center !gap-1 !rounded-md !px-2 !py-0.5 !text-xs !border-cyan-200 text-cyan-800"
                        >
                          <EnvironmentOutlined /> Đã ghim vị trí ({addr.latitude?.toFixed(2)}, {addr.longitude?.toFixed(2)})
                        </Tag>
                      ) : (
                        <Tooltip title="Bấm để xác định và ghim vị trí chính xác trên bản đồ">
                          <Tag
                            color="orange"
                            onClick={() => handleOpenEdit(addr)}
                            className="!cursor-pointer !inline-flex !items-center !gap-1 !rounded-md !px-2 !py-0.5 !text-xs hover:opacity-80 transition-opacity"
                          >
                            <EnvironmentOutlined /> Chưa ghim vị trí (Bấm để ghim)
                          </Tag>
                        </Tooltip>
                      )}
                    </div>

                    {/* Address content */}
                    <div className="flex items-start gap-2 text-sm text-gray-700">
                      <HomeOutlined className="mt-1 text-gray-400 shrink-0" />
                      <span className="break-words font-medium">{fullAddressText}</span>
                    </div>

                    {/* Note if available */}
                    {addr.note && (
                      <div className="flex items-start gap-2 text-xs text-gray-500 italic">
                        <FileTextOutlined className="mt-0.5 text-gray-400 shrink-0" />
                        <span>Ghi chú giao hàng: {addr.note}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleOpenEdit(addr)}
                      className="!rounded-lg !text-xs text-gray-600 hover:!text-green-600 hover:!border-green-600"
                    >
                      Sửa
                    </Button>

                    <Popconfirm
                      title="Xóa địa chỉ"
                      description={
                        isSingleDefault
                          ? 'Bạn không thể xóa địa chỉ mặc định khi chỉ có duy nhất 1 địa chỉ.'
                          : 'Bạn có chắc chắn muốn xóa địa chỉ nhận hàng này không?'
                      }
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{
                        danger: true,
                        disabled: isSingleDefault,
                        loading: deleteMutation.isPending,
                      }}
                      onConfirm={() => handleDelete(addr)}
                    >
                      <Tooltip
                        title={
                          isSingleDefault
                            ? 'Không thể xóa địa chỉ mặc định duy nhất'
                            : undefined
                        }
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          disabled={isSingleDefault || deleteMutation.isPending}
                          className="!rounded-lg !text-xs"
                        >
                          Xóa
                        </Button>
                      </Tooltip>
                    </Popconfirm>

                    {!addr.isDefault && (
                      <Button
                        size="small"
                        loading={setDefaultMutation.isPending}
                        onClick={() => setDefaultMutation.mutate(addr.id)}
                        className="!rounded-lg !text-xs !border-green-600 !text-green-600 hover:!bg-green-50"
                      >
                        Đặt làm mặc định
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Address Form Modal with Leaflet Map */}
      <AddressModal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingAddress(null);
        }}
        onSubmit={handleModalSubmit}
        initialData={editingAddress}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
