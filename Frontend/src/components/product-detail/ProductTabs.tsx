import { Tabs } from 'antd';
import {
  Cpu,
  Camera,
  Usb,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import type { Product, ProductFeature } from '@/types';

interface ProductTabsProps {
  product: Product;
}

const iconMap: Record<string, LucideIcon> = {
  Shield,
  Cpu,
  Camera,
  Usb,
};

export default function ProductTabs({ product }: ProductTabsProps) {
  const items = [
    {
      key: 'description',
      label: 'Thông tin sản phẩm',
      children: (
        <div className="space-y-6 py-4">
          <p className="leading-relaxed text-gray-700">{product.description}</p>

          {product.features.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {product.features.map((feat: ProductFeature) => {
                const Icon = iconMap[feat.icon] || Shield;
                return (
                  <div
                    key={feat.title}
                    className="rounded-xl border border-green-100 bg-green-50/40 p-4 text-center"
                  >
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                      <Icon className="h-6 w-6 text-green-600" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      {feat.title}
                    </h4>
                    <p className="mt-1 text-xs text-gray-500">
                      {feat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'specs',
      label: 'Thông số kỹ thuật',
      children: (
        <div className="space-y-6 py-4">
          {product.specifications.length > 0 ? (
            product.specifications.map((spec) => (
              <div key={spec.group}>
                <h4 className="mb-3 text-base font-bold text-gray-900">
                  {spec.group}
                </h4>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <tbody>
                      {spec.items.map((item, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="w-1/3 bg-gray-50 p-3 font-medium text-gray-700">
                            {item.label}
                          </td>
                          <td className="p-3 text-gray-900">{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">
              Thông số kỹ thuật đang được cập nhật.
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'reviews',
      label: `Đánh giá (${product.reviewCount})`,
      children: (
        <div className="py-4">
          <p className="text-gray-500">Chưa có đánh giá nào.</p>
        </div>
      ),
    },
    {
      key: 'qa',
      label: 'Hỏi đáp',
      children: (
        <div className="py-4">
          <p className="text-gray-500">Chưa có câu hỏi nào.</p>
        </div>
      ),
    },
    {
      key: 'warranty',
      label: 'Chính sách bảo hành',
      children: (
        <div className="space-y-3 py-4 text-sm text-gray-700">
          <p>• Bảo hành chính hãng 12 tháng</p>
          <p>• Đổi trả trong 7 ngày nếu có lỗi nhà sản xuất</p>
          <p>• Hỗ trợ kỹ thuật trọn đời</p>
        </div>
      ),
    },
  ];

  return <Tabs items={items} defaultActiveKey="description" />;
}
