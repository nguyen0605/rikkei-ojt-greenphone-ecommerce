import { Link } from 'react-router-dom';
import { Dropdown, Spin, type MenuProps } from 'antd';
import { ChevronDown, Smartphone } from 'lucide-react';
import { useBrands } from '@/hooks/useProducts';
import { useAppSelector } from '@/store/hooks';
import { ROUTES } from '@/routes/routePaths';

interface BrandDropdownProps {
  className?: string;
}

export default function BrandDropdown({ className }: BrandDropdownProps) {
  const { data: brands, isLoading: brandsLoading } = useBrands();
  const selectedBrandId = useAppSelector((s) => s.filter.brandIds[0]);

  const selectedBrand = brands?.find((b) => b.id === selectedBrandId);

  const items: MenuProps['items'] = [
    { key: 'all', label: <Link to={ROUTES.PRODUCTS}>Tất cả hãng</Link> },
    { type: 'divider' },
    ...(brands ?? []).map((brand) => ({
      key: String(brand.id),
      label: (
        <Link to={`${ROUTES.PRODUCTS}?brandId=${brand.id}`} className="flex items-center gap-2">
          {brand.logoUrl && (
            <img
              src={brand.logoUrl}
              alt=""
              className="h-5 w-5 shrink-0 object-contain"
            />
          )}
          <span>{brand.name}</span>
        </Link>
      ),
    })),
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight" arrow>
      <button
        type="button"
        className={`flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-green-300 hover:text-green-600 ${className ?? ''}`}
      >
        {brandsLoading ? (
          <Spin size="small" />
        ) : (
          <>
            <Smartphone className="h-4 w-4 text-green-600" />
            <span className="max-w-32 truncate">{selectedBrand?.name ?? 'Hãng'}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </>
        )}
      </button>
    </Dropdown>
  );
}