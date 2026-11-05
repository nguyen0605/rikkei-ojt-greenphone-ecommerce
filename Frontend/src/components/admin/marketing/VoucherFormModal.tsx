import { Modal, Form, Input, InputNumber, Select, DatePicker } from 'antd';
import { useEffect } from 'react';
import type { PromotionDTO, PromotionRequest } from '@/types/api';
import { formatNumber } from '@/utils';
import dayjs, { type Dayjs } from 'dayjs';

interface VoucherFormModalProps {
  open: boolean;
  editData: PromotionDTO | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (values: PromotionRequest) => void;
}

type DiscountType = 'PERCENT' | 'FIXED';

interface FormValues {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderValue?: number;
  quantity: number;
  dateRange: [Dayjs, Dayjs];
}

export default function VoucherFormModal({
  open,
  editData,
  loading,
  onCancel,
  onSubmit,
}: VoucherFormModalProps) {
  const [form] = Form.useForm<FormValues>();
  const discountType = Form.useWatch('discountType', form);

  useEffect(() => {
    if (open) {
      if (editData) {
        form.setFieldsValue({
          code: editData.code,
          name: editData.name,
          description: editData.description,
          discountType: editData.discountType as DiscountType,
          discountValue: editData.discountValue,
          maxDiscountAmount: editData.maxDiscountAmount,
          minOrderValue: editData.minOrderValue,
          quantity: editData.quantity,
          dateRange: [dayjs(editData.startDate), dayjs(editData.endDate)],
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          discountType: 'PERCENT',
          quantity: 100,
        });
      }
    }
  }, [open, editData, form]);

  const parseNumber = (s: string | undefined) => Number((s ?? '').replace(/[^\d]/g, ''));

  return (
    <Modal
      title={
        <span className="text-base font-bold text-ink">
          {editData ? 'Sửa mã khuyến mãi' : 'Thêm mã khuyến mãi (Voucher)'}
        </span>
      }
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okButtonProps={{ className: '!rounded-full !bg-primary-600 hover:!bg-primary-700' }}
      cancelButtonProps={{ className: '!rounded-full' }}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          const [start, end] = values.dateRange;
          const payload: PromotionRequest = {
            code: values.code.trim().toUpperCase(),
            name: values.name.trim(),
            description: values.description?.trim() || '',
            discountType: values.discountType,
            discountValue: values.discountValue,
            maxDiscountAmount: values.maxDiscountAmount || 0,
            minOrderValue: values.minOrderValue || 0,
            quantity: values.quantity,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          };
          onSubmit(payload);
        }}
      >
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-2">
          Thông tin cơ bản
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item
            name="code"
            label="Mã Voucher"
            rules={[
              { required: true, message: 'Nhập mã voucher' },
              { pattern: /^[A-Za-z0-9_-]+$/, message: 'Mã chỉ chứa chữ, số, gạch ngang' },
            ]}
          >
            <Input placeholder="VD: GPNEW2026" className="uppercase font-mono" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Tên chiến dịch"
            rules={[{ required: true, message: 'Nhập tên chương trình' }]}
          >
            <Input placeholder="VD: Giảm 500k cho đơn từ 10tr" />
          </Form.Item>

          <Form.Item
            name="discountType"
            label="Loại chiết khấu"
            rules={[{ required: true, message: 'Chọn loại chiết khấu' }]}
          >
            <Select
              options={[
                { value: 'PERCENT', label: 'Phần trăm (%)' },
                { value: 'FIXED', label: 'Số tiền cố định (VND)' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="discountValue"
            label={discountType === 'PERCENT' ? 'Mức giảm (1% - 100%)' : 'Số tiền giảm (VND)'}
            rules={[
              { required: true, message: 'Nhập giá trị chiết khấu' },
              () => ({
                validator(_, value) {
                  if (discountType === 'PERCENT') {
                    if (value < 1 || value > 100) {
                      return Promise.reject(new Error('Mức giảm theo % phải từ 1% đến 100%'));
                    }
                  } else if (value <= 0) {
                    return Promise.reject(new Error('Số tiền giảm phải lớn hơn 0'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            {discountType === 'PERCENT' ? (
              <InputNumber
                className="w-full"
                min={1}
                max={100}
                placeholder="VD: 10"
                formatter={(v) => `${String(v ?? '').replace(/[^\d]/g, '')}%`}
                parser={parseNumber}
              />
            ) : (
              <InputNumber
                className="w-full"
                min={1000}
                placeholder="VD: 500,000"
                formatter={(v) => formatNumber(Number(v ?? 0))}
                parser={parseNumber}
              />
            )}
          </Form.Item>

          {discountType === 'PERCENT' && (
            <Form.Item
              name="maxDiscountAmount"
              label="Mức giảm tối đa (VND)"
              className="col-span-2"
            >
              <InputNumber
                className="w-full"
                min={0}
                placeholder="VD: 500,000 (Để 0 nếu không giới hạn)"
                formatter={(v) => formatNumber(Number(v ?? 0))}
                parser={parseNumber}
              />
            </Form.Item>
          )}
        </div>

        <div className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
          Điều kiện áp dụng & Thời hạn
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item
            name="minOrderValue"
            label="Giá trị đơn tối thiểu (VND)"
          >
            <InputNumber
              className="w-full"
              min={0}
              placeholder="VD: 10,000,000"
              formatter={(v) => formatNumber(Number(v ?? 0))}
              parser={parseNumber}
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Tổng lượt phát hành"
            rules={[
              { required: true, message: 'Nhập số lượng phát hành' },
              {
                type: 'number',
                min: 1,
                message: 'Số lượng phát hành không được âm hoặc bằng 0',
              },
            ]}
          >
            <InputNumber className="w-full" min={1} placeholder="VD: 500" />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Thời hạn hiệu lực chiến dịch (Bắt đầu - Kết thúc)"
            className="col-span-2"
            rules={[{ required: true, message: 'Chọn khoảng thời gian hiệu lực' }]}
          >
            <DatePicker.RangePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              className="w-full"
              placeholder={['Ngày bắt đầu', 'Ngày hết hạn']}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
