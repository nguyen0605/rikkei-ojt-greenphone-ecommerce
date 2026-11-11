import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import React, { Suspense, lazy } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import GlobalPageLoader from '../GlobalPageLoader';
import TopProgressBar, { startTopProgressBar, completeTopProgressBar } from '../TopProgressBar';

describe('GlobalPageLoader', () => {
  it('renders GreenPhone brand logo, emerald spinner, and default messages', () => {
    render(<GlobalPageLoader />);

    // Brand logo
    const logoImg = screen.getByAltText('GreenPhone Logo');
    expect(logoImg).toBeInTheDocument();
    expect(logoImg).toHaveAttribute('src', '/logo.png');
    expect(logoImg.className).toContain('animate-pulse');

    // Brand text
    expect(screen.getByText('Green')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();

    // Default message and slogan
    expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();
    expect(
      screen.getByText('Điện thoại chính hãng - Giá tốt mỗi ngày'),
    ).toBeInTheDocument();

    // Emerald spinner & glow aura
    const spinner = screen.getByTestId('loader-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner.className).toContain('border-t-emerald-600');
    expect(spinner.className).toContain('animate-spin');

    const glow = screen.getByTestId('loader-glow');
    expect(glow).toBeInTheDocument();
    expect(glow.className).toContain('bg-emerald-500/20');

    // Accessibility attributes
    const statusContainer = screen.getByRole('status');
    expect(statusContainer).toHaveAttribute('aria-live', 'polite');
    expect(statusContainer).toHaveAttribute('aria-label', 'Đang tải trang');
  });

  it('renders custom message and submessage when provided', () => {
    render(
      <GlobalPageLoader
        message="Đang chuẩn bị đơn hàng..."
        submessage="Hệ thống đang đồng bộ dữ liệu"
      />,
    );

    expect(screen.getByText('Đang chuẩn bị đơn hàng...')).toBeInTheDocument();
    expect(
      screen.getByText('Hệ thống đang đồng bộ dữ liệu'),
    ).toBeInTheDocument();
  });

  it('applies fullscreen and backdrop blur classes by default for seamless transitions', () => {
    const { container } = render(<GlobalPageLoader />);
    const loader = container.firstChild as HTMLElement;

    expect(loader.className).toContain('fixed');
    expect(loader.className).toContain('inset-0');
    expect(loader.className).toContain('z-50');
    expect(loader.className).toContain('backdrop-blur-md');
    expect(loader.className).toContain('duration-300');
    expect(loader.className).toContain('animate-fade-in');
  });

  it('supports non-fullscreen and no-blur rendering', () => {
    const { container } = render(
      <GlobalPageLoader fullScreen={false} blur={false} className="custom-class" />,
    );
    const loader = container.firstChild as HTMLElement;

    expect(loader.className).not.toContain('fixed');
    expect(loader.className).toContain('relative');
    expect(loader.className).not.toContain('backdrop-blur-md');
    expect(loader.className).toContain('custom-class');
  });

  it('functions seamlessly as a React Suspense fallback without crashing or layout shifting', async () => {
    let resolvePromise: (value: { default: React.ComponentType }) => void;
    const lazyPromise = new Promise<{ default: React.ComponentType }>((resolve) => {
      resolvePromise = resolve;
    });

    const LazyComponent = lazy(() => lazyPromise);

    render(
      <Suspense fallback={<GlobalPageLoader message="Đang nạp route..." />}>
        <LazyComponent />
      </Suspense>,
    );

    // Initial Suspense state displays GlobalPageLoader
    expect(screen.getByText('Đang nạp route...')).toBeInTheDocument();
    expect(screen.getByAltText('GreenPhone Logo')).toBeInTheDocument();

    // Resolving lazy component replaces loader
    await act(async () => {
      resolvePromise!({
        default: () => <div data-testid="resolved-page">Trang chi tiết sản phẩm</div>,
      });
    });

    expect(await screen.findByTestId('resolved-page')).toBeInTheDocument();
    expect(screen.queryByText('Đang nạp route...')).not.toBeInTheDocument();
  });
});

describe('TopProgressBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders a 3px emerald progress bar fixed at the top of the viewport', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TopProgressBar />
      </MemoryRouter>,
    );

    const progressBar = screen.getByTestId('top-progress-bar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar.className).toContain('from-emerald-600');
    expect(progressBar.className).toContain('via-green-500');
    expect(progressBar.className).toContain('to-emerald-400');

    const wrapper = progressBar.parentElement;
    expect(wrapper?.className).toContain('fixed');
    expect(wrapper?.className).toContain('top-0');
    expect(wrapper?.className).toContain('z-[9999]');
    expect(wrapper?.style.height).toBe('3px');
  });

  it('triggers progress animation on route navigation and completes smoothly', async () => {
    const NavComponent = () => {
      const navigate = useNavigate();
      return (
        <div>
          <button onClick={() => navigate('/products')}>Go to Products</button>
        </div>
      );
    };

    render(
      <MemoryRouter initialEntries={['/']}>
        <TopProgressBar />
        <NavComponent />
      </MemoryRouter>,
    );

    const progressBar = screen.getByTestId('top-progress-bar');

    // Trigger navigation
    await act(async () => {
      screen.getByText('Go to Products').click();
    });

    // Bar jumps immediately (< 50ms) to initial value
    expect(Number(progressBar.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(25);

    // Runs completion animation and fade-out timer
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Progress reaches 100%
    expect(progressBar.getAttribute('aria-valuenow')).toBe('100');

    // Advances past dwell + fade out time (300ms + 150ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // Reset to 0 after fade out
    expect(progressBar.getAttribute('aria-valuenow')).toBe('0');
  });

  it('responds instantly to programmatic start and complete triggers', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TopProgressBar />
      </MemoryRouter>,
    );

    const progressBar = screen.getByTestId('top-progress-bar');

    // Trigger start
    await act(async () => {
      startTopProgressBar();
    });

    expect(Number(progressBar.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(25);

    // Trickle progress increases over time
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(Number(progressBar.getAttribute('aria-valuenow'))).toBeGreaterThan(25);

    // Trigger completion
    await act(async () => {
      completeTopProgressBar();
    });

    expect(progressBar.getAttribute('aria-valuenow')).toBe('100');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
  });

  it('intercepts internal anchor clicks for sub-50ms instant feedback', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TopProgressBar />
        <a
          href="/chi-tiet-san-pham"
          data-testid="internal-link"
          onClick={(e) => e.preventDefault()}
        >
          Xem chi tiết
        </a>
        <a
          href="https://example.com"
          target="_blank"
          rel="noreferrer"
          data-testid="external-link"
          onClick={(e) => e.preventDefault()}
        >
          Example
        </a>
      </MemoryRouter>,
    );

    const progressBar = screen.getByTestId('top-progress-bar');

    // Clicking external link does not trigger bar
    await act(async () => {
      fireEvent.click(screen.getByTestId('external-link'));
    });
    expect(progressBar.getAttribute('aria-valuenow')).toBe('0');

    // Clicking internal link triggers bar immediately
    await act(async () => {
      fireEvent.click(screen.getByTestId('internal-link'));
    });
    expect(Number(progressBar.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(25);

    // Complete progress and advance past fade-out
    await act(async () => {
      completeTopProgressBar();
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(progressBar.getAttribute('aria-valuenow')).toBe('0');
  });
});
