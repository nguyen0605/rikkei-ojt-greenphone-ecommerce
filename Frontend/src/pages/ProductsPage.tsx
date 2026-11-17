import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Drawer, Button } from 'antd';
import { Filter } from 'lucide-react';
import { Breadcrumb, NewsletterCTA, ProductCardSkeleton } from '@/components/common';
import ProductFilters from '@/components/products/ProductFilters';
import ProductsToolbar, { ProductsPagination, ProductGrid } from '@/components/products/ProductsToolbar';
import { phoneService } from '@/services';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAllFilters, setBrandId, setBrands, setSearch, setSortBy } from '@/store/slices/filterSlice';

const PAGE_SIZE = 12;

const SORT_OPTIONS = ['newest', 'discount', 'price-asc', 'price-desc', 'name'] as const;

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.filter);
  const [page, setPage] = useState(1);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const lastNavKey = useRef('');

  // ── Đồng bộ URL → Redux (1 chiều): ?brandId= & ?q= & ?sort= ──
  // Khi người dùng điều hướng vào /san-pham không có query params (click menu "Sản phẩm"),
  // reset toàn bộ bộ lọc bằng clearAllFilters() để dọn sạch state tồn đọng trong Redux.
  // Không reset khi người dùng chỉ thao tác bộ lọc trên chính trang /san-pham (navKey không đổi).
  useEffect(() => {
    const navKey = `${location.key}:${searchParams.toString()}`;
    if (navKey === lastNavKey.current) return;
    lastNavKey.current = navKey;

    const brandParam = searchParams.get('brandId');
    const qParam = searchParams.get('q');
    const sortParam = searchParams.get('sort');

    const hasAnyFilterParam =
      (brandParam !== null && brandParam.trim() !== '') ||
      (qParam !== null && qParam.trim() !== '') ||
      (sortParam !== null && sortParam.trim() !== '');

    if (!hasAnyFilterParam) {
      dispatch(clearAllFilters());
    } else {
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
    }

    setPage(1);
  }, [location.key, searchParams, dispatch]);

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

  const activeFilterCount =
    filters.brandIds.length +
    filters.rams.length +
    filters.storages.length +
    filters.colors.length +
    filters.features.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 50_000_000 ? 1 : 0);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Sản phẩm' }]} className="mb-6" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Desktop Fixed Sidebar */}
          <div className="hidden lg:col-span-1 lg:block">
            <ProductFilters />
          </div>

          <div className="lg:col-span-3">
            {/* Mobile Filter Trigger Button */}
            <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
              <Button
                type="default"
                size="large"
                data-testid="mobile-filter-button"
                icon={<Filter className="h-4 w-4 text-green-600" />}
                onClick={() => setFilterDrawerOpen(true)}
                className="!h-11 !rounded-xl !border-gray-200 !font-semibold !text-gray-700 hover:!border-green-600 hover:!text-green-600 shadow-sm flex items-center gap-2"
              >
                <span>Bộ lọc</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1.5 text-xs font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch(clearAllFilters())}
                  className="flex h-11 items-center px-3 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors"
                >
                  Xóa lọc ({activeFilterCount})
                </button>
              )}
            </div>

            <ProductsToolbar total={total} current={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
            {isLoading ? (
              <div
                role="status"
                aria-label="Đang tải danh sách sản phẩm"
                className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <ProductGrid products={phones} />
            )}
            <ProductsPagination current={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <Drawer
        title="Bộ lọc sản phẩm"
        placement="right"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        styles={{
          body: { padding: '16px' },
          wrapper: { maxWidth: '85vw', width: 320 },
        }}
        footer={
          <div className="p-2">
            <Button
              type="primary"
              size="large"
              block
              onClick={() => setFilterDrawerOpen(false)}
              className="!h-11 !rounded-full !bg-green-600 hover:!bg-green-700 !font-semibold !text-white !text-base"
            >
              Áp dụng {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Button>
          </div>
        }
      >
        <ProductFilters />
      </Drawer>

      <NewsletterCTA />
    </>
  );
}