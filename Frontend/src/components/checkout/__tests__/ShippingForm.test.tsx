import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import ShippingForm from '../ShippingForm';
import checkoutReducer from '@/store/slices/checkoutSlice';
import authReducer from '@/store/slices/authSlice';
import * as geocodingService from '../checkoutGeocodingService';
import { userService } from '@/services';

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      remove: vi.fn(),
      flyTo: vi.fn(),
      getZoom: vi.fn(() => 12),
      invalidateSize: vi.fn(),
      on: vi.fn(),
    })),
    tileLayer: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      on: vi.fn(),
    })),
    marker: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      bindPopup: vi.fn().mockReturnThis(),
      setLatLng: vi.fn().mockReturnThis(),
      setPopupContent: vi.fn().mockReturnThis(),
      openPopup: vi.fn().mockReturnThis(),
      on: vi.fn(),
      remove: vi.fn(),
    })),
    divIcon: vi.fn(() => ({})),
    control: {
      zoom: vi.fn(() => ({ addTo: vi.fn() })),
    },
  },
}));

// Mock userService
vi.mock('@/services', () => ({
  userService: {
    getAddresses: vi.fn().mockResolvedValue([]),
  },
  formatFullAddress: vi.fn((addr) => `${addr.detailAddress}, ${addr.ward}, ${addr.district}, ${addr.province}`),
}));

const rootReducer = combineReducers({
  checkout: checkoutReducer,
  auth: authReducer,
});

type RootTestState = ReturnType<typeof rootReducer>;
type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

function renderWithStore(preloadedState?: DeepPartial<RootTestState>) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as never,
  });

  const utils = render(
    <Provider store={store}>
      <ShippingForm />
    </Provider>
  );

  return { store, ...utils };
}

