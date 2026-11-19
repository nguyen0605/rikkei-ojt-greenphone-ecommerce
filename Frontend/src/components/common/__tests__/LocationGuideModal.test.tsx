import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationGuideModal from '../LocationGuideModal';

describe('LocationGuideModal', () => {
  it('renders visual guide image with arrow pointing to allow button by default', () => {
    render(<LocationGuideModal open={true} onClose={vi.fn()} />);

    expect(screen.getByText('Hướng dẫn bật quyền vị trí')).toBeInTheDocument();
    expect(screen.getByText('Bấm Allow khi hỏi')).toBeInTheDocument();
    expect(screen.getByText('Mở lại ở Ổ khóa nếu đã chặn')).toBeInTheDocument();

    const allowImg = screen.getByAltText('Hướng dẫn bấm Allow để cấp quyền vị trí');
    expect(allowImg).toBeInTheDocument();
  });

  it('switches to unlock guide image when switching tabs', async () => {
    const user = userEvent.setup();
    render(<LocationGuideModal open={true} onClose={vi.fn()} />);

    const unlockTab = screen.getByText('Mở lại ở Ổ khóa nếu đã chặn');
    await user.click(unlockTab);

    expect(
      screen.getByAltText('Hướng dẫn mở quyền vị trí ở biểu tượng ổ khóa')
    ).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(<LocationGuideModal open={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    await user.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onRetryLocate and onClose when "Tôi đã bật, định vị ngay" is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleRetry = vi.fn();

    render(
      <LocationGuideModal
        open={true}
        onClose={handleClose}
        onRetryLocate={handleRetry}
      />
    );

    const retryBtn = screen.getByRole('button', { name: 'Tôi đã bật, định vị ngay' });
    await user.click(retryBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('sets sessionStorage flags when reload button is clicked', async () => {
    const user = userEvent.setup();
    const reloadMock = vi.fn();
    const originalLocation = window.location;

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });

    render(<LocationGuideModal open={true} onClose={vi.fn()} />);

    const reloadBtn = screen.getByRole('button', { name: /Tải lại trang/i });
    await user.click(reloadBtn);

    expect(sessionStorage.getItem('gp_auto_locate_on_reload')).toBe('true');
    expect(sessionStorage.getItem('gp_auto_open_address_modal')).toBe('true');
    expect(reloadMock).toHaveBeenCalledTimes(1);

    // Restore
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
});
