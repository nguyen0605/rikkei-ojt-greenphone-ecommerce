import { z } from 'zod';
export const purchaseOrderSchema = z.object({
  supplierId: z.number({ error: 'Chọn nhà cung cấp' }).int().positive('Chọn nhà cung cấp'),
  warehouseId: z.number({ error: 'Chọn kho nhận' }).int().positive('Chọn kho nhận'),
  status: z.enum(['DRAFT', 'ORDERED']), note: z.string().max(2000, 'Tối đa 2000 ký tự').optional(),
  items: z.array(z.object({
    variantId: z.number().int().positive('Chọn biến thể'),
    quantity: z.number().int('Số lượng phải là số nguyên').positive('Số lượng phải lớn hơn 0').max(2147483647),
    unitCost: z.number().int('Đơn giá VND phải là số nguyên').positive('Đơn giá phải lớn hơn 0').max(9999999999999),
  })).min(1, 'Thêm ít nhất một dòng hàng').max(100).superRefine((items, context) => {
    const seen = new Set<number>();
    items.forEach((item, index) => {
      if (item.variantId > 0 && seen.has(item.variantId)) context.addIssue({ code: 'custom', path: [index, 'variantId'], message: 'Biến thể đã có trong đơn' });
      seen.add(item.variantId);
    });
  }),
});
