import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddressBookPage from '@/pages/account/AddressBookPage';
import { userService } from '@/services';
import type { AddressItem } from '@/types/api';

vi.mock('@/services', () => ({
  userService: {
    getAddresses: vi.fn(),
    createAddress: vi.fn(),
    updateAddress: vi.fn(),
    deleteAddress: vi.fn(),
    setDefaultAddress: vi.fn(),
  },
  formatFullAddress: (item: Partial<AddressItem>) =>
    [item.streetAddress, item.ward, item.district, item.province].filter(Boolean).join(', '),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App>
        <AddressBookPage />
      </App>
    </QueryClientProvider>
  );
}

describe('AddressBookPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when there are no addresses', async () => {
    vi.mocked(userService.getAddresses).mockResolvedValueOnce([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Chưa có địa chỉ nhận hàng nào')).toBeInTheDocument();
      expect(screen.getByText('Thêm địa chỉ ngay')).toBeInTheDocument();
    });
  });

  it('renders address cards with default tag and action buttons', async () => {
    const mockAddresses: AddressItem[] = [
      {
        id: 'addr_1',
        receiverName: 'Nguyễn Văn A',
        receiverPhone: '0912345678',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng',
        streetAddress: '123 Đường Cầu Giấy',
        isDefault: true,
      },
      {
        id: 'addr_2',
        receiverName: 'Trần Văn B',
        receiverPhone: '0987654321',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        ward: 'Bến Nghé',
        streetAddress: '456 Lê Lợi',
        isDefault: false,
      },
    ];
    vi.mocked(userService.getAddresses).mockResolvedValueOnce(mockAddresses);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText('Trần Văn B')).toBeInTheDocument();
      expect(screen.getByText('123 Đường Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội')).toBeInTheDocument();
      expect(screen.getByText('Mặc định')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /đặt làm mặc định/i })).toBeInTheDocument();
    });
  });

  it('opens add modal when clicking "Thêm địa chỉ mới"', async () => {
    const user = userEvent.setup();
    vi.mocked(userService.getAddresses).mockResolvedValueOnce([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Sổ địa chỉ nhận hàng')).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /thêm địa chỉ mới/i });
    await user.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Thêm địa chỉ nhận hàng mới')).toBeInTheDocument();
    });
  });

  it('disables delete button for single default address', async () => {
    const singleDefault: AddressItem[] = [
      {
        id: 'addr_only',
        receiverName: 'Nguyễn Duy Nhất',
        receiverPhone: '0912345678',
        province: 'Hà Nội',
        streetAddress: '123 Phố Huế',
        isDefault: true,
      },
    ];
    vi.mocked(userService.getAddresses).mockResolvedValueOnce(singleDefault);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Duy Nhất')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /xóa/i });
    expect(deleteBtn).toBeDisabled();
    expect(userService.deleteAddress).not.toHaveBeenCalled();
  });

  it('allows clicking "Đặt làm mặc định" to update default address', async () => {
    const user = userEvent.setup();
    const mockAddresses: AddressItem[] = [
      {
        id: 'addr_1',
        receiverName: 'Nguyễn Văn A',
        receiverPhone: '0912345678',
        province: 'Hà Nội',
        streetAddress: '123 Cầu Giấy',
        isDefault: true,
      },
      {
        id: 'addr_2',
        receiverName: 'Trần Văn B',
        receiverPhone: '0987654321',
        province: 'Hà Nội',
        streetAddress: '456 Ba Đình',
        isDefault: false,
      },
    ];
    vi.mocked(userService.getAddresses).mockResolvedValueOnce(mockAddresses);
    vi.mocked(userService.setDefaultAddress).mockResolvedValueOnce({
      ...mockAddresses[1],
      isDefault: true,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /đặt làm mặc định/i })).toBeInTheDocument();
    });

    const setDefaultBtn = screen.getByRole('button', { name: /đặt làm mặc định/i });
    await user.click(setDefaultBtn);

    await waitFor(() => {
      expect(userService.setDefaultAddress).toHaveBeenCalledWith('addr_2');
    });
  });

  it('renders custom labels and coordinate status badge', async () => {
    const mockAddresses: AddressItem[] = [
      {
        id: 'addr_office',
        receiverName: 'Lê Công Ty',
        receiverPhone: '0933333333',
        province: 'Hà Nội',
        streetAddress: 'Tòa nhà FPT, Cầu Giấy',
        label: 'OFFICE',
        latitude: 21.03,
        longitude: 105.78,
        isDefault: false,
      },
      {
        id: 'addr_family',
        receiverName: 'Bố Mẹ',
        receiverPhone: '0944444444',
        province: 'Đà Nẵng',
        streetAddress: '12 Nguyễn Tất Thành',
        label: 'FAMILY',
        isDefault: false,
      },
    ];
    vi.mocked(userService.getAddresses).mockResolvedValueOnce(mockAddresses);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Văn phòng')).toBeInTheDocument();
      expect(screen.getByText('Người thân')).toBeInTheDocument();
      expect(screen.getByText(/Đã ghim vị trí/)).toBeInTheDocument();
      expect(screen.getByText(/Chưa ghim vị trí/)).toBeInTheDocument();
    });
  });
});
