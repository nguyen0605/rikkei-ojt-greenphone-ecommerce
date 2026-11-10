import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Form, Input, InputNumber, Modal, Select } from 'antd';
import { adminPhoneService } from '@/services';
import { warehouseService, warehouseInventoryService, type WarehouseStock } from '@/services/warehouseService';

export interface BranchMovementValues { variantId: number; quantity: number; reason: string; warehouseId: number; targetWarehouseId?: number }
export interface BranchAction { mode: 'IMPORT' | 'EXPORT' | 'TRANSFER'; variant?: WarehouseStock }
interface Props { warehouseId: number; action: BranchAction; onCancel: () => void; onSubmit: (values: BranchMovementValues) => Promise<unknown> }

export default function BranchMovementModal({ warehouseId, action, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<BranchMovementValues>();
  const [phoneId, setPhoneId] = useState<number>();
  const [keyword, setKeyword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const phones = useQuery({ queryKey: ['warehouse-phone-search', keyword], queryFn: () => adminPhoneService.list({ keyword, page: '0', size: '20' }), enabled: !action.variant });
  const variants = useQuery({ queryKey: ['warehouse-phone-variants', phoneId], queryFn: () => adminPhoneService.variants(phoneId!), enabled: !!phoneId });
  const warehouses = useQuery({ queryKey: ['admin', 'warehouses'], queryFn: ({ signal }) => warehouseService.list(signal) });
  const sourceId = Form.useWatch('warehouseId', form);
  const variantId = Form.useWatch('variantId', form) ?? action.variant?.variantId;
  const distribution = useQuery({ queryKey: ['warehouse-distribution', variantId], queryFn: () => warehouseInventoryService.distribution(variantId!), enabled: !!variantId });
  const options = (warehouses.data ?? []).filter((warehouse) => warehouse.status === 'ACTIVE').map((warehouse) => {
    const quantity = distribution.data?.find((row) => row.warehouseId === warehouse.id)?.quantity;
    return { value: warehouse.id, label: `${warehouse.code} — ${warehouse.name} · Tồn: ${quantity === undefined ? '…' : quantity}` };
  });
  const submit = async (values: BranchMovementValues) => {
    if (lock.current) return;
    lock.current = true; setPending(true); setError('');
    try { await onSubmit({ ...values, reason: values.reason.trim() }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không thể cập nhật kho'); }
    finally { lock.current = false; setPending(false); }
  };
  const title = { IMPORT: 'Nhập sản phẩm vào chi nhánh', EXPORT: 'Xuất sản phẩm khỏi chi nhánh', TRANSFER: 'Chuyển kho' }[action.mode];
  return <Modal open title={title} okText="Xác nhận" cancelText="Hủy" confirmLoading={pending}
    onOk={() => form.submit()} onCancel={() => { if (!lock.current) onCancel(); }}
    width={640} okButtonProps={{ disabled: pending }} cancelButtonProps={{ disabled: pending }} closable={!pending} mask={{ closable: false }}>
    {error && <Alert type="error" title={error} showIcon className="mb-4" />}
    {(phones.isError || variants.isError || warehouses.isError) && <Alert type="error" title="Không tải được danh mục. Vui lòng đóng và thử lại." className="mb-4" />}
    <Form form={form} layout="vertical" onFinish={submit} disabled={pending}
      initialValues={{ variantId: action.variant?.variantId, warehouseId: action.mode === 'IMPORT' ? 0 : warehouseId,
        targetWarehouseId: action.mode === 'IMPORT' ? warehouseId : action.mode === 'EXPORT' ? 0 : undefined, quantity: 1 }}>
      {action.variant ? <div className="mb-5 rounded-xl bg-green-50 p-4"><div className="font-semibold">{action.variant.productName}</div>
        <div className="mt-1 text-sm text-gray-600">{action.variant.ram} / {action.variant.storage} / {action.variant.color} · {action.variant.sku}</div></div> : <>
        <Form.Item label="Sản phẩm">
          <Select aria-label="Sản phẩm" showSearch filterOption={false} onSearch={setKeyword} loading={phones.isFetching}
            options={(phones.data?.content ?? []).map((phone) => ({ value: phone.id, label: phone.name }))}
            onChange={(id: number) => { setPhoneId(id); form.setFieldValue('variantId', undefined); }} placeholder="Tìm sản phẩm có sẵn" />
        </Form.Item>
      </>}
      <Form.Item name="variantId" label="Biến thể" hidden={!!action.variant} rules={[{ required: true, message: 'Chọn biến thể' }]}>
        <Select aria-label="Biến thể" loading={variants.isFetching} disabled={!phoneId || pending} placeholder="Chọn RAM / dung lượng / màu"
          options={(variants.data ?? []).map((variant) => ({ value: variant.id, label: `${variant.ram} / ${variant.storage} / ${variant.color} — ${variant.sku}` }))} />
      </Form.Item>
      <Form.Item name="targetWarehouseId" label="Kho nhập" dependencies={['warehouseId']}
        rules={[{ required: true, message: 'Chọn kho nhập' }, { validator: (_, value) => value !== undefined && value === sourceId ? Promise.reject(new Error('Kho nhập phải khác kho xuất')) : Promise.resolve() }]}>
        <Select aria-label="Kho nhập" placeholder="Chọn kho nhận hàng" loading={warehouses.isFetching || distribution.isFetching}
          options={[{ value: 0, label: 'Ngoài hệ thống (xuất bán / trả hàng)' }, ...options]} />
      </Form.Item>
      <Form.Item name="warehouseId" label="Kho xuất" dependencies={['targetWarehouseId']}
        rules={[{ required: true, message: 'Chọn kho xuất' }, ({ getFieldValue }) => ({ validator: (_, value) => value !== undefined && value === getFieldValue('targetWarehouseId') ? Promise.reject(new Error('Kho xuất phải khác kho nhập')) : Promise.resolve() })]}>
        <Select aria-label="Kho xuất" placeholder="Chọn kho xuất hàng" loading={warehouses.isFetching || distribution.isFetching}
          options={[{ value: 0, label: 'Ngoài hệ thống (nhà cung cấp / nhập mới)' }, ...options]} />
      </Form.Item>
      {distribution.isError && <Alert type="warning" title="Không tải được tồn từng kho. Vui lòng thử lại trước khi xác nhận." className="mb-3" />}
      <Form.Item name="quantity" label="Số lượng" rules={[{ required: true, message: 'Nhập số lượng' }, { type: 'integer', min: 1, max: 2147483647, message: 'Số lượng phải là số nguyên dương' }]}>
        <InputNumber aria-label="Số lượng" min={1} max={2147483647} precision={0} className="!w-full" />
      </Form.Item>
      <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true, message: 'Nhập lý do' }, { max: 255, message: 'Tối đa 255 ký tự' }]}>
        <Input.TextArea aria-label="Lý do" rows={3} maxLength={255} />
      </Form.Item>
    </Form>
  </Modal>;
}
