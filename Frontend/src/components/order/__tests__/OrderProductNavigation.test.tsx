import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import cartReducer from '@/store/slices/cartSlice';
import authReducer from '@/store/slices/authSlice';
import uiReducer from '@/store/slices/uiSlice';
import wishlistReducer from '@/store/slices/wishlistSlice';
import filterReducer from '@/store/slices/filterSlice';
import checkoutReducer from '@/store/slices/checkoutSlice';

import OrderCard from '../OrderCard';
import OrderDetailPage from '@/pages/account/OrderDetailPage';
import AdminOrderDetailDrawer from '@/components/admin/AdminOrderDetailDrawer';
import ProductDetailPage from '@/pages/ProductDetailPage';
import { phoneService, adminOrderService, orderService } from '@/services';
import type { OrderDTO, PhoneDTO, PhoneDetailDTO } from '@/types/api';

// Mocks
vi.mock('@/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services')>();
  return {
    ...actual,
    phoneService: {
      ...actual.phoneService,
      list: vi.fn(),
      detail: vi.fn(),
      search: vi.fn(),
    },
    adminOrderService: {
      ...actual.adminOrderService,
      detail: vi.fn(),
    },
    paymentService: {
      ...actual.paymentService,
      qrCode: vi.fn(),
    },
  };
});

vi.mock('@/services/orderService', () => ({
  orderService: {
    detail: vi.fn(),
    cancel: vi.fn(),
    list: vi.fn(),
  },
}));

const mockPhonesCatalog: PhoneDTO[] = [
  {
    id: 1,
    brandId: 1,
    brandName: 'Apple',
    name: 'iPhone 15 Pro Max',
    description: 'Flagship phone',
    screen: '6.7 inch OLED',
    os: 'iOS 17',
    chip: 'A17 Pro',
    rearCamera: '48MP',
    frontCamera: '12MP',
    battery: '4441mAh',
    warranty: '12 tháng',
    status: 'ACTIVE',
    mainImageUrl: 'https://example.com/images/iphone-15-pro-max.jpg',
    variantCount: 2,
    avgRating: 4.8,
    lowestPrice: 33990000,
  },
  {
    id: 2,
    brandId: 1,
    brandName: 'Apple',
    name: 'iPhone 15',
    description: 'Base iPhone',
    screen: '6.1 inch OLED',
    os: 'iOS 17',
    chip: 'A16',
    rearCamera: '48MP',
    frontCamera: '12MP',
    battery: '3349mAh',
    warranty: '12 tháng',
    status: 'ACTIVE',
    mainImageUrl: 'https://example.com/images/iphone-15.jpg',
    variantCount: 1,
    avgRating: 4.5,
    lowestPrice: 20000000,
  },
  {
    id: 99,
    brandId: 2,
    brandName: 'Samsung',
    name: 'Samsung Galaxy Legacy Phone',
    description: 'Old model',
    screen: '5.5 inch',
    os: 'Android 10',
    chip: 'Exynos 990',
    rearCamera: '12MP',
    frontCamera: '8MP',
    battery: '3000mAh',
    warranty: '12 tháng',
    status: 'INACTIVE', // Ngừng kinh doanh
    mainImageUrl: 'https://example.com/images/legacy-samsung.jpg',
    variantCount: 1,
    avgRating: 3.5,
    lowestPrice: 5000000,
  },
];

const mockPhoneDetail: PhoneDetailDTO = {
  ...mockPhonesCatalog[0],
  images: [
    { id: 1, phoneId: 1, imageUrl: 'https://example.com/images/iphone-15-pro-max-natural.jpg', isMain: true },
    { id: 2, phoneId: 1, imageUrl: 'https://example.com/images/iphone-15-pro-max-blue.jpg', isMain: false },
  ],
  variants: [
    {
      id: 10,
      phoneId: 1,
      ramItemId: 1,
      storageItemId: 2,
      colorItemId: 3,
      ram: '8GB',
      storage: '256GB',
      color: 'Titan Tự Nhiên',
      price: 34990000,
      discountPrice: 33990000,
      stockQuantity: 15,
      sku: 'IP15PM-256-NAT',
      status: 'ACTIVE',
    },
    {
      id: 11,
      phoneId: 1,
      ramItemId: 1,
      storageItemId: 3,
      colorItemId: 4,
      ram: '8GB',
      storage: '512GB',
      color: 'Titan Xanh',
      price: 39990000,
      discountPrice: 38490000,
      stockQuantity: 10,
      sku: 'IP15PM-512-BLU',
      status: 'ACTIVE',
    },
    {
      id: 12,
      phoneId: 1,
      ramItemId: 1,
      storageItemId: 4,
      colorItemId: 5,
      ram: '8GB',
      storage: '1TB',
      color: 'Titan Đen',
      price: 45990000,
      discountPrice: null,
      stockQuantity: 0,
      sku: 'IP15PM-1TB-BLK',
      status: 'INACTIVE', // Variant ngừng kinh doanh
    },
  ],
  reviewCount: 10,
};

