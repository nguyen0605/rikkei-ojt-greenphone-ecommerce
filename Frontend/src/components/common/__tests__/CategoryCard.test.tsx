import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CategoryCard from '../CategoryCard';
import type { BrandDTO } from '@/types/api';

describe('CategoryCard', () => {
  const mockBrand: BrandDTO = {
    id: 1,
    name: 'Apple',
    logoUrl: 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/apple.svg',
    status: 'ACTIVE',
  };

  it('render liên kết tới trang danh mục theo brandId', () => {
    render(
      <MemoryRouter>
        <CategoryCard brand={mockBrand} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/san-pham?brandId=1');
  });

  it('hiển thị tên thương hiệu rõ ràng', () => {
    render(
      <MemoryRouter>
        <CategoryCard brand={mockBrand} />
      </MemoryRouter>
    );

    expect(screen.getByText('Apple')).toBeInTheDocument();
  });
});
