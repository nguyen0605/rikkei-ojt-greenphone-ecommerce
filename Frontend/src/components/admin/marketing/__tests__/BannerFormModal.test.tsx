import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import BannerFormModal from '../BannerFormModal';
import type { BannerDTO } from '@/types/api';

describe('BannerFormModal', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    });
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders modal in creation mode with empty fields', () => {
    render(
      <BannerFormModal
        open={true}
        editData={null}
        loading={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('Thêm banner')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tiêu đề banner/i)).toHaveValue('');
    expect(screen.getByLabelText(/URL hình ảnh/i)).toHaveValue('');
    expect(screen.getByLabelText(/Liên kết điều hướng/i)).toHaveValue('');
  });

  it('renders modal in edit mode with populated fields', () => {
    const editData: BannerDTO = {
      id: 10,
      title: 'Khuyến mãi mùa hè',
      imageUrl: 'https://example.com/banner.png',
      linkUrl: '/khuyen-mai',
      status: 'ACTIVE',
    };

    render(
      <BannerFormModal
        open={true}
        editData={editData}
        loading={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('Sửa banner')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tiêu đề banner/i)).toHaveValue('Khuyến mãi mùa hè');
    expect(screen.getByLabelText(/URL hình ảnh/i)).toHaveValue('https://example.com/banner.png');
    expect(screen.getByLabelText(/Liên kết điều hướng/i)).toHaveValue('/khuyen-mai');
  });

  it('triggers form validation when submitting empty fields', async () => {
    const onSubmit = vi.fn();
    render(
      <BannerFormModal
        open={true}
        editData={null}
        loading={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'OK' });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Nhập tiêu đề banner')).toBeInTheDocument();
      expect(screen.getByText('Nhập URL hình ảnh')).toBeInTheDocument();
      expect(screen.getByText('Nhập link điều hướng')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('displays aspect ratio warning when loaded image is not 3:1', async () => {
    const originalImage = window.Image;
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 800;
      height = 600; // ratio 1.33 != 3.0
      set src(_url: string) {
        setTimeout(() => {
          this.onload?.();
        }, 10);
      }
    }
    // @ts-expect-error Mock Image constructor
    window.Image = MockImage;

    render(
      <BannerFormModal
        open={true}
        editData={null}
        loading={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const imgInput = screen.getByLabelText(/URL hình ảnh/i);
    await userEvent.type(imgInput, 'https://example.com/test-square.png');

    await waitFor(() => {
      expect(screen.getByText(/Tỷ lệ ảnh hiện tại là/i)).toBeInTheDocument();
    });

    window.Image = originalImage;
  });

  it('calls onCancel when clicking cancel button', async () => {
    const onCancel = vi.fn();
    render(
      <BannerFormModal
        open={true}
        editData={null}
        loading={false}
        onCancel={onCancel}
        onSubmit={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await userEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
