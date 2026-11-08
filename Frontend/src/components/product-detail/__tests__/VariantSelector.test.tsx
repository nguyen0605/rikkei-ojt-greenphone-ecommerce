import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VariantSelector from '../VariantSelector';
import type { PhoneVariantDTO } from '@/types/api';

const mockVariants: PhoneVariantDTO[] = [
  {
    id: 1,
    phoneId: 1,
    ramItemId: 1,
    storageItemId: 8,
    colorItemId: 22,
    ram: '8GB',
    storage: '256GB',
    color: 'Titan Tự Nhiên',
    price: 34990000,
    discountPrice: 33990000,
    stockQuantity: 24,
    sku: 'IP15PM-256-NAT',
    status: 'ACTIVE',
  },
  {
    id: 2,
    phoneId: 1,
    ramItemId: 1,
    storageItemId: 8,
    colorItemId: 27,
    ram: '8GB',
    storage: '256GB',
    color: 'Titan Đen',
    price: 34990000,
    discountPrice: null,
    stockQuantity: 0, // OUT OF STOCK
    sku: 'IP15PM-256-BLK',
    status: 'ACTIVE',
  },
  {
    id: 3,
    phoneId: 1,
    ramItemId: 1,
    storageItemId: 9,
    colorItemId: 23,
    ram: '8GB',
    storage: '512GB',
    color: 'Titan Xanh',
    price: 39990000,
    discountPrice: 38490000,
    stockQuantity: 15,
    sku: 'IP15PM-512-BLU',
    status: 'ACTIVE',
  },
];

describe('VariantSelector Component', () => {
  it('renders two independent groups for Storage and Color', () => {
    render(
      <VariantSelector
        variants={mockVariants}
        selectedVariantId={1}
        onVariantChange={vi.fn()}
      />
    );

    // Group 1: Storage
    expect(screen.getByText(/Dung lượng:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /256GB/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /512GB/i })).toBeInTheDocument();

    // Group 2: Color
    expect(screen.getByText(/Màu sắc:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Màu Titan Tự Nhiên/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Màu Titan Đen/i })).toBeInTheDocument();
  });

  it('highlights the currently selected variant and shows active storage and color', () => {
    render(
      <VariantSelector
        variants={mockVariants}
        selectedVariantId={1}
        onVariantChange={vi.fn()}
      />
    );

    const storage256 = screen.getByRole('button', { name: /256GB/i });
    expect(storage256).toHaveAttribute('aria-pressed', 'true');

    const swatchNatural = screen.getByRole('button', { name: /Màu Titan Tự Nhiên/i });
    expect(swatchNatural).toHaveAttribute('aria-pressed', 'true');

    // In stock indicator
    expect(screen.getByText(/Còn hàng \(24 sản phẩm sẵn có\)/i)).toBeInTheDocument();
  });

  it('calls onVariantChange when selecting a different storage', () => {
    const handleVariantChange = vi.fn();
    render(
      <VariantSelector
        variants={mockVariants}
        selectedVariantId={1}
        onVariantChange={handleVariantChange}
      />
    );

    const storage512 = screen.getByRole('button', { name: /512GB/i });
    fireEvent.click(storage512);

    expect(handleVariantChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 3,
        storage: '512GB',
        color: 'Titan Xanh',
      })
    );
  });

  it('calls onVariantChange when selecting an available color swatch', () => {
    const handleVariantChange = vi.fn();
    const twoInStockVariants: PhoneVariantDTO[] = [
      mockVariants[0],
      {
        ...mockVariants[1],
        stockQuantity: 10, // Make Titan Đen in stock for 256GB
      },
    ];

    render(
      <VariantSelector
        variants={twoInStockVariants}
        selectedVariantId={1}
        onVariantChange={handleVariantChange}
      />
    );

    const swatchBlack = screen.getByRole('button', { name: /Màu Titan Đen/i });
    fireEvent.click(swatchBlack);

    expect(handleVariantChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 2,
        storage: '256GB',
        color: 'Titan Đen',
      })
    );
  });

  it('disables out-of-stock color swatch for current storage with visual strikethrough and (Hết hàng)', () => {
    const handleVariantChange = vi.fn();
    render(
      <VariantSelector
        variants={mockVariants}
        selectedVariantId={1}
        onVariantChange={handleVariantChange}
      />
    );

    // Titan Đen has stock 0 for 256GB
    const swatchBlack = screen.getByRole('button', { name: /Màu Titan Đen - Hết hàng/i });
    expect(swatchBlack).toBeDisabled();
    expect(swatchBlack).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(swatchBlack);
    expect(handleVariantChange).not.toHaveBeenCalled();
  });

  it('disables color swatch when combination does not exist for current storage', () => {
    const handleVariantChange = vi.fn();
    render(
      <VariantSelector
        variants={mockVariants}
        selectedVariantId={1} // 256GB: Titan Tự Nhiên, Titan Đen exist; Titan Xanh does NOT exist for 256GB
        onVariantChange={handleVariantChange}
      />
    );

    // Titan Xanh only exists in 512GB
    const swatchBlue = screen.getByRole('button', { name: /Màu Titan Xanh - Hết hàng/i });
    expect(swatchBlue).toBeDisabled();

    fireEvent.click(swatchBlue);
    expect(handleVariantChange).not.toHaveBeenCalled();
  });

  it('renders out-of-stock indicator when selected variant has stockQuantity 0', () => {
    render(
      <VariantSelector
        variants={mockVariants}
        selectedVariantId={2} // Variant 2 has stockQuantity 0
        onVariantChange={vi.fn()}
      />
    );

    expect(screen.getByText('Phiên bản này tạm thời hết hàng')).toBeInTheDocument();
  });

  it('renders warning alert and disables selections when all variants are out of stock', () => {
    const allOutOfStock: PhoneVariantDTO[] = mockVariants.map((v) => ({
      ...v,
      stockQuantity: 0,
    }));

    render(
      <VariantSelector
        variants={allOutOfStock}
        selectedVariantId={1}
        onVariantChange={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('Sản phẩm tạm thời hết hàng toàn bộ phiên bản')
    ).toBeInTheDocument();
  });

  it('gracefully renders fallback message when variants list is empty', () => {
    render(
      <VariantSelector
        variants={[]}
        selectedVariantId={null}
        onVariantChange={vi.fn()}
      />
    );

    expect(
      screen.getByText('Sản phẩm chưa có biến thể cấu hình.')
    ).toBeInTheDocument();
  });

  it('allows keyboard navigation across storage buttons', () => {
    const handleVariantChange = vi.fn();
    render(
      <VariantSelector
        variants={mockVariants}
        selectedVariantId={1}
        onVariantChange={handleVariantChange}
      />
    );

    const storage512 = screen.getByRole('button', { name: /512GB/i });
    fireEvent.keyDown(storage512, { key: 'Enter' });
    expect(handleVariantChange).toHaveBeenCalled();

    fireEvent.keyDown(storage512, { key: ' ' });
    expect(handleVariantChange).toHaveBeenCalledTimes(2);
  });

  it('falls back to in-stock variant when changing storage if current color is unavailable', () => {
    const handleVariantChange = vi.fn();
    // Variant 1 has 256GB / Titan Tự Nhiên
    // Only 512GB has Titan Xanh
    render(
      <VariantSelector
        variants={mockVariants}
        selectedVariantId={1}
        onVariantChange={handleVariantChange}
      />
    );

    const storage512 = screen.getByRole('button', { name: /512GB/i });
    fireEvent.click(storage512);

    expect(handleVariantChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 3,
        storage: '512GB',
        color: 'Titan Xanh',
      })
    );
  });
});
