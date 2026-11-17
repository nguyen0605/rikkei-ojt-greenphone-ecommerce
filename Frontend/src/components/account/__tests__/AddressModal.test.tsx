import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressModal from '@/components/account/AddressModal';
import type { AddressItem } from '@/types/api';

vi.mock('@/components/checkout/CheckoutDeliveryMap', () => ({
  default: () => <div data-testid="mock-checkout-delivery-map" />,
}));

vi.mock('@/components/checkout/checkoutGeocodingService', () => ({
  geocodeInitialAddress: vi.fn().mockResolvedValue({
    lat: 21.0362,
    lng: 105.7906,
    displayName: 'Cầu Giấy, Hà Nội',
  }),
  searchAddressSuggestions: vi.fn().mockResolvedValue([]),
  reverseGeocode: vi.fn().mockResolvedValue('Cầu Giấy, Hà Nội'),
  reverseGeocodeDetails: vi.fn().mockResolvedValue({
    id: 'geo-1',
    place_name: 'Số 123 Đường Cầu Giấy, Hà Nội',
    title: 'Số 123 Đường Cầu Giấy',
    subtitle: 'Hà Nội, Việt Nam',
    lat: 21.0362,
    lng: 105.7906,
    source: 'photon',
    components: {
      province: 'Hà Nội',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng',
      streetAddress: 'Số 123 Đường Cầu Giấy',
    },
  }),
  isValidCoordinate: vi.fn().mockImplementation((lat, lng) => {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }),
  searchLocalDictionary: vi.fn().mockReturnValue([
    {
      id: 'dict-1',
      place_name: 'Hà Nội',
      title: 'Hà Nội',
      subtitle: 'Việt Nam',
      lat: 21.03,
      lng: 105.79,
      source: 'dictionary',
    },
  ]),
}));

