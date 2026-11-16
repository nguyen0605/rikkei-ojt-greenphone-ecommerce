import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import AccountDevicesPage from '@/pages/account/AccountDevicesPage';
import { deviceService } from '@/services/deviceService';
import type { DeviceSessionDTO } from '@/types/api';

vi.mock('@/services/deviceService', () => ({
  deviceService: {
    getDevices: vi.fn(),
    revokeDevice: vi.fn(),
    revokeOtherDevices: vi.fn(),
  },
}));

const mockDevices: DeviceSessionDTO[] = [
  {
    id: 1,
    deviceName: 'Chrome on Windows',
    os: 'Windows 11',
    browser: 'Chrome 120.0',
    ipAddress: '192.168.1.10',
    isCurrentSession: true,
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: 2,
    deviceName: 'Safari on iPhone',
    os: 'iOS 17.2',
    browser: 'Safari Mobile',
    ipAddress: '14.162.20.5',
    isCurrentSession: false,
    lastActiveAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
];

describe('AccountDevicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = () => {
    return render(
      <App>
        <AccountDevicesPage />
      </App>
    );
  };

  it('renders device sessions list and marks current device properly', async () => {
    vi.mocked(deviceService.getDevices).mockResolvedValue(mockDevices);

    renderWithProviders();

    // Verify title
    expect(screen.getByText('Thiết bị đăng nhập')).toBeInTheDocument();

    // Verify loading finish and items shown
    await waitFor(() => {
      expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
      expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    });

    // Current device should have badge
    expect(screen.getByText('Thiết bị này')).toBeInTheDocument();

    // Action button to revoke all other devices should be available
    expect(
      screen.getByRole('button', { name: /đăng xuất tất cả thiết bị khác/i })
    ).toBeInTheDocument();
  });

  it('does NOT render revoke button on current device card', async () => {
    vi.mocked(deviceService.getDevices).mockResolvedValue(mockDevices);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
    });

    const currentCard = screen.getByTestId('device-card-1');
    expect(currentCard).toHaveTextContent('Thiết bị này');
    expect(currentCard).not.toHaveTextContent('Đăng xuất thiết bị');
  });

  it('opens confirmation modal and revokes single device successfully', async () => {
    const user = userEvent.setup();
    vi.mocked(deviceService.getDevices).mockResolvedValue(mockDevices);
    vi.mocked(deviceService.revokeDevice).mockResolvedValue(undefined);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    });

    // Click revoke button on the other device
    const revokeBtn = screen.getByRole('button', { name: /đăng xuất safari on iphone/i });
    await user.click(revokeBtn);

    // Modal should be visible
    expect(screen.getByText('Đăng xuất khỏi thiết bị này?')).toBeInTheDocument();

    // Click confirm in modal
    const confirmBtn = screen.getByRole('button', { name: 'Đăng xuất ngay' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(deviceService.revokeDevice).toHaveBeenCalledWith(2);
    });
  });

  it('opens confirmation modal and revokes all other devices', async () => {
    const user = userEvent.setup();
    vi.mocked(deviceService.getDevices).mockResolvedValue(mockDevices);
    vi.mocked(deviceService.revokeOtherDevices).mockResolvedValue(undefined);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    });

    // Click revoke all button
    const revokeAllBtn = screen.getByRole('button', { name: /đăng xuất tất cả thiết bị khác/i });
    await user.click(revokeAllBtn);

    // Modal title for all
    expect(screen.getByText('Đăng xuất tất cả thiết bị khác?')).toBeInTheDocument();

    // Confirm
    const confirmBtn = screen.getByRole('button', { name: 'Đăng xuất tất cả khác' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(deviceService.revokeOtherDevices).toHaveBeenCalledTimes(1);
    });
  });
});
