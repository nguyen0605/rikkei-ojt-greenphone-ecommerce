import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Tabs, Divider, Image, Switch, type TableColumnsType } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { adminOptionService } from '@/services';
import type { OptionDTO, OptionRequest, OptionItemDTO, OptionItemRequest, PhoneDTO, PageResponse } from '@/types/api';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';

/* Hallmark · Workbench (design.md): page header + pill CTA, table card, modal form. */

const FALLBACK_TYPES = ['RAM', 'STORAGE', 'COLOR', 'FEATURE'];

const typeLabel: Record<string, string> = {
  RAM: 'RAM',
  STORAGE: 'Dung lượng bộ nhớ',
  COLOR: 'Màu sắc',
  FEATURE: 'Tính năng nổi bật',
};

export default function AdminOptionsPage() {
  const qc = useQueryClient();
  const { data: categories } = useQuery({ queryKey: ['admin-options'], queryFn: adminOptionService.list });

  const [activeType, setActiveType] = useState<string>(FALLBACK_TYPES[0]);
  const activeCategory = (categories || []).find((c) => c.type === activeType);

  // ── Items của category đang chọn ──
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['admin-option-items', activeCategory?.id],
    queryFn: () => adminOptionService.items(activeCategory!.id),
    enabled: !!activeCategory,
  });

  // ── Modal category ──
  const [catOpen, setCatOpen] = useState(false);
  const [catEdit, setCatEdit] = useState<OptionDTO | null>(null);
  const [catForm] = Form.useForm<OptionRequest>();
  const [newType, setNewType] = useState('');

  // ── Modal item ──
  const [itemOpen, setItemOpen] = useState(false);
  const [itemEdit, setItemEdit] = useState<OptionItemDTO | null>(null);
  const [itemForm] = Form.useForm<OptionItemRequest>();

  // ── Usage modal ──
  const [usageOpen, setUsageOpen] = useState(false);
  const [usageTarget, setUsageTarget] = useState<OptionItemDTO | null>(null);
  const [usagePage, setUsagePage] = useState(0);
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['option-item-usage', usageTarget?.id, usagePage],
    queryFn: () => adminOptionService.itemUsage(usageTarget!.id, { page: String(usagePage), size: '5' }),
    enabled: usageOpen && !!usageTarget,
  });

  const catMut = useMutation({
    mutationFn: (v: OptionRequest) => catEdit ? adminOptionService.update(catEdit.id, v) : adminOptionService.create(v),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['admin-options'] });
      qc.invalidateQueries({ queryKey: ['options'] });
      qc.invalidateQueries({ queryKey: ['admin-option-types'] });
      setCatOpen(false); setCatEdit(null); catForm.resetFields(); setNewType('');
      if (created.type) setActiveType(created.type);
      message.success(catEdit ? 'Cập nhật' : 'Tạo');
    },
  });

  const catDelMut = useMutation({
    mutationFn: (id: number) => adminOptionService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-options'] }); qc.invalidateQueries({ queryKey: ['options'] }); message.success('Đã xóa'); },
    onError: (e: Error) => message.error(e.message || 'Không thể xóa (còn items?)'),
  });

  const itemMut = useMutation({
    mutationFn: (v: OptionItemRequest) => itemEdit ? adminOptionService.updateItem(itemEdit.id, v) : adminOptionService.createItem(activeCategory!.id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-option-items'] });
      qc.invalidateQueries({ queryKey: ['options'] });
      setItemOpen(false); setItemEdit(null); itemForm.resetFields();
      message.success(itemEdit ? 'Cập nhật' : 'Tạo');
    },
  });

  const itemDelMut = useMutation({
    mutationFn: (id: number) => adminOptionService.removeItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-option-items'] }); qc.invalidateQueries({ queryKey: ['options'] }); message.success('Đã xóa'); },
    onError: (e: Error) => message.error(e.message || 'Không thể xóa (item đang được dùng)'),
  });

  const openCatForm = (c?: OptionDTO) => {
    catForm.resetFields();
    if (c) catForm.setFieldsValue({ type: c.type, label: c.label, enabled: c.enabled, maxItems: c.maxItems, sortOrder: c.sortOrder });
    else catForm.setFieldsValue({ type: '', label: '', enabled: true, maxItems: 5 });
    setCatEdit(c || null);
    setCatOpen(true);
  };

  const openItemForm = (i?: OptionItemDTO) => {
    itemForm.resetFields();
    if (i) itemForm.setFieldsValue({ value: i.value, hexColor: i.hexColor || undefined, sortOrder: i.sortOrder });
    setItemEdit(i || null);
    setItemOpen(true);
  };

  const handleDeleteItem = async (item: OptionItemDTO) => {
    const usage = await adminOptionService.itemUsage(item.id, { page: '0', size: '1' });
    if (usage.totalElements > 0) {
      setUsageTarget(item);
      setUsagePage(0);
      setUsageOpen(true);
      return;
    }
    Modal.confirm({
      title: 'Xác nhận xoá',
      icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
      content: `Xoá tùy chọn "${item.value}"?`,
      okText: 'Xoá',
      okType: 'danger',
      cancelText: 'Hủy',
      okButtonProps: { className: '!rounded-full' },
      cancelButtonProps: { className: '!rounded-full' },
      onOk: () => itemDelMut.mutate(item.id),
    });
  };

  const itemColumns: TableColumnsType<OptionItemDTO> = [
    { title: 'STT', width: 60, render: (_: unknown, __: OptionItemDTO, index?: number) => <span className="text-ink-2">{(index ?? 0) + 1}</span> },
    {
      title: 'Giá trị', dataIndex: 'value', render: (v: string, r) => (
        <div className="flex items-center gap-2.5">
          {activeType === 'COLOR' && r.hexColor && (
            <span className="inline-block h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: r.hexColor }} />
          )}
          <span className="font-medium text-ink">{v}</span>
        </div>
      ),
    },
    { title: 'Mã màu', dataIndex: 'hexColor', width: 120, render: (v: string | null) => v ? <code className="text-xs text-ink-2">{v}</code> : <span className="text-gray-400">—</span> },
    { title: 'Thứ tự', dataIndex: 'sortOrder', width: 80, align: 'right' as const },
    { title: '', width: 110, render: (_, r) => <Space><Button size="small" icon={<EditOutlined />} onClick={() => openItemForm(r)} className="!rounded-full" /><Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteItem(r)} className="!rounded-full" /></Space> },
  ];

  const catColumns: TableColumnsType<OptionDTO> = [
    { title: 'STT', width: 60, render: (_: unknown, __: OptionDTO, index?: number) => <span className="text-ink-2">{(index ?? 0) + 1}</span> },
    { title: 'Type', dataIndex: 'type', width: 100, render: (v: string) => <span className="rounded bg-primary-50 px-2 py-0.5 font-mono text-xs font-semibold text-primary-700">{v}</span> },
    { title: 'Tên hiển thị', dataIndex: 'label', render: (v: string) => <span className="font-medium text-ink">{v}</span> },
    { title: 'Hiện tối đa', dataIndex: 'maxItems', width: 110, align: 'right' as const },
    { title: 'Hiển thị', dataIndex: 'enabled', width: 90, render: (v: boolean) => <Switch size="small" checked={v} disabled /> },
    { title: 'Thứ tự', dataIndex: 'sortOrder', width: 80, align: 'right' as const },
    { title: '', width: 110, render: (_, r) => <Space><Button size="small" icon={<EditOutlined />} onClick={() => openCatForm(r)} className="!rounded-full" /><Button size="small" danger icon={<DeleteOutlined />} onClick={() => { Modal.confirm({ title: 'Xoá danh mục?', content: `Xoá danh mục "${r.label}"? Chỉ xoá được khi không còn items.`, okText: 'Xoá', okType: 'danger', cancelText: 'Hủy', okButtonProps: { className: '!rounded-full' }, cancelButtonProps: { className: '!rounded-full' }, onOk: () => catDelMut.mutate(r.id) }); }} className="!rounded-full" /></Space> },
  ];

  const usageColumns: TableColumnsType<PhoneDTO> = [
    {
      title: 'Sản phẩm', dataIndex: 'name',
      render: (v: string, r) => (
        <div className="flex items-center gap-2.5">
          {r.mainImageUrl ? <Image src={r.mainImageUrl} width={32} height={32} className="!rounded-md !object-cover" preview={false} /> : <div className="h-8 w-8 rounded-md bg-bg-muted" />}
          <span className="font-medium text-ink">{v}</span>
        </div>
      ),
    },
    { title: 'Hãng', dataIndex: 'brandName', width: 100, render: (v: string) => <span className="rounded-full bg-bg-muted px-2.5 py-0.5 text-xs font-medium text-ink-2">{v}</span> },
  ];

  const tabs = categories && categories.length > 0 ? categories.map((c) => c.type) : FALLBACK_TYPES;

  return (
    <div>
      <AdminPageHeader
        title="Tùy chọn sản phẩm"
        subtitle="Quản lý danh mục (RAM, dung lượng, màu sắc...) và các giá trị trong mỗi danh mục"
        actions={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCatForm()} className="!rounded-full !bg-primary-600 hover:!bg-primary-700">
              Thêm danh mục
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => openItemForm()} disabled={!activeCategory} className="!rounded-full">
              Thêm giá trị
            </Button>
          </Space>
        }
      />
      <AdminCard>
        <Tabs
          activeKey={activeType}
          onChange={setActiveType}
          items={tabs.map(t => ({ key: t, label: typeLabel[t] || t }))}
          className="mb-2"
        />
        {/* Items của category đang chọn */}
        <Table<OptionItemDTO> columns={itemColumns} dataSource={items || []} rowKey="id" loading={itemsLoading} size="middle" pagination={{ pageSize: 15 }} />
      </AdminCard>

      {/* Danh sách categories */}
      <div className="mt-6">
        <AdminCard>
          <div className="mb-2 text-sm font-bold text-ink">Danh sách danh mục</div>
          <Table<OptionDTO> columns={catColumns} dataSource={categories || []} rowKey="id" size="middle" pagination={false} />
        </AdminCard>
      </div>

      {/* Modal danh mục */}
      <Modal
        title={<span className="text-base font-bold text-ink">{catEdit ? `Sửa: ${catEdit.label}` : 'Thêm danh mục'}</span>}
        open={catOpen}
        onCancel={() => { setCatOpen(false); setCatEdit(null); catForm.resetFields(); setNewType(''); }}
        onOk={() => catForm.submit()}
        confirmLoading={catMut.isPending}
        okButtonProps={{ className: '!rounded-full !bg-primary-600 hover:!bg-primary-700' }}
        cancelButtonProps={{ className: '!rounded-full' }}
      >
        <Form form={catForm} layout="vertical" onFinish={(v) => catMut.mutate(v)}>
          <Form.Item name="type" label="Type (mã danh mục)" rules={[{ required: true, message: 'Nhập type' }]}>
            <Select
              disabled={!!catEdit}
              options={tabs.map(t => ({ value: t, label: typeLabel[t] || t }))}
              placeholder="Chọn hoặc tạo mới..."
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <div className="flex items-center gap-2 px-2 pb-1">
                    <Input
                      size="small"
                      placeholder="Danh mục mới (VD: CHIP)"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value.toUpperCase())}
                      onPressEnter={() => { if (newType.trim()) { catForm.setFieldValue('type', newType.trim()); setNewType(''); } }}
                    />
                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { if (newType.trim()) { catForm.setFieldValue('type', newType.trim()); setNewType(''); } }} className="!rounded-full" />
                  </div>
                </>
              )}
            />
          </Form.Item>
          <Form.Item name="label" label="Tên hiển thị" rules={[{ required: true, message: 'Nhập tên' }]}><Input placeholder="VD: Dung lượng bộ nhớ" /></Form.Item>
          <Form.Item name="maxItems" label="Hiện tối đa (item)" rules={[{ required: true, message: 'Nhập số' }]}><InputNumber min={1} max={100} className="!w-full" /></Form.Item>
          <Form.Item name="enabled" label="Hiển thị trong bộ lọc" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự"><InputNumber className="!w-full" /></Form.Item>
        </Form>
      </Modal>

      {/* Modal giá trị */}
      <Modal
        title={<span className="text-base font-bold text-ink">{itemEdit ? `Sửa giá trị` : `Thêm giá trị vào ${activeType}`}</span>}
        open={itemOpen}
        onCancel={() => { setItemOpen(false); setItemEdit(null); itemForm.resetFields(); }}
        onOk={() => itemForm.submit()}
        confirmLoading={itemMut.isPending}
        okButtonProps={{ className: '!rounded-full !bg-primary-600 hover:!bg-primary-700' }}
        cancelButtonProps={{ className: '!rounded-full' }}
      >
        <Form form={itemForm} layout="vertical" onFinish={(v) => itemMut.mutate(v)}>
          <Form.Item name="value" label="Giá trị" rules={[{ required: true, message: 'Nhập giá trị' }]}>
            <Input placeholder={activeType === 'COLOR' ? 'VD: black' : 'VD: 8GB'} />
          </Form.Item>
          {activeType === 'COLOR' && (
            <Form.Item name="hexColor" label="Mã màu (hex)" rules={[{ pattern: /^#[0-9A-Fa-f]{6}$/, message: 'VD: #1F1F1F' }]}>
              <Input placeholder="#1F1F1F" />
            </Form.Item>
          )}
          <Form.Item name="sortOrder" label="Thứ tự"><InputNumber className="!w-full" placeholder="Tự động nếu để trống" /></Form.Item>
        </Form>
      </Modal>

      {/* Modal usage */}
      <Modal
        title={<span className="text-base font-bold text-ink">Không thể xoá giá trị này</span>}
        open={usageOpen}
        onCancel={() => { setUsageOpen(false); setUsageTarget(null); }}
        footer={<Button type="primary" onClick={() => { setUsageOpen(false); setUsageTarget(null); }} className="!rounded-full !bg-primary-600">Đóng</Button>}
        width={560}
      >
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          <WarningOutlined className="mt-0.5" />
          <span>
            Giá trị <strong>"{usageTarget?.value}"</strong> đang được {(usageData as PageResponse<PhoneDTO> | undefined)?.totalElements ?? 0} điện thoại sử dụng.
            Không thể xoá — hãy đổi tùy chọn của các sản phẩm này trước.
          </span>
        </div>
        <Table<PhoneDTO>
          columns={usageColumns}
          dataSource={(usageData as PageResponse<PhoneDTO> | undefined)?.content || []}
          rowKey="id"
          loading={usageLoading}
          size="small"
          pagination={{
            pageSize: 5,
            current: usagePage + 1,
            total: (usageData as PageResponse<PhoneDTO> | undefined)?.totalElements || 0,
            onChange: (p) => setUsagePage(p - 1),
          }}
        />
      </Modal>
    </div>
  );
}
