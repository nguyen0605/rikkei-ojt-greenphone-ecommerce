import { useRef } from 'react';
import { Alert, Form, Input, Modal } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import type { ApiResponse } from '@/types/api';
import type { Warehouse, WarehouseRequest } from '@/services/warehouseService';
import { warehouseSchema } from './warehouseSchema';

interface Props {
  warehouse: Warehouse | null;
  onCancel: () => void;
  onSubmit: (values: WarehouseRequest) => Promise<unknown>;
}

export default function WarehouseModal({ warehouse, onCancel, onSubmit }: Props) {
  const submitting = useRef(false);
  const { control, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<WarehouseRequest>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: warehouse
      ? { code: warehouse.code, name: warehouse.name, address: warehouse.address }
      : { code: '', name: '', address: '' },
  });

  const submit = async (values: WarehouseRequest) => {
    if (submitting.current) return;
    submitting.current = true;
    clearErrors();
    try {
      await onSubmit(values);
    } catch (error: unknown) {
      if (isAxiosError<ApiResponse<Record<string, string>>>(error)) {
        const response = error.response?.data;
        if (response?.errorCode === 'WAREHOUSE_CODE_DUPLICATE') {
          setError('code', { message: 'Mã kho đã tồn tại, vui lòng chọn mã khác' }, { shouldFocus: true });
          return;
        }
        if (error.response?.status === 400 && response?.data && typeof response.data === 'object') {
          let mapped = false;
          for (const field of ['code', 'name', 'address'] as const) {
            const text = response.data[field];
            if (typeof text === 'string') {
              setError(field, { message: text });
              mapped = true;
            }
          }
          if (mapped) return;
        }
      }
      setError('root', { message: error instanceof Error ? error.message : 'Không thể lưu chi nhánh. Vui lòng thử lại.' });
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Modal open title={warehouse ? 'Chỉnh sửa chi nhánh' : 'Thêm Chi Nhánh Mới'}
      okText="Lưu" cancelText="Hủy" onOk={() => void handleSubmit(submit)()}
      onCancel={() => { if (!submitting.current) onCancel(); }}
      confirmLoading={isSubmitting} okButtonProps={{ disabled: isSubmitting, 'aria-label': 'Lưu' }}
      cancelButtonProps={{ disabled: isSubmitting }} closable={!isSubmitting}
      keyboard={!isSubmitting} mask={{ closable: false }}>
      <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate>
        {errors.root?.message && <Alert type="error" showIcon title={errors.root.message} className="mb-4" />}
        <Form.Item label="Mã kho" htmlFor="warehouse-code" layout="vertical" required
          validateStatus={errors.code ? 'error' : undefined} help={errors.code?.message}>
          <Controller name="code" control={control} render={({ field }) => (
            <Input {...field} id="warehouse-code" placeholder="WH-DN-Q1" maxLength={50}
              disabled={isSubmitting} aria-invalid={!!errors.code} />
          )} />
        </Form.Item>
        <Form.Item label="Tên kho" htmlFor="warehouse-name" layout="vertical" required
          validateStatus={errors.name ? 'error' : undefined} help={errors.name?.message}>
          <Controller name="name" control={control} render={({ field }) => (
            <Input {...field} id="warehouse-name" placeholder="Kho Chi Nhánh Đà Nẵng" maxLength={150}
              disabled={isSubmitting} aria-invalid={!!errors.name} />
          )} />
        </Form.Item>
        <Form.Item label="Địa chỉ" htmlFor="warehouse-address" layout="vertical" required
          validateStatus={errors.address ? 'error' : undefined} help={errors.address?.message}>
          <Controller name="address" control={control} render={({ field }) => (
            <Input.TextArea {...field} id="warehouse-address" rows={3} maxLength={255}
              placeholder="Hải Châu, Đà Nẵng" disabled={isSubmitting} aria-invalid={!!errors.address} />
          )} />
        </Form.Item>
      </form>
    </Modal>
  );
}
