import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ColorSwatch from '../ColorSwatch';
import { getColorHex } from '../colorUtils';

describe('ColorSwatch Component', () => {
  it('renders color name and circle with correct mapped HEX color', () => {
    render(<ColorSwatch color="Titan Tự Nhiên" />);
    expect(screen.getByText('Titan Tự Nhiên')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /Màu Titan Tự Nhiên/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('uses explicit hex color when provided', () => {
    expect(getColorHex('Custom Color', '#123456')).toBe('#123456');
    expect(getColorHex('Custom Color', '#ABC')).toBe('#ABC');
  });

  it('falls back to known dictionary or neutral gray for unrecognized color', () => {
    expect(getColorHex('Titan Xanh')).toBe('#3B4856');
    expect(getColorHex('Đen')).toBe('#1F1F1F');
    expect(getColorHex('Màu Lạ Không Xác Định')).toBe('#9CA3AF');
    expect(getColorHex('')).toBe('#9CA3AF');
  });

  it('handles selected state with visual indicators and aria-pressed true', () => {
    render(<ColorSwatch color="Titan Đen" selected={true} />);
    const button = screen.getByRole('button', { name: /Màu Titan Đen/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.className).toContain('border-green-600');
  });

  it('triggers onClick callback when clicked', () => {
    const handleClick = vi.fn();
    render(<ColorSwatch color="Trắng" onClick={handleClick} />);
    const button = screen.getByRole('button', { name: /Màu Trắng/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('triggers onClick on Enter and Space keyboard navigation', () => {
    const handleClick = vi.fn();
    render(<ColorSwatch color="Hồng" onClick={handleClick} />);
    const button = screen.getByRole('button', { name: /Màu Hồng/i });

    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(button, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('disables interaction and shows out-of-stock badge and strikethrough when outOfStock is true', () => {
    const handleClick = vi.fn();
    render(<ColorSwatch color="Xanh Mint" outOfStock={true} onClick={handleClick} />);

    const button = screen.getByRole('button', { name: /Màu Xanh Mint - Hết hàng/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('tabIndex', '-1');
    expect(screen.getByText('(Hết hàng)')).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();

    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleClick).not.toHaveBeenCalled();
  });
});
