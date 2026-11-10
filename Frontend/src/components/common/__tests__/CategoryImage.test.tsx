import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoryImage from '../CategoryImage';

describe('CategoryImage', () => {
  it('hiển thị thẻ img khi truyền URL ảnh hợp lệ', () => {
    render(
      <CategoryImage
        src="https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/google-pixel.svg"
        alt="Logo Google Pixel"
        brandName="Google Pixel"
      />
    );

    const img = screen.getByRole('img', { name: 'Logo Google Pixel' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev/brands/google-pixel.svg'
    );
  });

  it('chuyển sang fallback placeholder khi tải ảnh bị lỗi (onError)', () => {
    render(
      <CategoryImage
        src="https://invalid-url.com/non-existent-logo.png"
        alt="Logo Hãng Lỗi"
        brandName="Hãng Lỗi"
      />
    );

    const img = screen.getByRole('img', { name: 'Logo Hãng Lỗi' });
    fireEvent.error(img);

    const fallback = screen.getByTestId('category-image-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveTextContent('H');
  });

  it('hiển thị fallback placeholder ngay từ đầu khi URL null hoặc rỗng', () => {
    render(
      <CategoryImage
        src={null}
        alt="Logo Chưa Có"
        brandName="Sony"
      />
    );

    const fallback = screen.getByTestId('category-image-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveTextContent('S');
  });

  it('hỗ trợ accessibility đầy đủ với aria-label trên fallback placeholder', () => {
    render(
      <CategoryImage
        src=""
        alt="Biểu tượng Apple"
        brandName="Apple"
      />
    );

    const fallback = screen.getByRole('img', { name: 'Biểu tượng Apple' });
    expect(fallback).toBeInTheDocument();
  });
});