function createTestStore() {
  return configureStore({
    reducer: {
      cart: cartReducer,
      auth: authReducer,
      ui: uiReducer,
      wishlist: wishlistReducer,
      filter: filterReducer,
      checkout: checkoutReducer,
    },
  });
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="test-location">{location.pathname + location.search}</div>;
}

function renderComponent(ui: React.ReactElement, { initialEntries = ['/'] } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  const store = createTestStore();

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          {ui}
          <LocationDisplay />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('ORD-20: Order Product Quick Navigation to PDP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(phoneService.list).mockResolvedValue({
      content: mockPhonesCatalog,
      page: 0,
      size: 50,
      totalElements: mockPhonesCatalog.length,
      totalPages: 1,
      last: true,
    });
    vi.mocked(phoneService.detail).mockResolvedValue(mockPhoneDetail);
  });

  const activeOrder: OrderDTO = {
    id: 101,
    userId: 2,
    userName: 'Nguyễn Văn An',
    receiverName: 'Nguyễn Văn An',
    receiverPhone: '0912345678',
    shippingAddress: '123 Đường Láng, Hà Nội',
    totalAmount: 33990000,
    discountAmount: 0,
    finalAmount: 33990000,
    orderStatus: 'CONFIRMED',
    paymentStatus: 'PAID',
    paymentMethod: 'VIETQR',
    note: '',
    promotionCode: '',
    createdAt: '2026-08-05T02:20:16',
    orderDetails: [
      {
        id: 1,
        phoneVariantId: 10,
        productName: 'iPhone 15 Pro Max',
        ram: '8GB',
        storage: '256GB',
        color: 'Titan Tự Nhiên',
        unitPrice: 33990000,
        quantity: 1,
        subtotal: 33990000,
      },
    ],
  };

  const cancelledOrder: OrderDTO = {
    ...activeOrder,
    id: 102,
    orderStatus: 'CANCELLED',
  };

  const inactiveProductOrder: OrderDTO = {
    ...activeOrder,
    id: 103,
    orderDetails: [
      {
        id: 2,
        phoneVariantId: 999,
        productName: 'Samsung Galaxy Legacy Phone',
        ram: '4GB',
        storage: '64GB',
        color: 'Đen',
        unitPrice: 5000000,
        quantity: 1,
        subtotal: 5000000,
      },
    ],
  };

  it('1 & 3: Order Item hiển thị đúng ảnh thực tế từ catalog khi backend OrderDetailDTO không chứa ảnh', async () => {
    renderComponent(<OrderCard order={activeOrder} />);

    await waitFor(() => {
      const img = screen.getByTestId('order-item-thumbnail-img') as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toBe('https://example.com/images/iphone-15-pro-max.jpg');
    });
  });

  it('2: Ưu tiên ảnh của biến thể nếu tồn tại trực tiếp trên order detail', async () => {
    const orderWithCustomVariantImg: OrderDTO = {
      ...activeOrder,
      orderDetails: [
        {
          ...activeOrder.orderDetails[0],
          // @ts-expect-error test custom image
          imageUrl: 'https://example.com/images/variant-custom.png',
        },
      ],
    };

    renderComponent(<OrderCard order={orderWithCustomVariantImg} />);

    const img = screen.getByTestId('order-item-thumbnail-img') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe('https://example.com/images/variant-custom.png');
  });

  it('4: Hiển thị placeholder phù hợp khi ảnh bị lỗi (onError) hoặc không có URL', async () => {
    renderComponent(<OrderCard order={activeOrder} />);

    await waitFor(() => {
      expect(screen.getByTestId('order-item-thumbnail-img')).toBeInTheDocument();
    });

    const img = screen.getByTestId('order-item-thumbnail-img');
    fireEvent.error(img);

    await waitFor(() => {
      expect(screen.getByTestId('order-item-thumbnail-placeholder')).toBeInTheDocument();
    });
  });

  it('5, 6 & 7: Click tên sản phẩm và thumbnail điều hướng đúng PDP với đúng slug và variantId', async () => {
    const user = userEvent.setup();
    renderComponent(<OrderCard order={activeOrder} />);

    await waitFor(() => {
      expect(screen.getByTestId('order-item-name-link')).toBeInTheDocument();
    });

    const nameLink = screen.getByTestId('order-item-name-link');
    const imageLink = screen.getByTestId('order-item-image-link');

    expect(nameLink.getAttribute('href')).toContain('/san-pham/1?variantId=10');
    expect(nameLink.getAttribute('href')).toContain('slug=iphone-15-pro-max');
    expect(imageLink.getAttribute('href')).toContain('/san-pham/1?variantId=10');

    // Click name link
    await user.click(nameLink);
    expect(screen.getByTestId('test-location')).toHaveTextContent('/san-pham/1?variantId=10');
  });

  it('8: PDP tự động chọn đúng dung lượng và màu sắc từ query param variantId', async () => {
    renderComponent(
      <Routes>
        <Route path="/san-pham/:id" element={<ProductDetailPage />} />
      </Routes>,
      { initialEntries: ['/san-pham/1?variantId=10'] }
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'iPhone 15 Pro Max' })).toBeInTheDocument();
    });

    // Variant 10: 8GB/256GB - Titan Tự Nhiên
    const radioVariant10 = screen.getByTestId('variant-radio-10');
    expect(radioVariant10.parentElement).toHaveClass('ant-radio-button-checked');
    expect(screen.getByText(/256GB — Titan Tự Nhiên/)).toBeInTheDocument();
  });

  it('9: Sản phẩm inactive không tạo link chết và hiển thị thông báo ngừng kinh doanh', async () => {
    renderComponent(<OrderCard order={inactiveProductOrder} />);

    await waitFor(() => {
      expect(screen.getByTestId('product-inactive-badge')).toBeInTheDocument();
      expect(screen.getByText('Sản phẩm hiện đã ngừng kinh doanh')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('order-item-name-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('order-item-image-link')).not.toBeInTheDocument();
  });

  it('10: Biến thể inactive không bị thay thế âm thầm và hiển thị cảnh báo phù hợp trên PDP', async () => {
    renderComponent(
      <Routes>
        <Route path="/san-pham/:id" element={<ProductDetailPage />} />
      </Routes>,
      { initialEntries: ['/san-pham/1?variantId=12'] }
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'iPhone 15 Pro Max' })).toBeInTheDocument();
    });

    // Biến thể 12 là INACTIVE: phải giữ nguyên biến thể này được chọn, không đổi sang biến thể khác
    await waitFor(() => {
      expect(screen.getByTestId('variant-inactive-alert')).toBeInTheDocument();
      expect(screen.getByText(/Phiên bản.*hiện đã ngừng kinh doanh/)).toBeInTheDocument();
    });

    // Nút thêm vào giỏ phải bị vô hiệu hóa
    const btn = screen.getByRole('button', { name: /ngừng kinh doanh/i });
    expect(btn).toBeDisabled();
  });

  it('11: Đơn hàng đã hủy (CANCELLED) vẫn hiển thị dữ liệu lịch sử và cho phép điều hướng nếu sản phẩm còn kinh doanh', async () => {
    renderComponent(<OrderCard order={cancelledOrder} />);

    await waitFor(() => {
      expect(screen.getByTestId('order-item-name-link')).toBeInTheDocument();
      expect(screen.getByTestId('order-item-image-link')).toBeInTheDocument();
    });

    expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    expect(screen.getByText('8GB • 256GB • Titan Tự Nhiên')).toBeInTheDocument();
  });

  it('12: Admin Drawer hiển thị thumbnail và cho phép điều hướng tương đương Client', async () => {
    vi.mocked(adminOrderService.detail).mockResolvedValue(activeOrder);

    renderComponent(
      <AdminOrderDetailDrawer
        open={true}
        orderId={101}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Chi tiết đơn hàng #101')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('admin-order-item-name-link')).toBeInTheDocument();
      expect(screen.getByTestId('order-item-image-link')).toBeInTheDocument();
    });

    const link = screen.getByTestId('admin-order-item-name-link');
    expect(link.getAttribute('href')).toContain('/san-pham/1?variantId=10');
  });

  it('15: OrderDetailPage cũng hiển thị thumbnail và cho phép điều hướng đến PDP', async () => {
    vi.mocked(orderService.detail).mockResolvedValue(activeOrder);

    renderComponent(
      <Routes>
        <Route path="/tai-khoan/don-hang/:id" element={<OrderDetailPage />} />
      </Routes>,
      { initialEntries: ['/tai-khoan/don-hang/101'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Chi tiết đơn hàng #101')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('order-item-name-link')).toBeInTheDocument();
      expect(screen.getByTestId('order-item-image-link')).toBeInTheDocument();
    });

    const link = screen.getByTestId('order-item-name-link');
    expect(link.getAttribute('href')).toContain('/san-pham/1?variantId=10');
  });

  it('13 & 14: Điều hướng không reload toàn bộ trang (sử dụng React Router)', async () => {
    const user = userEvent.setup();
    renderComponent(<OrderCard order={activeOrder} />);

    await waitFor(() => {
      expect(screen.getByTestId('order-item-name-link')).toBeInTheDocument();
    });

    const nameLink = screen.getByTestId('order-item-name-link');
    await user.click(nameLink);

    // Verify router navigation updated URL smoothly
    expect(screen.getByTestId('test-location')).toHaveTextContent('/san-pham/1?variantId=10');
  });
});
