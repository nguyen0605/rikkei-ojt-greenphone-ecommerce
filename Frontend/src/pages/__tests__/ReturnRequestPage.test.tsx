import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ReturnRequestPage from '../ReturnRequestPage';
import { returnService } from '@/services/returnService';

// Mock returnService
vi.mock('@/services/returnService', () => ({
  returnService: {
    createRequest: vi.fn(),
    uploadProofImage: vi.fn(),
  },
}));

// Mock react-router-dom useLocation & useNavigate
const mockNavigate = vi.fn();
let mockState: any = {
  orderId: 10,
  phoneVariantId: 100,
  productName: 'iPhone 15 Pro Max 256GB',
  variantSpecs: '8GB • 256GB • Titan Tự Nhiên',
  price: 28990000,
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: mockState,
    }),
  };
});

describe('ReturnRequestPage (WAR-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with order item info from location state', () => {
    render(
      <BrowserRouter>
        <ReturnRequestPage />
      </BrowserRouter>
    );

    expect(screen.getByText('iPhone 15 Pro Max 256GB')).toBeInTheDocument();
    expect(screen.getByText('8GB • 256GB • Titan Tự Nhiên')).toBeInTheDocument();
    expect(screen.getByText('Lỗi 1 đổi 1 máy mới')).toBeInTheDocument();
    expect(screen.getByText('Trả hàng & Hoàn tiền')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gửi yêu cầu đổi trả/i })).toBeInTheDocument();
  });

  it('validates required fields: blocks submit if reason, description or images are missing', async () => {
    render(
      <BrowserRouter>
        <ReturnRequestPage />
      </BrowserRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /Gửi yêu cầu đổi trả/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Vui lòng chọn lý do đổi trả sản phẩm/i)).toBeInTheDocument();
      expect(screen.getByText(/Mô tả chi tiết lỗi phải có ít nhất 10 ký tự/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Bắt buộc tải lên tối thiểu 1 hình ảnh minh chứng lỗi phần cứng/i)
      ).toBeInTheDocument();
    });

    expect(returnService.createRequest).not.toHaveBeenCalled();
  });
});

