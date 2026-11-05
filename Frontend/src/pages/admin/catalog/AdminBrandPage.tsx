import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Input,
  Switch,
  Space,
  Popconfirm,
  Badge,
  Modal,
  message,
  type TableColumnsType,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TagOutlined,
  ExclamationCircleOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import BrandModal from '@/components/admin/catalog/BrandModal';
import adminCatalogService from '@/services/adminCatalogService';
import type { BrandDTO } from '@/types/api';

export default function AdminBrandPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');

  // Brand modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandDTO | null>(null);

  // Foreign key warning modal state
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [blockedBrand, setBlockedBrand] = useState<BrandDTO | null>(null);
  const [warningMessage, setWarningMessage] = useState('');

  const params: Record<string, string> = {
    page: String(page - 1),
    size: '15',
  };
  if (keyword) params.keyword = keyword;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-brands', params],
    queryFn: () => adminCatalogService.getBrands(params),
  });

  // Toggle brand status (ACTIVE / INACTIVE)
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminCatalogService.updateBrandStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-brands'] });
      qc.invalidateQueries({ queryKey: ['brands'] });
      message.success('Đã cập nhật trạng thái thương hiệu');
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại');
    },
  });

  // Delete brand mutation
  const delMut = useMutation({
    mutationFn: (id: number) => adminCatalogService.deleteBrand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-brands'] });
      qc.invalidateQueries({ queryKey: ['brands'] });
      message.success('Đã xóa thương hiệu vĩnh viễn');
    },
    onError: (err: unknown, brandId: number) => {
      // ❌ CẤM cho phép xóa Hãng đang có sản phẩm liên kết (phải hiển thị modal cảnh báo ràng buộc khóa ngoại)
      const found = (data?.content || []).find((b) => b.id === brandId);
      const errMsg = err instanceof Error ? err.message : 'Không thể xóa hãng đang có sản phẩm';
      setBlockedBrand(found || null);
      setWarningMessage(errMsg);
      setWarningModalOpen(true);
    },
  });

  const handleOpenAdd = () => {
    setEditingBrand(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (brand: BrandDTO) => {
    setEditingBrand(brand);
    setModalOpen(true);
  };

  const handleDeleteClick = (brand: BrandDTO) => {
    // If brand has linked products, intercept directly with Foreign Key Warning Modal
    if (brand.productCount && brand.productCount > 0) {
      setBlockedBrand(brand);
      setWarningMessage(`Thương hiệu "${brand.name}" hiện đang có ${brand.productCount} dòng máy liên kết.`);
      setWarningModalOpen(true);
      return;
    }
    delMut.mutate(brand.id);
  };

  const handleHideBrandFromWarning = () => {
    if (blockedBrand) {
      statusMut.mutate({ id: blockedBrand.id, status: 'INACTIVE' });
      setWarningModalOpen(false);
    }
  };

  const columns: TableColumnsType<BrandDTO> = [
    {
      title: 'STT',
      width: 60,
      align: 'center',
      render: (_: unknown, __: BrandDTO, index?: number) => (
        <span className="text-gray-400 font-medium">{(page - 1) * 15 + (index ?? 0) + 1}</span>
      ),
    },
    {
      title: 'Logo',
      width: 80,
      render: (_, r) =>
        r.logoUrl ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white p-1 shadow-2xs">
            <img
              src={r.logoUrl}
              alt={r.name}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
            <TagOutlined className="text-base" />
          </div>
        ),
    },
    {
      title: 'Tên thương hiệu',
      dataIndex: 'name',
      render: (name: string) => (
        <span className="font-semibold text-gray-800 text-sm">{name}</span>
      ),
    },
    {
      title: 'Số dòng máy kinh doanh',
      dataIndex: 'productCount',
      width: 200,
      render: (count?: number) => (
        <div className="flex items-center gap-2">
          <Badge
            count={count ?? 0}
            showZero
            style={{
              backgroundColor: (count ?? 0) > 0 ? '#10b981' : '#9ca3af',
              fontSize: '11px',
            }}
          />
          <span className="text-xs text-gray-600">
            {(count ?? 0) > 0 ? `${count} dòng máy` : 'Chưa có máy'}
          </span>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (status: string, r) => (
        <Switch
          checked={status === 'ACTIVE'}
          loading={statusMut.isPending}
          onChange={(checked) =>
            statusMut.mutate({ id: r.id, status: checked ? 'ACTIVE' : 'INACTIVE' })
          }
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      ),
    },
    {
      title: 'Thao tác',
      width: 110,
      align: 'center',
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(r)}
            className="!rounded-md"
            title="Sửa thương hiệu"
          />
          {r.productCount && r.productCount > 0 ? (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteClick(r)}
              className="!rounded-md"
              title="Xóa thương hiệu"
            />
          ) : (
            <Popconfirm
              title="Xóa vĩnh viễn thương hiệu này?"
              description="Hành động này không thể hoàn tác nếu thương hiệu chưa có sản phẩm liên kết."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDeleteClick(r)}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={delMut.isPending}
                className="!rounded-md"
                title="Xóa thương hiệu"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Quản lý Hãng (Brands)"
        subtitle="Quản lý danh sách các thương hiệu điện thoại, logo và trạng thái hoạt động"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenAdd}
            className="!rounded-lg !bg-primary-600 hover:!bg-primary-700"
          >
            Thêm thương hiệu mới
          </Button>
        }
      />

      <AdminCard>
        {/* Search Bar */}
        <div className="mb-4 flex items-center justify-between">
          <Input.Search
            placeholder="Tìm kiếm thương hiệu..."
            allowClear
            onSearch={(v) => {
              setKeyword(v.trim());
              setPage(1);
            }}
            className="!w-72"
          />
          <span className="text-xs text-gray-500">
            Tổng cộng: <strong className="text-gray-700">{data?.totalElements ?? 0}</strong> thương hiệu
          </span>
        </div>

        {/* Table */}
        <Table<BrandDTO>
          columns={columns}
          dataSource={data?.content || []}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={{
            current: page,
            pageSize: 15,
            total: data?.totalElements || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
        />
      </AdminCard>

      {/* Brand Add / Edit Modal */}
      <BrandModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingBrand={editingBrand}
        existingBrands={data?.content || []}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['admin-brands'] });
          qc.invalidateQueries({ queryKey: ['brands'] });
        }}
      />

      {/* Foreign Key Constraint Warning Modal: ❌ CẤM cho phép xóa Hãng đang có sản phẩm liên kết */}
      <Modal
        open={warningModalOpen}
        onCancel={() => setWarningModalOpen(false)}
        footer={[
          <Button
            key="hide"
            icon={<EyeInvisibleOutlined />}
            onClick={handleHideBrandFromWarning}
            loading={statusMut.isPending}
            className="!rounded-lg"
          >
            Chuyển sang Ẩn hãng
          </Button>,
          <Button
            key="ok"
            type="primary"
            onClick={() => setWarningModalOpen(false)}
            className="!rounded-lg !bg-amber-600 hover:!bg-amber-700"
          >
            Đã hiểu
          </Button>,
        ]}
        title={
          <div className="flex items-center gap-2 text-base font-bold text-amber-600">
            <ExclamationCircleOutlined className="text-lg" />
            <span>Cảnh Báo Ràng Buộc Khóa Ngoại</span>
          </div>
        }
        centered
        width={500}
      >
        <div className="space-y-3 pt-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              Không thể xóa thương hiệu &ldquo;{blockedBrand?.name}&rdquo;!
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-800">
              {warningMessage ||
                'Thương hiệu này hiện đang có các dòng máy hoặc biến thể sản phẩm liên kết trong cơ sở dữ liệu. Để đảm bảo tính toàn vẹn dữ liệu và lịch sử đơn hàng, hệ thống nghiêm cấm xóa vĩnh viễn thương hiệu này.'}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-medium text-gray-700">💡 Giải pháp đề xuất:</p>
            <p className="mt-1">
              Bạn hãy chuyển trạng thái của hãng sang <strong>&ldquo;Tắt (Ẩn)&rdquo;</strong>. Khi đó, thương hiệu sẽ không còn hiển thị cho khách hàng chọn mua trên trang chủ và danh mục sản phẩm, đồng thời các dữ liệu đơn hàng cũ vẫn được bảo toàn trọn vẹn.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

