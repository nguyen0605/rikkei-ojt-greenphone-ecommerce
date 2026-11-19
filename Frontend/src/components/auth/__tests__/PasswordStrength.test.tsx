import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PasswordStrength, { calculatePasswordStrength } from '@/components/auth/PasswordStrength';

describe('PasswordStrength component & logic', () => {
  it('returns empty result when password is empty', () => {
    const res = calculatePasswordStrength('');
    expect(res.score).toBe(0);
    expect(res.label).toBe('Chưa nhập');
    expect(res.hasMinLength).toBe(false);
    expect(res.hasLetterAndNumber).toBe(false);
    expect(res.hasSpecialChar).toBe(false);
  });

  it('renders nothing when password is empty', () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('calculates criteria correctly for weak passwords lacking characters or length', () => {
    // Only dots: hasSpecialChar is true, but minLength and letterAndNumber are false
    const res = calculatePasswordStrength('.....');
    expect(res.hasMinLength).toBe(false);
    expect(res.hasLetterAndNumber).toBe(false);
    expect(res.hasSpecialChar).toBe(true);
    expect(res.label).toBe('Yếu');
  });

  it('calculates criteria correctly for letter-only password with >= 6 chars', () => {
    const res = calculatePasswordStrength('abcdef');
    expect(res.hasMinLength).toBe(true);
    expect(res.hasLetterAndNumber).toBe(false);
    expect(res.hasSpecialChar).toBe(false);
    expect(res.label).toBe('Yếu');
  });

  it('calculates criteria correctly for strong password with letters, numbers, special chars', () => {
    const res = calculatePasswordStrength('StrongPass123!');
    expect(res.hasMinLength).toBe(true);
    expect(res.hasLetterAndNumber).toBe(true);
    expect(res.hasSpecialChar).toBe(true);
    expect(res.score).toBe(4);
    expect(res.label).toBe('Rất mạnh');
  });

  it('renders password strength card with all 3 checklist items', () => {
    render(<PasswordStrength password="abc" />);

    expect(screen.getByText('Độ mạnh mật khẩu:')).toBeInTheDocument();
    expect(screen.getByText('Tối thiểu 6 ký tự')).toBeInTheDocument();
    expect(screen.getByText('Bao gồm chữ và số')).toBeInTheDocument();
    expect(screen.getByText('Ký tự đặc biệt (tùy chọn)')).toBeInTheDocument();
  });
});
