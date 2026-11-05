import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tabs,
  Button,
  Modal,
  Input,
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  BgColorsOutlined,
  DatabaseOutlined,
  HddOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import OptionValueTags from '@/components/admin/catalog/OptionValueTags';
import adminCatalogService from '@/services/adminCatalogService';
import type { OptionDTO, OptionRequest } from '@/types/api';

interface CategoryFormValues {
  type: string;
  label: string;
  maxItems: number;
  sortOrder: number;
  enabled: boolean;
}

const categorySchema: z.ZodType<CategoryFormValues> = z.object({
  type: z
    .string()
    .trim()
    .min(1, 'Mã nhóm không được để trống')
    .max(50, 'Mã nhóm tối đa 50 ký tự')
    .regex(/^[A-Z0-9_]+$/, 'Mã nhóm chỉ gồm chữ hoa, số và dấu gạch dưới (VD: RAM, COLOR)'),
  label: z
    .string()
    .trim()
    .min(1, 'Tên hiển thị không được để trống')
    .max(100, 'Tên hiển thị tối đa 100 ký tự'),
  maxItems: z.number().min(1, 'Tối thiểu 1').max(20, 'Tối đa 20'),
  sortOrder: z.number(),
  enabled: z.boolean(),
});

export default function AdminOptionPage() {
  const qc = useQueryClient();

  // Query option categories
  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['admin-options'],
    queryFn: adminCatalogService.getCategories,
  });

  const [activeType, setActiveType] = useState<string>('COLOR');
  const activeCategory =
    categories.find((c) => c.type === activeType) || categories[0] || null;

  // Query items for active category
  const { data: items = [], isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ['admin-option-items', activeCategory?.id],
    queryFn: () => adminCatalogService.getItems(activeCategory!.id),
    enabled: !!activeCategory,
  });

  // Modal Category Add / Edit state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<OptionDTO | null>(null);

  // Category delete warning modal state
  const [catWarningOpen, setCatWarningOpen] = useState(false);
  const [catWarningMessage, setCatWarningMessage] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema as any) as any,
    defaultValues: {
      type: '',
      label: '',
      maxItems: 5,
      sortOrder: 1,
      enabled: true,
    },
  });

  const openAddCategory = () => {
    setEditingCategory(null);
    reset({
      type: '',
      label: '',
      maxItems: 5,
      sortOrder: (categories.length || 0) + 1,
      enabled: true,
    });
    setCatModalOpen(true);
  };

  const openEditCategory = (cat: OptionDTO) => {
    setEditingCategory(cat);
    reset({
      type: cat.type,
      label: cat.label,
      maxItems: cat.maxItems ?? 5,
      sortOrder: cat.sortOrder ?? 1,
      enabled: cat.enabled ?? true,
    });
    setCatModalOpen(true);
  };

  const onCategorySubmit = async (values: CategoryFormValues) => {
    try {
      if (editingCategory) {
        await adminCatalogService.updateCategory(editingCategory.id, values as OptionRequest);
        message.success(`Đã cập nhật nhóm "${values.label}"`);
      } else {
        const created = await adminCatalogService.createCategory(values as OptionRequest);
        message.success(`Đã tạo nhóm thuộc tính mới "${values.label}"`);
        if (created?.type) {
          setActiveType(created.type);
        }
      }
      qc.invalidateQueries({ queryKey: ['admin-options'] });
      qc.invalidateQueries({ queryKey: ['options'] });
      setCatModalOpen(false);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Thao tác thất bại';
      message.error(errMsg);
    }
  };

  // Delete Category Mutation
  const delCatMut = useMutation({
    mutationFn: (id: number) => adminCatalogService.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-options'] });
      qc.invalidateQueries({ queryKey: ['options'] });
      message.success('Đã xóa nhóm thuộc tính');
      if (categories.length > 1) {
        const remaining = categories.filter((c) => c.id !== activeCategory?.id);
        if (remaining.length > 0) setActiveType(remaining[0].type);
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Không thể xóa nhóm thuộc tính này';
      setCatWarningMessage(msg);
      setCatWarningOpen(true);
    },
  });

  const handleRefresh = () => {
    refetchItems();
    qc.invalidateQueries({ queryKey: ['options'] });
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'COLOR':
        return <BgColorsOutlined />;
      case 'RAM':
        return <ThunderboltOutlined />;
      case 'STORAGE':
        return <DatabaseOutlined />;
      case 'CHIP':
        return <HddOutlined />;
      default:
        return <AppstoreOutlined />;
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Cây Thuộc Tính & Thông Số (Options)"
        subtitle="Quản lý các nhóm thông số kỹ thuật (RAM, Dung lượng ROM, Màu sắc có mã HEX, Chipset) và giá trị biến thể"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAddCategory}
            className="!rounded-lg !bg-primary-600 hover:!bg-primary-700"
          >
            Thêm nhóm thuộc tính
          </Button>
        }
      />

      <AdminCard>
        {/* Category Tabs */}
        <Tabs
          activeKey={activeCategory?.type || activeType}
          onChange={(key) => setActiveType(key)}
          type="card"
          className="admin-options-tabs mb-4"
          items={categories.map((cat) => ({
            key: cat.type,
            label: (
              <span className="flex items-center gap-2 px-1">
                {getCategoryIcon(cat.type)}
                <span className="font-medium">{cat.label}</span>
                <Badge
                  count={cat.type === activeCategory?.type ? items.length : undefined}
                  showZero={false}
                  size="small"
                  className="!ml-1"
                />
              </span>
            ),
          }))}
        />

        {activeCategory ? (
          <div className="space-y-6">
            {/* Category Meta & Controls Card */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-xl text-primary-600">
                  {getCategoryIcon(activeCategory.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-800">
                      {activeCategory.label}
                    </h3>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
                      {activeCategory.type}
                    </span>
                    <Badge
                      status={activeCategory.enabled ? 'success' : 'default'}
                      text={activeCategory.enabled ? 'Đang bật' : 'Đã ẩn'}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Mã hệ thống: <strong className="font-mono text-gray-700">{activeCategory.type}</strong> • Thứ tự hiển thị: {activeCategory.sortOrder ?? 1}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  icon={<EditOutlined />}
                  onClick={() => openEditCategory(activeCategory)}
                  className="!rounded-lg"
                >
                  Sửa nhóm
                </Button>
                <Popconfirm
                  title={`Xóa nhóm "${activeCategory.label}"?`}
                  description="Nếu nhóm này đang có giá trị con hoặc sản phẩm liên kết, hệ thống sẽ chặn."
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => delCatMut.mutate(activeCategory.id)}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={delCatMut.isPending}
                    className="!rounded-lg"
                  >
                    Xóa nhóm
                  </Button>
                </Popconfirm>
              </div>
            </div>

            {/* Embedded OptionValueTags Component */}
            <OptionValueTags
              category={activeCategory}
              items={items}
              isLoading={itemsLoading}
              onRefresh={handleRefresh}
            />
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">
            {catLoading ? 'Đang tải danh mục thuộc tính...' : 'Chưa có nhóm thuộc tính nào.'}
          </div>
        )}
      </AdminCard>

      {/* Add / Edit Category Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-base font-semibold text-gray-800">
            <AppstoreOutlined className="text-primary-600" />
            <span>{editingCategory ? 'Sửa nhóm thuộc tính' : 'Thêm nhóm thuộc tính mới'}</span>
          </div>
        }
        open={catModalOpen}
        onCancel={() => setCatModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setCatModalOpen(false)} className="!rounded-lg">
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmit(onCategorySubmit)}
            loading={isSubmitting}
            className="!rounded-lg !bg-primary-600 hover:!bg-primary-700"
          >
            {editingCategory ? 'Lưu thay đổi' : 'Thêm nhóm'}
          </Button>,
        ]}
        centered
      >
        <form onSubmit={handleSubmit(onCategorySubmit)} className="space-y-4 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Mã nhóm (Type) <span className="text-red-500">*</span>
            </label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="VD: RAM, STORAGE, COLOR, CHIP..."
                  className="!rounded-lg font-mono uppercase"
                  disabled={!!editingCategory}
                />
              )}
            />
            {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tên hiển thị <span className="text-red-500">*</span>
            </label>
            <Controller
              name="label"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="VD: Dung lượng RAM, Bộ nhớ trong, Màu sắc..."
                  className="!rounded-lg"
                />
              )}
            />
            {errors.label && <p className="mt-1 text-xs text-red-500">{errors.label.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Số mục tối đa cho máy
              </label>
              <Controller
                name="maxItems"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={1}
                    max={20}
                    className="!w-full !rounded-lg"
                  />
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Thứ tự sắp xếp
              </label>
              <Controller
                name="sortOrder"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={1}
                    className="!w-full !rounded-lg"
                  />
                )}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div>
              <span className="block text-sm font-medium text-gray-700">Trạng thái kích hoạt</span>
              <span className="text-xs text-gray-400">Hiển thị nhóm này khi cấu hình sản phẩm</span>
            </div>
            <Controller
              name="enabled"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Switch checked={value} onChange={onChange} />
              )}
            />
          </div>
        </form>
      </Modal>

      {/* Category Delete Warning Modal */}
      <Modal
        open={catWarningOpen}
        onCancel={() => setCatWarningOpen(false)}
        footer={[
          <Button
            key="ok"
            type="primary"
            onClick={() => setCatWarningOpen(false)}
            className="!rounded-lg !bg-amber-600 hover:!bg-amber-700"
          >
            Đã hiểu
          </Button>,
        ]}
        title={
          <div className="flex items-center gap-2 text-base font-bold text-amber-600">
            <ExclamationCircleOutlined className="text-lg" />
            <span>Không thể xóa nhóm thuộc tính</span>
          </div>
        }
        centered
      >
        <div className="space-y-3 pt-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              Ràng buộc dữ liệu thuộc tính:
            </p>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed">
              {catWarningMessage ||
                'Nhóm thuộc tính này hiện đang có các giá trị con bên trong hoặc đang được tham chiếu bởi các dòng máy. Bạn vui lòng xóa toàn bộ các giá trị con của nhóm trước khi tiến hành xóa nhóm này.'}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
