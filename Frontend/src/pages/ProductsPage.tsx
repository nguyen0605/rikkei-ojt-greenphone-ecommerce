import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Breadcrumb, NewsletterCTA } from '@/components/common';
import ProductFilters from '@/components/products/ProductFilters';
import ProductsToolbar, { ProductsPagination, ProductGrid } from '@/components/products/ProductsToolbar';
import { phoneService } from '@/services';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setBrandId, setBrands, setSearch, setSortBy } from '@/store/slices/filterSlice';

const PAGE_SIZE = 12;

const SORT_OPTIONS = ['newest', 'discount', 'price-asc', 'price-desc', 'name'] as const;

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.filter);
  const [page, setPage] = useState(1);
  const [searchParams] = useSearchParams();
  const lastUrlKey = useRef('');

  // ── Đồng bộ URL → Redux (1 chiều): ?brandId= & ?q= & ?sort= ──
  // Chỉ dispatch khi URL thay đổi (tránh re-render loop),
  // đồng thời reset page về 1 mỗi khi URL query khác đi.
  const urlKey = `${searchParams.get('brandId') ?? ''}|${searchParams.get('q') ?? ''}|${searchParams.get('sort') ?? ''}`;
  useEffect(() => {
    if (urlKey === lastUrlKey.current) return;
    lastUrlKey.current = urlKey;

    const brandParam = searchParams.get('brandId');
    const qParam = searchParams.get('q');
    const sortParam = searchParams.get('sort');

    if (brandParam !== null && Number.isInteger(Number(brandParam))) {
      dispatch(setBrandId(Number(brandParam)));
    } else {
      dispatch(setBrands([]));
    }

    if (qParam !== null && qParam.trim() !== '') {
      dispatch(setSearch(qParam.trim()));
    } else {
      dispatch(setSearch(''));
    }

    if (sortParam !== null && (SORT_OPTIONS as readonly string[]).includes(sortParam)) {
      dispatch(setSortBy(sortParam as (typeof SORT_OPTIONS)[number]));
    }

    setPage(1);
  }, [urlKey, searchParams, dispatch]);

  const hasQuery = filters.search.trim().length > 0;

  const params: Record<string, string> = { page: String(page - 1), size: String(PAGE_SIZE) };
  if (hasQuery) params.q = filters.search.trim();
  if (filters.brandIds.length > 0) params.brandIds = filters.brandIds.join(',');
  if (filters.rams.length > 0) params.rams = filters.rams.join(',');
  if (filters.storages.length > 0) params.storages = filters.storages.join(',');
  if (filters.colors.length > 0) params.colors = filters.colors.join(',');
  if (filters.features.length > 0) params.features = filters.features.join(',');
  if (filters.priceRange[0] > 0) params.minPrice = String(filters.priceRange[0]);
  if (filters.priceRange[1] < 50_000_000) params.maxPrice = String(filters.priceRange[1]);
  if (filters.sortBy !== 'newest') params.sort = filters.sortBy;

  // Khi có từ khóa tìm kiếm → dùng /phones/search (hỗ trợ q),
  // ngược lại → /phones (hỗ trợ sort).
  const { data, isLoading } = useQuery({
    queryKey: ['products', hasQuery ? 'search' : 'list', params],
    queryFn: () => (hasQuery ? phoneService.search(params) : phoneService.list(params)),
  });
  const phones = data?.content || [];
  const total = data?.totalElements || 0;

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Sản phẩm' }]} className="mb-6" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1"><ProductFilters /></div>
          <div className="lg:col-span-3">
            <ProductsToolbar total={total} current={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
            {isLoading ? <p className="text-center text-gray-500 py-8">Đang tải...</p> : <ProductGrid products={phones} />}
            <ProductsPagination current={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
          </div>
        </div>
      </div>
      <NewsletterCTA />
    </>
  );
}