describe('AddressModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    Object.defineProperty(navigator, 'geolocation', {
      writable: true,
      value: {
        getCurrentPosition: vi.fn().mockImplementation((success) =>
          success({
            coords: {
              latitude: 21.0362,
              longitude: 105.7906,
              accuracy: 10,
            },
          })
        ),
      },
    });
  });

  it('renders modal with title for adding address', () => {
    render(<AddressModal open={true} onCancel={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByText('Thêm địa chỉ nhận hàng mới')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0912345678')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Số 123 Đường Cầu Giấy/i)).toBeInTheDocument();
    expect(screen.getByText('Đặt làm địa chỉ nhận hàng mặc định')).toBeInTheDocument();
  });

  it('prefills fields when initialData is provided', () => {
    const existing: AddressItem = {
      id: 'addr_123',
      receiverName: 'Trần Văn B',
      receiverPhone: '0988776655',
      province: 'Hà Nội',
      district: 'Ba Đình',
      ward: 'Kim Mã',
      streetAddress: 'Số 99 Phố Kim Mã',
      note: 'Giao giờ hành chính',
      isDefault: true,
    };

    render(
      <AddressModal
        open={true}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        initialData={existing}
      />
    );

    expect(screen.getByText('Chỉnh sửa địa chỉ nhận hàng')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Trần Văn B')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0988776655')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Số 99 Phố Kim Mã')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Giao giờ hành chính')).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<AddressModal open={true} onCancel={vi.fn()} onSubmit={handleSubmit} />);

    // Clear any prefilled default values or submit directly
    const submitBtn = screen.getByRole('button', { name: 'Thêm địa chỉ' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập tên người nhận')).toBeInTheDocument();
      expect(screen.getByText('Vui lòng nhập số điện thoại')).toBeInTheDocument();
      expect(screen.getByText('Vui lòng nhập số nhà, tên đường')).toBeInTheDocument();
    });
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits valid form data to onSubmit handler', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AddressModal open={true} onCancel={vi.fn()} onSubmit={handleSubmit} />);

    await user.type(screen.getByPlaceholderText('Nguyễn Văn A'), 'Phạm Thị D');
    await user.type(screen.getByPlaceholderText('0912345678'), '0912345678');
    await user.type(screen.getAllByPlaceholderText(/Quận \/ Huyện/i)[0], 'Cầu Giấy');
    await user.type(screen.getAllByPlaceholderText(/Phường \/ Xã/i)[0], 'Dịch Vọng');
    await user.type(
      screen.getByPlaceholderText(/Số 123 Đường Cầu Giấy/i),
      'Số 50 Đường Cầu Giấy'
    );

    const submitBtn = screen.getByRole('button', { name: 'Thêm địa chỉ' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          receiverName: 'Phạm Thị D',
          receiverPhone: '0912345678',
          district: 'Cầu Giấy',
          ward: 'Dịch Vọng',
          streetAddress: 'Số 50 Đường Cầu Giấy',
        })
      );
    });
  });

  it('renders address label radio options and allows selecting label', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AddressModal open={true} onCancel={vi.fn()} onSubmit={handleSubmit} />);

    expect(screen.getByText(/Nhà riêng/)).toBeInTheDocument();
    expect(screen.getByText(/Văn phòng/)).toBeInTheDocument();
    expect(screen.getByText(/Người thân/)).toBeInTheDocument();
    expect(screen.getByText(/Khác/)).toBeInTheDocument();

    const officeRadio = screen.getByText(/Văn phòng/).closest('label')!;
    await user.click(officeRadio);

    await user.type(screen.getByPlaceholderText('Nguyễn Văn A'), 'Trần Văn C');
    await user.type(screen.getByPlaceholderText('0912345678'), '0988776655');
    await user.type(screen.getAllByPlaceholderText(/Quận \/ Huyện/i)[0], 'Ba Đình');
    await user.type(screen.getAllByPlaceholderText(/Phường \/ Xã/i)[0], 'Kim Mã');
    await user.type(
      screen.getByPlaceholderText(/Số 123 Đường Cầu Giấy/i),
      'Tòa nhà Capital Tower, 109 Trần Hưng Đạo'
    );

    const submitBtn = screen.getByRole('button', { name: 'Thêm địa chỉ' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'OFFICE',
          receiverName: 'Trần Văn C',
        })
      );
    });
  });

  it('blocks submission and shows error when address does not exist on map', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const { geocodeInitialAddress } = await import('@/components/checkout/checkoutGeocodingService');
    vi.mocked(geocodeInitialAddress).mockResolvedValueOnce(null);

    render(<AddressModal open={true} onCancel={vi.fn()} onSubmit={handleSubmit} />);

    await user.type(screen.getByPlaceholderText('Nguyễn Văn A'), 'Người Dùng Test');
    await user.type(screen.getByPlaceholderText('0912345678'), '0912345678');
    await user.type(screen.getAllByPlaceholderText(/Quận \/ Huyện/i)[0], 'Cầu Giấy');
    await user.type(screen.getAllByPlaceholderText(/Phường \/ Xã/i)[0], 'Dịch Vọng');
    await user.type(
      screen.getByPlaceholderText(/Số 123 Đường Cầu Giấy/i),
      'dâdadada địa chỉ không tồn tại'
    );

    const submitBtn = screen.getByRole('button', { name: 'Thêm địa chỉ' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getAllByText('Địa chỉ không tồn tại trên bản đồ hoặc không thuộc khu vực đã chọn. Vui lòng kiểm tra lại địa chỉ hoặc chọn vị trí trên bản đồ.').length
      ).toBeGreaterThan(0);
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('shows error and unpins location when manual locate button finds no address on map', async () => {
    const user = userEvent.setup();
    const { geocodeInitialAddress } = await import('@/components/checkout/checkoutGeocodingService');
    vi.mocked(geocodeInitialAddress).mockResolvedValueOnce(null);

    render(<AddressModal open={true} onCancel={vi.fn()} onSubmit={vi.fn()} />);

    await user.type(screen.getAllByPlaceholderText(/Quận \/ Huyện/i)[0], 'Cầu Giấy');
    await user.type(screen.getAllByPlaceholderText(/Phường \/ Xã/i)[0], 'Dịch Vọng');
    await user.type(
      screen.getByPlaceholderText(/Số 123 Đường Cầu Giấy/i),
      'dâdadada địa chỉ ảo'
    );

    const locateBtn = screen.getByRole('button', { name: /Định vị từ địa chỉ đã nhập/i });
    await user.click(locateBtn);

    await waitFor(() => {
      expect(screen.getByText('Chưa có trên bản đồ')).toBeInTheDocument();
    });
  });

  it('warns user if attempting to locate when street address has not been entered', async () => {
    const user = userEvent.setup();
    render(<AddressModal open={true} onCancel={vi.fn()} onSubmit={vi.fn()} />);

    // Ô streetAddress đang trống, bấm nút Định vị
    const locateBtn = screen.getByRole('button', { name: /Định vị từ địa chỉ đã nhập/i });
    await user.click(locateBtn);

    await waitFor(() => {
      expect(
        screen.getAllByText('Vui lòng nhập số nhà, tên đường hoặc địa chỉ cụ thể trước khi định vị.').length
      ).toBeGreaterThan(0);
    });
  });

  it('allows locating current position and auto-filling address fields via GPS button next to other', async () => {
    const user = userEvent.setup();
    render(<AddressModal open={true} onCancel={vi.fn()} onSubmit={vi.fn()} />);

    // Kiểm tra nút Vị trí hiện tại hiển thị bên cạnh mục Khác
    const currentLocationBtn = screen.getByRole('button', { name: /Vị trí hiện tại/i });
    expect(currentLocationBtn).toBeInTheDocument();

    await user.click(currentLocationBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Số 123 Đường Cầu Giấy')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Cầu Giấy')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Dịch Vọng')).toBeInTheDocument();
    });
  });

  it('blocks submission and shows error if district does not belong to selected province', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AddressModal open={true} onCancel={vi.fn()} onSubmit={handleSubmit} />);

    // Default province is Hà Nội
    await user.type(screen.getByPlaceholderText('Nguyễn Văn A'), 'Test User');
    await user.type(screen.getByPlaceholderText('0912345678'), '0912345678');
    // Type a district that belongs to TP.HCM, not Hà Nội
    await user.type(screen.getAllByPlaceholderText(/Quận \/ Huyện/i)[0], 'Quận 1');
    await user.type(screen.getAllByPlaceholderText(/Phường \/ Xã/i)[0], 'Bến Nghé');
    await user.type(screen.getByPlaceholderText(/Số 123 Đường Cầu Giấy/i), '123 Đường Lê Lợi');

    const submitBtn = screen.getByRole('button', { name: 'Thêm địa chỉ' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/"Quận 1" không thuộc Hà Nội/i)).toBeInTheDocument();
    });
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('auto-fills all address fields including province, district and ward from GPS coords in TP. HCM', async () => {
    const user = userEvent.setup();
    const { reverseGeocodeDetails } = await import('@/components/checkout/checkoutGeocodingService');
    vi.mocked(reverseGeocodeDetails).mockResolvedValueOnce({
      id: 'nom-1',
      place_name: 'Đường Anh Đào 1, Vinhomes Grand Park, Phường Long Bình, Thành phố Hồ Chí Minh',
      title: 'Đường Anh Đào 1, Vinhomes Grand Park',
      subtitle: 'Phường Long Bình, Thành phố Hồ Chí Minh',
      lat: 10.8465,
      lng: 106.8365,
      source: 'nominatim',
      components: {
        province: 'Thành phố Hồ Chí Minh',
        district: '',
        ward: 'Phường Long Bình',
        streetAddress: 'Đường Anh Đào 1, Vinhomes Grand Park',
      },
    });

    render(<AddressModal open={true} onCancel={vi.fn()} onSubmit={vi.fn()} />);

    const currentLocationBtn = screen.getByRole('button', { name: /Vị trí hiện tại/i });
    await user.click(currentLocationBtn);

    await waitFor(() => {
      expect(screen.getByText('TP. Hồ Chí Minh')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Thành phố Thủ Đức')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Phường Long Bình')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Đường Anh Đào 1, Vinhomes Grand Park')).toBeInTheDocument();
    });
  });

  it('displays location permission guide modal when browser denies geolocation', async () => {
    const user = userEvent.setup();
    // Giả lập quyền vị trí bị từ chối (PERMISSION_DENIED = 1)
    Object.defineProperty(navigator, 'geolocation', {
      writable: true,
      value: {
        getCurrentPosition: vi.fn().mockImplementation((_success, error) => {
          error({
            code: 1, // PERMISSION_DENIED
            message: 'User denied Geolocation',
          });
        }),
      },
    });

    render(<AddressModal open={true} onCancel={vi.fn()} onSubmit={vi.fn()} />);

    const currentLocationBtn = screen.getByRole('button', { name: /Vị trí hiện tại/i });
    await user.click(currentLocationBtn);

    await waitFor(() => {
      expect(screen.getByText('Cấp quyền truy cập vị trí hiện tại')).toBeInTheDocument();
      expect(screen.getByText('Vị trí (Location)')).toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeInTheDocument();
      expect(screen.getByText(/Nếu công tắc chưa bật được/i)).toBeInTheDocument();
    });
  });
});
