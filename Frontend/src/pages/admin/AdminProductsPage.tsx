import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, message, Space,
  Upload, Image, Popconfirm, Progress, Divider, Switch, type TableColumnsType,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, AppstoreOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { adminPhoneService, brandService, adminOptionService, optionService } from '@/services';
import type { PhoneDTO, PhoneRequest, PhoneVariantDTO, PhoneVariantRequest, PhoneImageDTO, OptionTreeDTO, OptionItemDTO } from '@/types/api';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';

/* Hallmark · Workbench (design.md): page header + pill CTA, table card, modal form, tab-managed variants/images. */

/** antd v6 InputNumber parser — strips thousand separators back to a plain number. */
const parseVariantNumber = (s: string | undefined): 0 => Number((s ?? '').replace(/[^\d]/g, '')) as 0;

/** Select chọn OPTION_ITEM với dropdownRender cho phép tạo item mới nhanh. */
function QuickAddSelect({
  optionId, type, value, onChange, items, placeholder, width,
}: {
  optionId: number | undefined;
  type: string;
  value?: number;
  onChange: (v: number) => void;
  items: OptionItemDTO[];
  placeholder?: string;
  width?: number;
}) {
  const qc = useQueryClient();
  const [newValue, setNewValue] = useState('');
  const quickMut = useMutation({
    mutationFn: (v: string) => {
      if (!optionId) throw new Error('no category');
      return adminOptionService.createItem(optionId, { value: v });
    },
    onSuccess: (created) => {
      message.success(`Đã tạo "${created.value}"`);
      qc.invalidateQueries({ queryKey: ['options'] });
      qc.invalidateQueries({ queryKey: ['admin-option-items'] });
      setNewValue('');
      onChange(created.id);
    },
    onError: () => message.error('Không tạo được (có thể đã tồn tại)'),
  });

  return (
    <Select
      showSearch
      value={value}
      onChange={onChange}
      placeholder={optionId ? placeholder : `Chưa có danh mục ${type}`}
      disabled={!optionId}
      style={{ width: width ?? 140 }}
      options={items.map((i) => ({ value: i.id, label: i.value }))}
      dropdownRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <div className="flex items-center gap-2 px-2 pb-1">
            <Input
              size="small"
              placeholder="Tạo mới..."
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onPressEnter={() => { if (newValue.trim()) quickMut.mutate(newValue.trim()); }}
            />
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              loading={quickMut.isPending}
              onClick={() => { if (newValue.trim()) quickMut.mutate(newValue.trim()); }}
              className="!rounded-full"
            />
          </div>
        </>
      )}
    />
  );
}

