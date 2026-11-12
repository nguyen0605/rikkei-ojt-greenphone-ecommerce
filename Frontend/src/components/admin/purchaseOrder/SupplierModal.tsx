import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Form, Input, Modal } from 'antd';
import type { Supplier, SupplierRequest } from '@/services/supplierService';
const schema = z.object({
  code: z.string().trim().min(1, 'Nhập mã nhà cung cấp').max(50).regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, 'Mã chỉ gồm chữ hoa, số và dấu gạch nối'),
  name: z.string().trim().min(3, 'Tên tối thiểu 3 ký tự').max(150),
  taxCode: z.string().trim().regex(/^$|^[0-9]{10}(?:-?[0-9]{3})?$/, 'Mã số thuế gồm 10 hoặc 13 chữ số').nullable(),
  email: z.string().trim().max(100).refine((value) => !value || z.email().safeParse(value).success, 'Email không hợp lệ').nullable(),
  phone: z.string().trim().max(20, 'Tối đa 20 ký tự').nullable(),
  address: z.string().trim().max(255, 'Tối đa 255 ký tự').nullable(),
});
export default function SupplierModal({ supplier, onCancel, onSubmit }: {
  supplier: Supplier | null; onCancel: () => void; onSubmit: (values: SupplierRequest) => Promise<unknown>;
}) {
  const guard = useRef(false);
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<SupplierRequest>({
    resolver: zodResolver(schema), defaultValues: supplier ? { code: supplier.code, name: supplier.name, taxCode: supplier.taxCode, email: supplier.email, phone: supplier.phone, address: supplier.address }
      : { code: '', name: '', taxCode: '', email: '', phone: '', address: '' },
  });
  const submit = async () => {
    if (guard.current) return;
    guard.current = true;
    try { await handleSubmit(async (values) => {
      try { await onSubmit(values); }
      catch (error) { setError('root', { message: error instanceof Error ? error.message : 'Không thể lưu nhà cung cấp' }); }
    })(); } finally { guard.current = false; }
  };
  const fields = [{ name: 'code', label: 'Mã NCC', required: true }, { name: 'name', label: 'Tên công ty', required: true },
    { name: 'taxCode', label: 'Mã số thuế' }, { name: 'phone', label: 'Hotline' }, { name: 'email', label: 'Email' }, { name: 'address', label: 'Địa chỉ' }] as const;
  return <Modal open title={supplier ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'} okText="Lưu" cancelText="Hủy" confirmLoading={isSubmitting}
    okButtonProps={{ disabled: isSubmitting, 'aria-label': 'Lưu' }} cancelButtonProps={{ disabled: isSubmitting }} closable={!isSubmitting} mask={{ closable: false }}
    onCancel={() => { if (!guard.current) onCancel(); }} onOk={() => void submit()}>
    {errors.root && <Alert className="mb-4" type="error" title={errors.root.message} />}
    <Form layout="vertical" disabled={isSubmitting}>{fields.map(({ name, label, ...rest }) => <Form.Item key={name} label={label} required={'required' in rest}
      validateStatus={errors[name] ? 'error' : undefined} help={errors[name]?.message}>
      <Controller name={name} control={control} render={({ field }) => <Input {...field} value={field.value ?? ''} aria-label={label} />} />
    </Form.Item>)}</Form>
  </Modal>;
}
