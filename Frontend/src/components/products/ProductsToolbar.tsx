import { Pagination, Select } from 'antd';
import { ProductCard } from '@/components/common';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSortBy } from '@/store/slices/filterSlice';

interface ProductsToolbarProps {
  total: number;
  current: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function ProductsToolbar({
  total,
  current,
  pageSize,
  onPageChange,
}: ProductsToolbarProps) {
  const dispatch = useAppDispatch();
  const sortBy = useAppSelector((s) => s.filter.sortBy);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  return (
    <div className="mb-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3 sm:flex-row sm:items-center">
      <p className="text-sm text-gray-600">
        Hiển thị <span className="font-semibold text-gray-900">{start}</span>–
        <span className="font-semibold text-gray-900">{end}</span> của{' '}
        <span className="font-semibold text-gray-900">{total}</span> sản phẩm
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Sắp xếp:</span>
        <Select
          value={sortBy}
          onChange={(value) => dispatch(setSortBy(value))}
          style={{ width: 160 }}
          options={[
            { value: 'newest', label: 'Mới nhất' },
            { value: 'discount', label: 'Giảm giá' },
            { value: 'price-asc', label: 'Giá tăng dần' },
            { value: 'price-desc', label: 'Giá giảm dần' },
            { value: 'name', label: 'Tên A-Z' },
          ]}
        />
      </div>
    </div>
  );
}

interface ProductsPaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function ProductsPagination({
  current,
  total,
  pageSize,
  onChange,
}: ProductsPaginationProps) {
  return (
    <div className="mt-8 flex justify-center">
      <Pagination
        current={current}
        total={total}
        pageSize={pageSize}
        onChange={onChange}
        showSizeChanger={false}
      />
    </div>
  );
}

interface ProductGridProps {
  products: any[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white py-16 text-center">
        <p className="text-lg font-semibold text-gray-700">
          Không tìm thấy sản phẩm
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Thử điều chỉnh bộ lọc để xem thêm kết quả
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