describe('ShippingForm with OpenStreetMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userService.getAddresses).mockReset();
    vi.mocked(userService.getAddresses).mockResolvedValue([]);
  });

  it('renders shipping form fields and OpenStreetMap container without Mapbox warning', async () => {
    renderWithStore();

    expect(screen.getByText('Địa chỉ nhận hàng')).toBeInTheDocument();
    expect(screen.getByText('Thông tin người nhận máy')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0901234567')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Nhập địa chỉ, tên đường (ví dụ: 97 Man Thiện, Cầu Giấy...)')
    ).toBeInTheDocument();

    // Map button exists; clicking opens the lazy-loaded OpenStreetMap container
    const viewMapBtn = screen.getByRole('button', { name: /Xem bản đồ/i });
    expect(viewMapBtn).toBeInTheDocument();
    fireEvent.click(viewMapBtn);
    expect(await screen.findByTestId('checkout-delivery-map-container')).toBeInTheDocument();

    // KHÔNG còn cảnh báo thiếu Mapbox token
    expect(screen.queryByText(/Chưa có VITE_MAPBOX_TOKEN/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/mapbox.com/i)).not.toBeInTheDocument();
  });

  it('renders saved addresses from address book and auto-fills selected address', async () => {
    const mockAddresses = [
      {
        id: 'addr_home',
        receiverName: 'Nguyễn Văn Chủ Hộ',
        receiverPhone: '0912121212',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng Hậu',
        streetAddress: '10 Duy Tân',
        label: 'HOME',
        isDefault: true,
        latitude: 21.031,
        longitude: 105.783,
      },
      {
        id: 'addr_office',
        receiverName: 'Nguyễn Văn Đồng Nghiệp',
        receiverPhone: '0988888888',
        province: 'Hà Nội',
        district: 'Ba Đình',
        ward: 'Kim Mã',
        streetAddress: '20 Kim Mã',
        label: 'OFFICE',
        isDefault: false,
      },
    ];

    vi.mocked(userService.getAddresses).mockResolvedValueOnce(mockAddresses);

    const { store } = renderWithStore({
      auth: {
        isAuthenticated: true,
        token: 'mock-token',
        user: {
          id: 1,
          email: 'customer@greenphone.vn',
          fullName: 'Nguyễn Văn Chủ Hộ',
          phone: '0912121212',
          role: 'CUSTOMER',
        },
      },
    });

    // Ban đầu hiển thị thẻ gộp của địa chỉ mặc định
    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Chủ Hộ')).toBeInTheDocument();
      expect(screen.getByText('Nhà riêng')).toBeInTheDocument();
    });

    // Ban đầu tự động chọn địa chỉ mặc định
    expect(store.getState().checkout.shipping.fullName).toBe('Nguyễn Văn Chủ Hộ');
    expect(store.getState().checkout.shipping.phone).toBe('0912121212');

    // Bấm nút "Thay đổi" để mở modal chọn địa chỉ
    const changeBtn = screen.getByRole('button', { name: /^Thay đổi$/i });
    fireEvent.click(changeBtn);

    // Modal hiển thị danh sách các địa chỉ đã lưu
    await waitFor(() => {
      expect(screen.getByText('Địa chỉ nhận hàng của bạn')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn Đồng Nghiệp')).toBeInTheDocument();
      expect(screen.getByText('Văn phòng')).toBeInTheDocument();
    });

    // Click chọn địa chỉ thứ hai (văn phòng) trong modal
    const officeCard = screen.getByText('Nguyễn Văn Đồng Nghiệp').closest('[role="button"]');
    expect(officeCard).not.toBeNull();
    fireEvent.click(officeCard!);

    // Cập nhật thông tin người nhận và Redux
    await waitFor(() => {
      expect(store.getState().checkout.shipping.fullName).toBe('Nguyễn Văn Đồng Nghiệp');
      expect(store.getState().checkout.shipping.phone).toBe('0988888888');
      expect(screen.getByPlaceholderText('Nguyễn Văn A')).toHaveValue('Nguyễn Văn Đồng Nghiệp');
    });
  });

  it('syncs input changes to Redux checkout slice', async () => {
    const { store } = renderWithStore();

    const nameInput = screen.getByPlaceholderText('Nguyễn Văn A');
    const phoneInput = screen.getByPlaceholderText('0901234567');

    fireEvent.change(nameInput, { target: { value: 'Trần Văn B' } });
    fireEvent.change(phoneInput, { target: { value: '0987654321' } });

    expect(store.getState().checkout.shipping.fullName).toBe('Trần Văn B');
    expect(store.getState().checkout.shipping.phone).toBe('0987654321');
  });

  it('searches address and shows suggestions dropdown', async () => {
    vi.spyOn(geocodingService, 'searchAddressSuggestions').mockResolvedValueOnce([
      {
        id: 'dict-1',
        place_name: 'Quận Cầu Giấy, Hà Nội',
        title: 'Quận Cầu Giấy',
        subtitle: 'Hà Nội',
        lat: 21.0362,
        lng: 105.7906,
        source: 'dictionary',
      },
    ]);

    const { store } = renderWithStore();
    const addressInput = screen.getByPlaceholderText(
      'Nhập địa chỉ, tên đường (ví dụ: 97 Man Thiện, Cầu Giấy...)'
    );

    fireEvent.change(addressInput, { target: { value: 'Cầu Giấy' } });

    // Chờ debounce và xuất hiện gợi ý
    await waitFor(() => {
      expect(screen.getByText('Quận Cầu Giấy')).toBeInTheDocument();
    });

    // Chọn gợi ý
    const suggestionBtn = screen.getByText('Quận Cầu Giấy').closest('button');
    expect(suggestionBtn).not.toBeNull();
    fireEvent.click(suggestionBtn!);

    // Cập nhật Redux và form
    expect(store.getState().checkout.shipping.address).toBe('Quận Cầu Giấy, Hà Nội');
    expect(addressInput).toHaveValue('Quận Cầu Giấy, Hà Nội');

    // Dropdown đóng lại
    expect(screen.queryByRole('button', { name: /Quận Cầu Giấy/i })).not.toBeInTheDocument();
  });

  it('re-seeds default values from persisted Redux state', async () => {
    renderWithStore({
      checkout: {
        currentStep: 1,
        shipping: {
          fullName: 'Lê Thị C',
          phone: '0912345678',
          email: 'lethic@example.com',
          province: 'Hà Nội',
          district: 'Đống Đa',
          ward: 'Láng Thượng',
          address: '123 Phố Chùa Láng, Đống Đa, Hà Nội',
          shipToDifferentAddress: false,
        },
        delivery: 'standard',
        payment: 'cod',
        voucherDiscount: 0,
      },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nguyễn Văn A')).toHaveValue('Lê Thị C');
      expect(screen.getByPlaceholderText('0901234567')).toHaveValue('0912345678');
      expect(
        screen.getByPlaceholderText('Nhập địa chỉ, tên đường (ví dụ: 97 Man Thiện, Cầu Giấy...)')
      ).toHaveValue('123 Phố Chùa Láng, Đống Đa, Hà Nội');
    });
  });

  it('typing short query like "97" does NOT prematurely display validation error', async () => {
    renderWithStore();

    const addressInput = screen.getByPlaceholderText(
      'Nhập địa chỉ, tên đường (ví dụ: 97 Man Thiện, Cầu Giấy...)'
    );

    // Người dùng gõ "97" để tìm kiếm
    fireEvent.change(addressInput, { target: { value: '97' } });

    // Không kích hoạt lỗi khi đang gõ
    expect(screen.queryByText('Địa chỉ tối thiểu 5 ký tự')).not.toBeInTheDocument();
  });

  it('displays validation error messages when fields lose focus (onBlur)', async () => {
    renderWithStore();

    const nameInput = screen.getByPlaceholderText('Nguyễn Văn A');
    const phoneInput = screen.getByPlaceholderText('0901234567');
    const addressInput = screen.getByPlaceholderText(
      'Nhập địa chỉ, tên đường (ví dụ: 97 Man Thiện, Cầu Giấy...)'
    );

    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.blur(nameInput);

    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.blur(phoneInput);

    fireEvent.change(addressInput, { target: { value: '12' } });
    fireEvent.blur(addressInput);

    await waitFor(() => {
      expect(screen.getByText('Họ tên tối thiểu 2 ký tự')).toBeInTheDocument();
      expect(screen.getByText('SĐT không hợp lệ (10 số, bắt đầu 0)')).toBeInTheDocument();
      expect(screen.getByText('Địa chỉ tối thiểu 5 ký tự')).toBeInTheDocument();
    });
  });

  it('toggles map expansion and collapse smoothly without unmounting coordinates', async () => {
    renderWithStore();

    // Ban đầu hiển thị nút bấm xem bản đồ (lazy)
    const openBtn = screen.getByRole('button', { name: /Xem bản đồ/i });
    expect(openBtn).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-delivery-map-container')).not.toBeInTheDocument();

    // Bấm mở bản đồ
    fireEvent.click(openBtn);
    expect(await screen.findByTestId('checkout-delivery-map-container')).toBeInTheDocument();

    // Bấm thu gọn bản đồ
    const collapseBtn = screen.getByRole('button', { name: /Thu gọn bản đồ/i });
    fireEvent.click(collapseBtn);
    expect(screen.queryByTestId('checkout-delivery-map-container')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xem bản đồ/i })).toBeInTheDocument();
  });

  it('falls back to authUser information when address API fails and form is empty', async () => {
    vi.mocked(userService.getAddresses).mockRejectedValueOnce(new Error('Network error'));

    const { store } = renderWithStore({
      auth: {
        isAuthenticated: true,
        token: 'mock-token',
        user: {
          id: 99,
          email: 'customer@greenphone.vn',
          fullName: 'Khách Hàng Dự Phòng',
          phone: '0933445566',
          address: '456 Đường Lê Duẩn, Đà Nẵng',
          role: 'CUSTOMER',
        },
      },
    });

    await waitFor(() => {
      expect(store.getState().checkout.shipping.fullName).toBe('Khách Hàng Dự Phòng');
      expect(store.getState().checkout.shipping.phone).toBe('0933445566');
      expect(store.getState().checkout.shipping.address).toBe('456 Đường Lê Duẩn, Đà Nẵng');
    });
  });

  it('does NOT overwrite pre-filled shipping info when saved addresses load', async () => {
    vi.mocked(userService.getAddresses).mockResolvedValueOnce([
      {
        id: 'addr-1',
        receiverName: 'Tên Khác Trong Sổ',
        receiverPhone: '0900000000',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng',
        streetAddress: '1 Duy Tân',
        label: 'HOME',
        isDefault: true,
      },
    ]);

    const { store } = renderWithStore({
      checkout: {
        currentStep: 1,
        shipping: {
          fullName: 'Tên Người Đã Nhập',
          phone: '0911223344',
          email: 'custom@example.com',
          province: 'TP.HCM',
          district: 'Quận 1',
          ward: 'Bến Nghé',
          address: '100 Nguyễn Huệ, Quận 1, TP.HCM',
          shipToDifferentAddress: false,
        },
        delivery: 'standard',
        payment: 'cod',
        voucherDiscount: 0,
      },
    });

    await waitFor(() => {
      // Giữ nguyên thông tin người dùng đã nhập, không bị ghi đè bởi địa chỉ mặc định
      expect(store.getState().checkout.shipping.fullName).toBe('Tên Người Đã Nhập');
      expect(store.getState().checkout.shipping.address).toBe('100 Nguyễn Huệ, Quận 1, TP.HCM');
    });
  });
});
