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
    await user.type(screen.getAllByPlaceholderText('Quận / Huyện')[0], 'Cầu Giấy');
    await user.type(screen.getAllByPlaceholderText('Phường / Xã')[0], 'Dịch Vọng');
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
    await user.type(screen.getAllByPlaceholderText('Quận / Huyện')[0], 'Ba Đình');
    await user.type(screen.getAllByPlaceholderText('Phường / Xã')[0], 'Kim Mã');
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
});
