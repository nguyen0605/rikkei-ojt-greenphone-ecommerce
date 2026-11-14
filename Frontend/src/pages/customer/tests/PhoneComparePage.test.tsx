import { cleanup, render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PhoneComparePage from '../PhoneComparePage';
import { phoneComparisonService } from '@/services/phoneComparisonService';
import type { PhoneComparisonResponseDTO } from '@/types/api';

vi.mock('@/services/phoneComparisonService', () => ({
  phoneComparisonService: {
    compare: vi.fn(),
    searchPhones: vi.fn(),
  },
}));

const mockComparisonData: PhoneComparisonResponseDTO = {
  phones: [
    {
      id: 1,
      name: 'iPhone 15 Pro',
      brandId: 10,
      brandName: 'Apple',
      mainImageUrl: 'https://example.com/iphone15pro.jpg',
      minPrice: 28990000,
      maxPrice: 34990000,
      minDiscountPrice: 25990000,
      screen: '6.1 inch, Super Retina XDR OLED',
      os: 'iOS 17',
      chip: 'Apple A17 Pro',
      rearCamera: '48 MP & 12 MP, 12 MP',
      frontCamera: '12 MP',
      battery: '3274 mAh',
      warranty: '12 tháng',
      ramOptions: ['8GB'],
      storageOptions: ['128GB', '256GB'],
      colorOptions: ['Titan Đen', 'Titan Trắng'],
      avgRating: 4.8,
      reviewCount: 42,
      totalStock: 25,
    },
    {
      id: 2,
      name: 'Samsung Galaxy S24 Ultra',
      brandId: 20,
      brandName: 'Samsung',
      mainImageUrl: 'https://example.com/s24ultra.jpg',
      minPrice: 31990000,
      maxPrice: 39990000,
      minDiscountPrice: 29990000,
      screen: '6.8 inch, Dynamic AMOLED 2X',
      os: 'Android 14',
      chip: 'Snapdragon 8 Gen 3',
      rearCamera: '200 MP & 50 MP, 12 MP, 10 MP',
      frontCamera: '12 MP',
      battery: '5000 mAh',
      warranty: '12 tháng',
      ramOptions: ['12GB'],
      storageOptions: ['256GB', '512GB'],
      colorOptions: ['Titan Xám', 'Titan Đen'],
      avgRating: 4.9,
      reviewCount: 38,
      totalStock: 30,
    },
  ],
  specGroups: [
    {
      groupKey: 'general',
      groupName: 'Thông tin chung',
      items: [
        {
          key: 'brand',
          label: 'Hãng',
          values: { 1: 'Apple', 2: 'Samsung' },
          isDifferent: true,
        },
        {
          key: 'warranty',
          label: 'Bảo hành',
          values: { 1: '12 tháng', 2: '12 tháng' },
          isDifferent: false,
        },
      ],
    },
    {
      groupKey: 'display',
      groupName: 'Màn hình',
      items: [
        {
          key: 'screen',
          label: 'Màn hình',
          values: { 1: '6.1 inch, Super Retina XDR OLED', 2: '6.8 inch, Dynamic AMOLED 2X' },
          isDifferent: true,
        },
      ],
    },
  ],
  differencesKeys: ['brand', 'screen'],
};

function renderPage(initialEntry = '/so-sanh') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/so-sanh" element={<PhoneComparePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PhoneComparePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders empty slots when no IDs in URL search params', () => {
    renderPage('/so-sanh');

    expect(screen.getByText('So sánh cấu hình & thông số điện thoại')).toBeInTheDocument();
    expect(screen.getByText('Chưa chọn điện thoại thứ nhất')).toBeInTheDocument();
    expect(screen.getByText('Chưa chọn điện thoại thứ hai')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn đủ 2 điện thoại để bắt đầu so sánh')).toBeInTheDocument();
    expect(phoneComparisonService.compare).not.toHaveBeenCalled();
  });

  it('fetches and displays comparison when valid id1 and id2 are in URL search params', async () => {
    vi.mocked(phoneComparisonService.compare).mockResolvedValue(mockComparisonData);

    renderPage('/so-sanh?id1=1&id2=2');

    expect(phoneComparisonService.compare).toHaveBeenCalledWith([1, 2]);

    await waitFor(() => {
      const slot1 = screen.getByTestId('compare-slot-1');
      expect(within(slot1).getByText('iPhone 15 Pro')).toBeInTheDocument();
      const slot2 = screen.getByTestId('compare-slot-2');
      expect(within(slot2).getByText('Samsung Galaxy S24 Ultra')).toBeInTheDocument();
    });

    // Check spec table rendering
    expect(screen.getByTestId('compare-spec-table')).toBeInTheDocument();
    expect(screen.getByText('Thông tin chung')).toBeInTheDocument();
    expect(screen.getAllByText('Màn hình').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('6.1 inch, Super Retina XDR OLED')).toBeInTheDocument();
    expect(screen.getByText('6.8 inch, Dynamic AMOLED 2X')).toBeInTheDocument();
  });

  it('shows error and blocks comparison when same ID is used for both slots', async () => {
    renderPage('/so-sanh?id1=1&id2=1');

    expect(phoneComparisonService.compare).not.toHaveBeenCalled();
    expect(
      screen.getByText('Không thể so sánh cùng một sản phẩm ở cả hai vị trí.'),
    ).toBeInTheDocument();
  });

  it('filters specifications when "Chỉ xem điểm khác biệt" toggle is clicked', async () => {
    vi.mocked(phoneComparisonService.compare).mockResolvedValue(mockComparisonData);

    renderPage('/so-sanh?id1=1&id2=2');

    await waitFor(() => {
      const slot1 = screen.getByTestId('compare-slot-1');
      expect(within(slot1).getByText('iPhone 15 Pro')).toBeInTheDocument();
    });

    // Initial state: both different and same specs are visible
    expect(screen.getByText('Bảo hành')).toBeInTheDocument();
    expect(screen.getByText('Hãng')).toBeInTheDocument();

    // Click toggle "Chỉ xem điểm khác biệt"
    const toggle = screen.getByTestId('page-toggle-diff');
    fireEvent.click(toggle);

    // After toggle: 'warranty' is not different, so it should be filtered out
    await waitFor(() => {
      expect(screen.queryByText('Bảo hành')).not.toBeInTheDocument();
      expect(screen.getByText('Hãng')).toBeInTheDocument();
    });
  });

  it('swaps phone slots when "Đổi vị trí" button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(phoneComparisonService.compare).mockResolvedValue(mockComparisonData);

    renderPage('/so-sanh?id1=1&id2=2');

    await waitFor(() => {
      const slot1 = screen.getByTestId('compare-slot-1');
      expect(within(slot1).getByText('iPhone 15 Pro')).toBeInTheDocument();
    });

    const swapBtn = screen.getByTestId('swap-phones-btn');
    await user.click(swapBtn);

    // After swap, compare should be called with swapped IDs [2, 1]
    await waitFor(() => {
      expect(phoneComparisonService.compare).toHaveBeenCalledWith([2, 1]);
    });
  });
});