export default function AdminProductsPage() {
  const qc = useQueryClient();
  // ── Search + filter + server paging ──
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [brandFilter, setBrandFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const params: Record<string, string> = { page: String(page - 1), size: '15' };
  if (keyword) params.keyword = keyword;
  if (brandFilter) params.brandId = brandFilter;
  if (statusFilter) params.status = statusFilter;

  const { data: phones, isLoading } = useQuery({
    queryKey: ['admin-phones', params],
    queryFn: () => adminPhoneService.list(params),
  });
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: brandService.list });
  const { data: allOptions } = useQuery<OptionTreeDTO[]>({ queryKey: ['options'], queryFn: () => optionService.list(), staleTime: 60_000 });

  const categoryOf = (type: string): OptionTreeDTO | undefined =>
    (allOptions || []).find((c) => c.type === type);
  const itemsByType = (type: string): OptionItemDTO[] =>
    categoryOf(type)?.items || [];
  const itemIdsByType = (type: string): number[] =>
    itemsByType(type).map((i) => i.id);

  // ── Modal thông tin sản phẩm ──
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<PhoneDTO | null>(null);
  const [form] = Form.useForm<PhoneRequest>();

  // ── Modal variants (giá, kho) ──
  const [variantOpen, setVariantOpen] = useState(false);
  const [variantPhone, setVariantPhone] = useState<PhoneDTO | null>(null);
  const [variants, setVariants] = useState<PhoneVariantDTO[]>([]);
  const [varLoading, setVarLoading] = useState(false);
  const [varEdit, setVarEdit] = useState<PhoneVariantDTO | null>(null);
  const [varForm] = Form.useForm<PhoneVariantRequest>();

  // ── Modal hình ảnh ──
  const [imgOpen, setImgOpen] = useState(false);
  const [imgPhone, setImgPhone] = useState<PhoneDTO | null>(null);
  const [images, setImages] = useState<PhoneImageDTO[]>([]);
  const [imgLoading, setImgLoading] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [reorderPending, setReorderPending] = useState(false);

  const createMut = useMutation({
    mutationFn: (v: PhoneRequest) => edit ? adminPhoneService.update(edit.id, v) : adminPhoneService.create(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-phones'] }); setOpen(false); setEdit(null); form.resetFields(); message.success(edit ? 'Cập nhật thành công' : 'Tạo thành công'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => adminPhoneService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-phones'] }); message.success('Đã xóa vĩnh viễn'); },
    onError: (e) => message.error(e instanceof Error ? e.message : 'Không thể xóa'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminPhoneService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-phones'] });
      qc.invalidateQueries({ queryKey: ['phones'] });
      message.success('Đã cập nhật trạng thái');
    },
    onError: (e) => message.error(e instanceof Error ? e.message : 'Cập nhật thất bại'),
  });

  const openForm = (p?: PhoneDTO) => {
    form.resetFields(); // clear previous edit values first (setFieldsValue({}) doesn't)
    if (p) form.setFieldsValue({ brandId: p.brandId, name: p.name, description: p.description, screen: p.screen, os: p.os, chip: p.chip, rearCamera: p.rearCamera, frontCamera: p.frontCamera, battery: p.battery, warranty: p.warranty });
    setEdit(p || null);
    setOpen(true);
  };

  // ── Variants ──
  const openVariantModal = async (p: PhoneDTO) => {
    setVariantPhone(p); setVarEdit(null); varForm.resetFields(); setVariantOpen(true); setVarLoading(true);
    try { setVariants(await adminPhoneService.variants(p.id)); } finally { setVarLoading(false); }
  };
  const varMut = useMutation({
    mutationFn: (v: PhoneVariantRequest) => {
      if (!variantPhone) throw new Error('no phone');
      return varEdit ? adminPhoneService.updateVariant(variantPhone.id, varEdit.id, v) : adminPhoneService.addVariant(variantPhone.id, v);
    },
    onSuccess: async () => {
      message.success(varEdit ? 'Cập nhật biến thể' : 'Thêm biến thể');
      setVarEdit(null); varForm.resetFields();
      if (variantPhone) setVariants(await adminPhoneService.variants(variantPhone.id));
    },
  });
  const varDelMut = useMutation({
    mutationFn: (vid: number) => adminPhoneService.removeVariant(variantPhone!.id, vid),
    onSuccess: async () => { message.success('Đã xóa biến thể'); if (variantPhone) setVariants(await adminPhoneService.variants(variantPhone.id)); },
  });

  // ── Images ──
  const openImageModal = async (p: PhoneDTO) => {
    setImgPhone(p); setImgOpen(true); setImgLoading(true);
    try { setImages(await adminPhoneService.images(p.id)); } finally { setImgLoading(false); }
  };
  const imgAddMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append('file', file);
      return adminPhoneService.addImage(imgPhone!.id, fd);
    },
    onSuccess: async () => {
      setUploadPercent(100);
      message.success('Đã thêm ảnh');
      if (imgPhone) setImages(await adminPhoneService.images(imgPhone.id));
      setTimeout(() => { setUploadingName(null); setUploadPercent(0); }, 400);
    },
    onError: () => { setUploadingName(null); setUploadPercent(0); },
  });
  const imgMainMut = useMutation({
    mutationFn: (img: PhoneImageDTO) => adminPhoneService.updateImage(imgPhone!.id, img.id, { isMain: true }),
    onSuccess: async () => { message.success('Đã đặt ảnh chính'); if (imgPhone) setImages(await adminPhoneService.images(imgPhone.id)); },
  });
  const imgDelMut = useMutation({
    mutationFn: (iid: number) => adminPhoneService.removeImage(imgPhone!.id, iid),
    onSuccess: async () => { message.success('Đã xóa ảnh'); if (imgPhone) setImages(await adminPhoneService.images(imgPhone.id)); },
  });

  // ── Reorder images (↑↓) ──
  const moveImage = async (index: number, dir: -1 | 1) => {
    const next = [...images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
    setReorderPending(true);
    try {
      const ordered = await adminPhoneService.reorderImages(imgPhone!.id, next.map((i) => i.id));
      setImages(ordered);
      qc.invalidateQueries({ queryKey: ['admin-phones'] });
    } catch {
      message.error('Không thể đổi thứ tự');
    } finally {
      setReorderPending(false);
    }
  };

  const columns: TableColumnsType<PhoneDTO> = [
    { title: 'STT', width: 60, render: (_: unknown, __: PhoneDTO, index?: number) => <span className="text-ink-2">{(index ?? 0) + 1}</span> },
    {
      title: 'Sản phẩm', dataIndex: 'name',
      render: (v: string, r) => (
        <div className="flex items-center gap-2.5">
          {r.mainImageUrl ? <Image src={r.mainImageUrl} width={40} height={40} className="!rounded-lg !object-cover" preview={false} /> : <div className="h-10 w-10 rounded-lg bg-bg-muted" />}
          <span className="font-medium text-ink">{v}</span>
        </div>
      ),
    },
    { title: 'Hãng', dataIndex: 'brandName', width: 100, render: (v: string) => <span className="rounded-full bg-bg-muted px-2.5 py-0.5 text-xs font-medium text-ink-2">{v}</span> },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 90,
      render: (s: string, r) => (
        <Switch
          checked={s === 'ACTIVE'}
          loading={statusMut.isPending}
          onChange={(checked) => statusMut.mutate({ id: r.id, status: checked ? 'ACTIVE' : 'INACTIVE' })}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      ),
    },
    {
      title: 'Thao tác', width: 250,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openForm(r)} className="!rounded-full">Sửa</Button>
          <Button size="small" icon={<AppstoreOutlined />} onClick={() => openVariantModal(r)} className="!rounded-full">Giá</Button>
          <Button size="small" icon={<PictureOutlined />} onClick={() => openImageModal(r)} className="!rounded-full">Ảnh</Button>
          <Popconfirm
            title="Xóa vĩnh viễn sản phẩm này?"
            description="Sẽ xóa luôn ảnh, biến thể và không thể khôi phục. Sản phẩm đã có đơn hàng/đánh giá sẽ bị chặn."
            okText="Xóa"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteMut.mutate(r.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} className="!rounded-full" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const variantColumns: TableColumnsType<PhoneVariantDTO> = [
    { title: 'RAM', dataIndex: 'ram', width: 70 },
    { title: 'ROM', dataIndex: 'storage', width: 80 },
    { title: 'Màu', dataIndex: 'color', width: 110, render: (v: string) => <span className="text-ink-2">{v}</span> },
    { title: 'Giá', dataIndex: 'price', width: 120, render: (v: number) => <span className="font-semibold text-ink">{v?.toLocaleString('vi-VN')}₫</span> },
    { title: 'Giá KM', dataIndex: 'discountPrice', width: 120, render: (v: number | null) => v ? <span className="font-medium text-primary-600">{v.toLocaleString('vi-VN')}₫</span> : <span className="text-gray-400">—</span> },
    { title: 'Kho', dataIndex: 'stockQuantity', width: 70, align: 'right' as const },
    {
      title: '', width: 90,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setVarEdit(r); varForm.setFieldsValue({ ramItemId: r.ramItemId, storageItemId: r.storageItemId, colorItemId: r.colorItemId, price: r.price, discountPrice: r.discountPrice, stockQuantity: r.stockQuantity }); }} className="!rounded-full" />
          <Popconfirm title="Xóa biến thể?" onConfirm={() => varDelMut.mutate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} className="!rounded-full" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Sản phẩm"
        subtitle="Quản lý danh mục điện thoại, biến thể giá và hình ảnh"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()} className="!rounded-full !bg-primary-600 hover:!bg-primary-700">
            Thêm sản phẩm
          </Button>
        }
      />
      <AdminCard>
        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input.Search
            placeholder="Tìm sản phẩm..."
            allowClear
            onSearch={(v) => { setKeyword(v.trim()); setPage(1); }}
            className="!w-56"
          />
          <Select
            placeholder="Hãng"
            allowClear
            value={brandFilter}
            onChange={(v) => { setBrandFilter(v); setPage(1); }}
            className="!w-36"
            options={brands?.map((b) => ({ value: String(b.id), label: b.name })) || []}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            className="!w-36"
            options={[
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'INACTIVE', label: 'INACTIVE' },
            ]}
          />
        </div>
        <Table<PhoneDTO>
          columns={columns}
          dataSource={phones?.content || []}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={{
            current: page,
            pageSize: 15,
            total: phones?.totalElements || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
        />
      </AdminCard>

      {/* Modal thông tin sản phẩm — 2 cột */}
      <Modal
        title={<span className="text-base font-bold text-ink">{edit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</span>}
        open={open}
        onCancel={() => { setOpen(false); setEdit(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending}
        okButtonProps={{ className: '!rounded-full !bg-primary-600 hover:!bg-primary-700' }}
        cancelButtonProps={{ className: '!rounded-full' }}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMut.mutate(v)}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Thông tin cơ bản</div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="brandId" label="Hãng" rules={[{ required: true, message: 'Chọn hãng' }]}>
              <Select showSearch options={brands?.map(b => ({ value: b.id, label: b.name })) || []} placeholder="Chọn hãng" />
            </Form.Item>
            <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}><Input placeholder="VD: iPhone 15 Pro Max" /></Form.Item>
          </div>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item>

          <div className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-ink-2">Thông số kỹ thuật</div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="screen" label="Màn hình"><Input placeholder="6.7 inch OLED 120Hz" /></Form.Item>
            <Form.Item name="os" label="HĐH"><Input placeholder="iOS 17" /></Form.Item>
            <Form.Item name="chip" label="Chip"><Input placeholder="Apple A17 Pro" /></Form.Item>
            <Form.Item name="battery" label="Pin"><Input placeholder="4441mAh" /></Form.Item>
            <Form.Item name="rearCamera" label="Camera sau"><Input placeholder="48MP + 12MP" /></Form.Item>
            <Form.Item name="frontCamera" label="Camera trước"><Input placeholder="12MP" /></Form.Item>
            <Form.Item name="warranty" label="Bảo hành"><Input placeholder="12 tháng" /></Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Modal biến thể giá */}
      <Modal
        title={<span className="text-base font-bold text-ink">Biến thể & Giá — {variantPhone?.name}</span>}
        open={variantOpen}
        onCancel={() => setVariantOpen(false)}
        footer={null}
        width={760}
      >
        <Table<PhoneVariantDTO> columns={variantColumns} dataSource={variants} rowKey="id" loading={varLoading} size="small" pagination={false} className="mb-4" />
        <div className="rounded-xl border border-dashed border-gray-200 bg-bg-soft p-4">
          <div className="mb-3 text-sm font-semibold text-ink">{varEdit ? 'Sửa biến thể' : 'Thêm biến thể mới'}</div>
          <Form form={varForm} layout="inline" onFinish={(v) => varMut.mutate(v)}>
            <Form.Item name="ramItemId" rules={[{ required: true, message: 'RAM' }]}>
              <QuickAddSelect optionId={categoryOf('RAM')?.id} type="RAM" value={varForm.getFieldValue('ramItemId')} onChange={(v) => varForm.setFieldValue('ramItemId', v)} items={itemsByType('RAM')} placeholder="RAM" width={90} />
            </Form.Item>
            <Form.Item name="storageItemId" rules={[{ required: true, message: 'ROM' }]}>
              <QuickAddSelect optionId={categoryOf('STORAGE')?.id} type="STORAGE" value={varForm.getFieldValue('storageItemId')} onChange={(v) => varForm.setFieldValue('storageItemId', v)} items={itemsByType('STORAGE')} placeholder="ROM" width={100} />
            </Form.Item>
            <Form.Item name="colorItemId" rules={[{ required: true, message: 'Màu' }]}>
              <QuickAddSelect optionId={categoryOf('COLOR')?.id} type="COLOR" value={varForm.getFieldValue('colorItemId')} onChange={(v) => varForm.setFieldValue('colorItemId', v)} items={itemsByType('COLOR')} placeholder="Màu" width={130} />
            </Form.Item>
            <Form.Item name="price" rules={[{ required: true, message: 'Giá' }]}>
              <InputNumber placeholder="Giá (₫)" style={{ width: 140 }} min={0}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={parseVariantNumber} />
            </Form.Item>
            <Form.Item name="discountPrice">
              <InputNumber placeholder="Giá KM" style={{ width: 120 }} min={0}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={parseVariantNumber} />
            </Form.Item>
            <Form.Item name="stockQuantity" rules={[{ required: true, message: 'Kho' }]}><InputNumber placeholder="SL" style={{ width: 70 }} min={0} /></Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={varMut.isPending} className="!rounded-full !bg-primary-600">{varEdit ? 'Lưu' : 'Thêm'}</Button>
                {varEdit && <Button onClick={() => { setVarEdit(null); varForm.resetFields(); }} className="!rounded-full">Hủy</Button>}
              </Space>
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Modal hình ảnh */}
      <Modal
        title={<span className="text-base font-bold text-ink">Hình ảnh — {imgPhone?.name}</span>}
        open={imgOpen}
        onCancel={() => { setImgOpen(false); setUploadingName(null); setUploadPercent(0); }}
        footer={null}
        width={680}
      >
        <Upload
          accept="image/*"
          showUploadList={false}
          customRequest={({ file, onSuccess, onError }) => {
            const f = file as File;
            setUploadingName(f.name);
            setUploadPercent(0);
            imgAddMut.mutate(f, {
              onSuccess: () => onSuccess?.(undefined),
              onError: (e) => { onError?.(e as unknown as ProgressEvent); setUploadingName(null); setUploadPercent(0); },
            });
          }}
        >
          <Button type="primary" icon={<PlusOutlined />} loading={imgAddMut.isPending} className="!rounded-full !bg-primary-600 mb-4">
            {uploadingName ? `Đang tải: ${uploadingName}` : 'Tải ảnh lên'}
          </Button>
        </Upload>
        {uploadingName && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-ink-2">
              <span>{uploadingName}</span>
              <span>{uploadPercent}%</span>
            </div>
            <Progress percent={uploadPercent} showInfo={false} size="small" />
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <div key={img.id} className="relative overflow-hidden rounded-xl border border-gray-100 bg-bg-soft">
              <Image src={img.imageUrl} className="!h-28 !w-full !object-cover" preview />
              <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">#{idx + 1}</span>
              {img.isMain && <span className="absolute right-2 top-2 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Ảnh chính</span>}
              <div className="flex items-center gap-1.5 p-2">
                <Button
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={idx === 0 || reorderPending}
                  onClick={() => moveImage(idx, -1)}
                  className="!rounded-full !text-xs flex-1"
                  aria-label="Lên"
                />
                <Button
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={idx === images.length - 1 || reorderPending}
                  onClick={() => moveImage(idx, 1)}
                  className="!rounded-full !text-xs flex-1"
                  aria-label="Xuống"
                />
                {!img.isMain && (
                  <Button size="small" loading={imgMainMut.isPending} onClick={() => imgMainMut.mutate(img)} className="!rounded-full !text-xs flex-1">Chính</Button>
                )}
                <Popconfirm title="Xóa ảnh?" onConfirm={() => imgDelMut.mutate(img.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} className="!rounded-full !text-xs flex-1" />
                </Popconfirm>
              </div>
            </div>
          ))}
          {images.length === 0 && !imgLoading && <p className="col-span-3 py-6 text-center text-sm text-gray-400">Chưa có hình ảnh</p>}
        </div>
      </Modal>
    </div>
  );
}
