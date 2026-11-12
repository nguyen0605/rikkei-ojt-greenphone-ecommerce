import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input, InputNumber, Modal, Select } from 'antd';
import { adminPhoneService } from '@/services';
import { warehouseService } from '@/services/warehouseService';
import { supplierService } from '@/services/supplierService';
import { formatProcurementVnd, type PurchaseOrder, type PurchaseOrderRequest } from '@/services/purchaseOrderService';
import { purchaseOrderSchema } from './purchaseOrderSchema';

function VariantPicker({ value, onChange, initialSku }: { value: number; onChange: (value: number) => void; initialSku?: string }) {
  const [keyword, setKeyword] = useState('');
  const [phone, setPhone] = useState<number>();
  const products = useQuery({ queryKey: ['po-product-search', keyword], queryFn: () => adminPhoneService.list({ keyword, page: '0', size: '20' }) });
  const variants = useQuery({ queryKey: ['po-variants', phone], queryFn: () => adminPhoneService.variants(phone!), enabled: !!phone });
  return <div className="grid gap-2 sm:grid-cols-2">
    <Select aria-label="Chọn sản phẩm" placeholder="Tìm sản phẩm" showSearch filterOption={false} onSearch={setKeyword} loading={products.isFetching}
      options={(products.data?.content ?? []).map((item) => ({ value: item.id, label: item.name }))} onChange={(id: number) => { setPhone(id); onChange(0); }} />
    <Select aria-label="Chọn biến thể" value={value || undefined} placeholder="RAM / ROM / Màu / SKU" disabled={!phone && !value} loading={variants.isFetching} onChange={onChange}
      options={[
        ...(initialSku && value && !(variants.data ?? []).some((item) => item.id === value) ? [{ value, label: initialSku }] : []),
        ...(variants.data ?? []).filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item.id, label: `${item.ram} / ${item.storage} / ${item.color} · ${item.sku}` })),
      ]} />
    {(products.isError || variants.isError) && <Alert type="error" title="Không tải được sản phẩm; vui lòng thử lại" />}
  </div>;
}
export default function CreatePurchaseOrderModal({ onCancel, onSubmit, initialOrder }: { onCancel: () => void; onSubmit: (values: PurchaseOrderRequest) => Promise<unknown>; initialOrder?: PurchaseOrder }) {
  const locked = useRef(false);
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<PurchaseOrderRequest>({
    resolver: zodResolver(purchaseOrderSchema), defaultValues: initialOrder
      ? { supplierId: initialOrder.supplierId, warehouseId: initialOrder.warehouseId, status: 'DRAFT', note: initialOrder.note ?? '', items: initialOrder.items.map((item) => ({ variantId: item.variantId, quantity: item.quantityOrdered, unitCost: item.unitCost })) }
      : { supplierId: 0, warehouseId: 0, status: 'ORDERED', note: '', items: [{ variantId: 0, quantity: 1, unitCost: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const suppliers = useQuery({ queryKey: ['admin-suppliers', ''], queryFn: () => supplierService.list() });
  const warehouses = useQuery({ queryKey: ['admin', 'warehouses'], queryFn: () => warehouseService.list() });
  const items = useWatch({ control, name: 'items' });
  const submit = async () => {
    if (locked.current) return;
    locked.current = true;
    try {
      await handleSubmit(async (values) => {
        try { await onSubmit(values); }
        catch (error) { setError('root', { message: error instanceof Error ? error.message : 'Không thể tạo đơn nhập hàng' }); }
      })();
    }
    finally { locked.current = false; }
  };
  return <Modal open width={1000} title={initialOrder ? 'Chỉnh sửa PO nháp' : 'Tạo Đơn Nhập Hàng Mới'} okText={initialOrder ? 'Lưu thay đổi' : 'Tạo Đơn'} cancelText="Hủy" confirmLoading={isSubmitting}
    okButtonProps={{ disabled: isSubmitting }} cancelButtonProps={{ disabled: isSubmitting }} closable={!isSubmitting} mask={{ closable: false }} onCancel={() => { if (!locked.current) onCancel(); }} onOk={() => void submit()}>
    {errors.root && <Alert type="error" title={errors.root.message} className="mb-4" />}
    {(suppliers.isError || warehouses.isError) && <Alert type="error" title="Không tải được danh mục nhà cung cấp/kho" />}
    <Form layout="vertical" disabled={isSubmitting}>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item label="Nhà cung cấp" required validateStatus={errors.supplierId ? 'error' : undefined} help={errors.supplierId?.message}>
          <Controller name="supplierId" control={control} render={({ field }) => <Select {...field} value={field.value || undefined} aria-label="Nhà cung cấp" placeholder="Chọn nhà cung cấp" loading={suppliers.isPending}
            options={(suppliers.data ?? []).filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item.id, label: item.name }))} />} />
        </Form.Item>
        <Form.Item label="Kho đích" required validateStatus={errors.warehouseId ? 'error' : undefined} help={errors.warehouseId?.message}>
          <Controller name="warehouseId" control={control} render={({ field }) => <Select {...field} value={field.value || undefined} aria-label="Kho đích" placeholder="Chọn kho nhận hàng" loading={warehouses.isPending}
            options={(warehouses.data ?? []).filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item.id, label: item.name }))} />} />
        </Form.Item>
      </div>
      {fields.map((line, index) => <div key={line.id} className="mb-3 rounded-lg border border-gray-200 p-3">
        <div className="mb-2 flex items-center justify-between"><strong>Dòng hàng {index + 1}</strong><Button danger size="small" disabled={fields.length === 1} onClick={() => remove(index)}>Xóa dòng</Button></div>
        <Form.Item label="Sản phẩm / Biến thể" required validateStatus={errors.items?.[index]?.variantId ? 'error' : undefined} help={errors.items?.[index]?.variantId?.message}>
          <Controller name={`items.${index}.variantId`} control={control} render={({ field }) => <VariantPicker value={field.value} onChange={field.onChange}
            initialSku={initialOrder?.items.find((item) => item.variantId === field.value)?.sku} />} />
        </Form.Item>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item label="Số lượng" required validateStatus={errors.items?.[index]?.quantity ? 'error' : undefined} help={errors.items?.[index]?.quantity?.message}>
            <Controller name={`items.${index}.quantity`} control={control} render={({ field }) => <InputNumber {...field} aria-label="Số lượng" className="w-full" min={1} precision={0} onChange={(value) => field.onChange(value ?? 0)} />} />
          </Form.Item>
          <Form.Item label="Đơn giá nhập (VND)" required validateStatus={errors.items?.[index]?.unitCost ? 'error' : undefined} help={errors.items?.[index]?.unitCost?.message}>
            <Controller name={`items.${index}.unitCost`} control={control} render={({ field }) => <InputNumber {...field} aria-label="Đơn giá nhập (VND)" className="w-full" min={1} precision={0}
              formatter={(value) => value ? Number(value).toLocaleString('vi-VN') : ''} parser={(value) => Number(value?.replace(/\D/g, '') ?? 0)} onChange={(value) => field.onChange(value ?? 0)} />} />
          </Form.Item>
        </div>
      </div>)}
      <Button onClick={() => append({ variantId: 0, quantity: 1, unitCost: 0 })} disabled={fields.length >= 100}>Thêm dòng hàng</Button>
      {errors.items?.root && <p className="text-red-500">{errors.items.root.message}</p>}
      <div className="my-4 text-right text-lg font-semibold">Tổng dự kiến: {formatProcurementVnd(items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0))}</div>
      {!initialOrder && <Form.Item label="Trạng thái ban đầu"><Controller name="status" control={control} render={({ field }) => <Select {...field} options={[{ value: 'ORDERED', label: 'Đặt hàng (ORDERED)' }, { value: 'DRAFT', label: 'Lưu nháp (DRAFT)' }]} />} /></Form.Item>}
      <Form.Item label="Ghi chú" help={errors.note?.message} validateStatus={errors.note ? 'error' : undefined}><Controller name="note" control={control} render={({ field }) => <Input.TextArea {...field} rows={2} maxLength={2000} />} /></Form.Item>
    </Form>
  </Modal>;
}
