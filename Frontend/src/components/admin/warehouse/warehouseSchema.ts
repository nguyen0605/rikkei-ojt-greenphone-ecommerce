import { z } from 'zod';

export const warehouseSchema = z.object({
  code: z.string().min(1, 'Vui lòng nhập mã kho').max(50, 'Mã kho tối đa 50 ký tự')
    .regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, 'Mã kho chỉ gồm chữ hoa không dấu, số và dấu gạch nối'),
  name: z.string().trim().min(3, 'Tên kho phải có ít nhất 3 ký tự').max(150, 'Tên kho tối đa 150 ký tự'),
  address: z.string().trim().min(1, 'Vui lòng nhập địa chỉ').max(255, 'Địa chỉ tối đa 255 ký tự'),
});
