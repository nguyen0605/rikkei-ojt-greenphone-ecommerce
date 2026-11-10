import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrderProductLookup, generateProductSlug } from '../useOrderProductLookup';
import { phoneService } from '@/services';
import type { PhoneDTO, OrderDetailDTO } from '@/types/api';

vi.mock('@/services', () => ({
  phoneService: {
    list: vi.fn(),
  },
}));

const mockCatalog: PhoneDTO[] = [
  {
    id: 1,
    brandId: 1,
    brandName: 'Apple',
    name: 'iPhone 15 Pro Max',
    description: '',
    screen: '',
    os: '',
    chip: '',
    rearCamera: '',
    frontCamera: '',
    battery: '',
    warranty: '',
    status: 'ACTIVE',
    mainImageUrl: 'https://img.example.com/15promax.png',
    variantCount: 2,
    avgRating: 5,
    lowestPrice: 30000000,
  },
  {
    id: 2,
    brandId: 1,
    brandName: 'Apple',
    name: 'iPhone 15',
    description: '',
    screen: '',
    os: '',
    chip: '',
    rearCamera: '',
    frontCamera: '',
    battery: '',
    warranty: '',
    status: 'ACTIVE',
    mainImageUrl: 'https://img.example.com/15.png',
    variantCount: 1,
    avgRating: 4,
    lowestPrice: 20000000,
  },
  {
    id: 3,
    brandId: 2,
    brandName: 'Samsung',
    name: 'Samsung Galaxy Inactive Model',
    description: '',
    screen: '',
    os: '',
    chip: '',
    rearCamera: '',
    frontCamera: '',
    battery: '',
    warranty: '',
    status: 'INACTIVE',
    mainImageUrl: 'https://img.example.com/samsung-inactive.png',
    variantCount: 1,
    avgRating: 3,
    lowestPrice: 10000000,
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useOrderProductLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(phoneService.list).mockResolvedValue({
      content: mockCatalog,
      page: 0,
      size: 50,
      totalElements: mockCatalog.length,
      totalPages: 1,
      last: true,
    });
  });

  it('generates clean SEO URL slugs', () => {
    expect(generateProductSlug('iPhone 15 Pro Max')).toBe('iphone-15-pro-max');
    expect(generateProductSlug('Điện thoại Xiaomi Redmi Note 13!')).toBe('dien-thoai-xiaomi-redmi-note-13');
  });

  it('resolves product info by direct phoneId', async () => {
    const { result } = renderHook(() => useOrderProductLookup(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.phones.length).toBe(3);
    });

    const item: OrderDetailDTO = {
      id: 10,
      phoneVariantId: 101,
      productName: 'Custom Phone Name',
      ram: '8GB',
      storage: '256GB',
      color: 'Titan',
      unitPrice: 30000000,
      quantity: 1,
      subtotal: 30000000,
    };
    // @ts-expect-error test direct phoneId
    item.phoneId = 1;

    const resolved = result.current.resolveItem(item);
    expect(resolved.phoneId).toBe(1);
    expect(resolved.imageUrl).toBe('https://img.example.com/15promax.png');
    expect(resolved.isInactive).toBe(false);
    expect(resolved.navUrl).toContain('/san-pham/1?variantId=101');
  });

  it('resolves product info by productName prefix matching longer names first', async () => {
    const { result } = renderHook(() => useOrderProductLookup(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.phones.length).toBe(3);
    });

    const item: OrderDetailDTO = {
      id: 11,
      phoneVariantId: 102,
      productName: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
      ram: '8GB',
      storage: '256GB',
      color: 'Titan',
      unitPrice: 30000000,
      quantity: 1,
      subtotal: 30000000,
    };

    const resolved = result.current.resolveItem(item);
    expect(resolved.phoneId).toBe(1); // iPhone 15 Pro Max, not iPhone 15
    expect(resolved.imageUrl).toBe('https://img.example.com/15promax.png');
    expect(resolved.isInactive).toBe(false);
    expect(resolved.navUrl).toContain('/san-pham/1?variantId=102');
  });

  it('marks product as inactive and suppresses navUrl when status is INACTIVE', async () => {
    const { result } = renderHook(() => useOrderProductLookup(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.phones.length).toBe(3);
    });

    const item: OrderDetailDTO = {
      id: 12,
      phoneVariantId: 103,
      productName: 'Samsung Galaxy Inactive Model',
      ram: '4GB',
      storage: '64GB',
      color: 'Black',
      unitPrice: 10000000,
      quantity: 1,
      subtotal: 10000000,
    };

    const resolved = result.current.resolveItem(item);
    expect(resolved.phoneId).toBe(3);
    expect(resolved.isInactive).toBe(true);
    expect(resolved.navUrl).toBeUndefined(); // Không tạo link chết!
  });

  it('handles unknown product gracefully without runtime error', async () => {
    const { result } = renderHook(() => useOrderProductLookup(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.phones.length).toBe(3);
    });

    const item: OrderDetailDTO = {
      id: 13,
      phoneVariantId: 104,
      productName: 'NonExistent Brand X 99',
      ram: '2GB',
      storage: '16GB',
      color: 'Grey',
      unitPrice: 1000000,
      quantity: 1,
      subtotal: 1000000,
    };

    const resolved = result.current.resolveItem(item);
    expect(resolved.phoneId).toBeUndefined();
    expect(resolved.navUrl).toBeUndefined();
    expect(resolved.imageUrl).toBeUndefined();
  });
});

