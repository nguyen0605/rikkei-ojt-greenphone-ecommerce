import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BrandModal from '../catalog/BrandModal';
import adminCatalogService from '@/services/adminCatalogService';
import type { BrandDTO } from '@/types/api';

vi.mock('@/services/adminCatalogService', () => ({
  default: {
    createBrand: vi.fn(),
    updateBrand: vi.fn(),
    uploadLogo: vi.fn(),
  },
  adminCatalogService: {
    createBrand: vi.fn(),
    updateBrand: vi.fn(),
    uploadLogo: vi.fn(),
  },
}));

const existingBrands: BrandDTO[] = [
  { id: 1, name: 'Apple', logoUrl: 'https://example.com/apple.png', status: 'ACTIVE', productCount: 5 },
  { id: 2, name: 'Samsung', logoUrl: 'https://example.com/samsung.png', status: 'ACTIVE', productCount: 8 },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BrandModal', () => {
  it('renders correctly in create mode', () => {
    render(
      <BrandModal
        open={true}
        onClose={vi.fn()}
        existingBrands={existingBrands}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Thêm thương hiệu mới')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nhập tên thương hiệu/i)).toBeInTheDocument();
  });

  it('shows validation error when brand name is empty', async () => {
    const user = userEvent.setup();
    render(
      <BrandModal
        open={true}
        onClose={vi.fn()}
        existingBrands={existingBrands}
        onSuccess={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Thêm thương hiệu$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Tên thương hiệu không được để trống')).toBeInTheDocument();
    });
  });

  it('validates duplicate brand name against existing brands', async () => {
    const user = userEvent.setup();
    render(
      <BrandModal
        open={true}
        onClose={vi.fn()}
        existingBrands={existingBrands}
        onSuccess={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/Nhập tên thương hiệu/i);
    await user.type(input, 'Apple');

    const submitBtn = screen.getByRole('button', { name: /Thêm thương hiệu$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Tên thương hiệu đã tồn tại trong hệ thống')).toBeInTheDocument();
    });
  });

  it('calls createBrand when valid input is submitted', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    vi.mocked(adminCatalogService.createBrand).mockResolvedValueOnce({
      id: 3,
      name: 'Xiaomi',
      logoUrl: '',
      status: 'ACTIVE',
    });

    render(
      <BrandModal
        open={true}
        onClose={onClose}
        existingBrands={existingBrands}
        onSuccess={onSuccess}
      />
    );

    const input = screen.getByPlaceholderText(/Nhập tên thương hiệu/i);
    await user.type(input, 'Xiaomi');

    const submitBtn = screen.getByRole('button', { name: /Thêm thương hiệu$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(adminCatalogService.createBrand).toHaveBeenCalledWith({
        name: 'Xiaomi',
        logoUrl: undefined,
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('populates fields in edit mode', () => {
    const editingBrand: BrandDTO = {
      id: 1,
      name: 'Apple Inc',
      logoUrl: 'https://example.com/apple-new.png',
      status: 'ACTIVE',
    };

    render(
      <BrandModal
        open={true}
        onClose={vi.fn()}
        editingBrand={editingBrand}
        existingBrands={existingBrands}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Sửa thương hiệu')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Apple Inc')).toBeInTheDocument();
  });
});

