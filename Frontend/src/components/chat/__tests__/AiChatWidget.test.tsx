import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiChatWidget from '../AiChatWidget';
import { aiService } from '@/services/aiService';

vi.mock('@/services/aiService', () => ({
  aiService: {
    sendMessage: vi.fn(),
  },
}));

describe('AiChatWidget Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  const renderWidget = () => {
    return render(
      <MemoryRouter>
        <AiChatWidget />
      </MemoryRouter>
    );
  };

  it('khoi tao mac dinh o che do MINIMIZED hien thi qua bong tron noi FloatingChatBubble', () => {
    renderWidget();

    // Qua bong tron co aria-label mo khung chat
    const bubbleButton = screen.getByRole('button', { name: /Mở khung trợ lý AI GreenPhone/i });
    expect(bubbleButton).toBeInTheDocument();

    // Khung chat chua bung mo
    expect(screen.queryByRole('dialog', { name: /Khung chat trợ lý AI GreenPhone/i })).not.toBeInTheDocument();
  });

  it('cham vao qua bong tron noi se bung mo khung chat day du EXPANDED', () => {
    renderWidget();

    const bubbleButton = screen.getByRole('button', { name: /Mở khung trợ lý AI GreenPhone/i });
    fireEvent.click(bubbleButton);

    // Dialog khung chat da hien thi
    const dialog = screen.getByRole('dialog', { name: /Khung chat trợ lý AI GreenPhone/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Trợ Lý AI GreenPhone')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Hỏi về tầm giá, pin, camera...')).toBeInTheDocument();
  });

  it('bam nut Thu nho co ve dang qua bong tron noi ma van bao toan 100% tin nhan', () => {
    renderWidget();

    // Mo khung chat
    const bubbleButton = screen.getByRole('button', { name: /Mở khung trợ lý AI GreenPhone/i });
    fireEvent.click(bubbleButton);

    // Kiem tra tin nhan chao mung mac dinh
    expect(screen.getByText(/Dạ GreenPhone xin chào bạn/i)).toBeInTheDocument();

    // Bam nut thu nho
    const minimizeButton = screen.getByTitle('Thu nhỏ thành quả bóng tròn');
    fireEvent.click(minimizeButton);

    // Khung chat co lai, tro ve FloatingChatBubble
    expect(screen.queryByRole('dialog', { name: /Khung chat trợ lý AI GreenPhone/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mở khung trợ lý AI GreenPhone/i })).toBeInTheDocument();

    // Cham lai vao qua bong tron
    fireEvent.click(screen.getByRole('button', { name: /Mở khung trợ lý AI GreenPhone/i }));

    // Tin nhan van con nguyen ven
    expect(screen.getByText(/Dạ GreenPhone xin chào bạn/i)).toBeInTheDocument();
  });

  it('gui tin nhan thanh cong va hien thi phan hoi kem the san pham goi y', async () => {
    vi.mocked(aiService.sendMessage).mockResolvedValueOnce({
      reply: 'Dạ GreenPhone xin gợi ý mẫu Samsung Galaxy S24 chụp ảnh rất đẹp và pin tốt.',
      suggestedPhones: [
        {
          id: 101,
          brandId: 1,
          brandName: 'Samsung',
          name: 'Samsung Galaxy S24',
          description: 'Mẫu flagship mới nhất',
          screen: 'Dynamic AMOLED 2X 6.2 inch',
          os: 'Android 14',
          chip: 'Exynos 2400',
          rearCamera: '50MP + 12MP + 10MP',
          frontCamera: '12MP',
          battery: '4000mAh',
          warranty: '12 tháng',
          status: 'ACTIVE',
          mainImageUrl: 'https://pub-r2.dev/s24.png',
          variantCount: 3,
          avgRating: 4.8,
          lowestPrice: 21000000,
        },
      ],
    });

    renderWidget();

    // Bung mo khung chat
    fireEvent.click(screen.getByRole('button', { name: /Mở khung trợ lý AI GreenPhone/i }));

    const input = screen.getByPlaceholderText('Hỏi về tầm giá, pin, camera...');
    const submitBtn = screen.getByRole('button', { name: 'Gửi tin nhắn' });

    // Nhap cau hoi
    fireEvent.change(input, { target: { value: 'Tư vấn điện thoại Samsung chụp ảnh đẹp' } });
    fireEvent.click(submitBtn);

    // Kiem tra tin nhan nguoi dung da xuat hien
    expect(screen.getByText('Tư vấn điện thoại Samsung chụp ảnh đẹp')).toBeInTheDocument();

    // Cho tin nhan phan hoi tu bot
    await waitFor(() => {
      expect(screen.getByText(/Samsung Galaxy S24 chụp ảnh rất đẹp/i)).toBeInTheDocument();
    });

    // Kiem tra the san pham goi y duoc render
    expect(screen.getByText('Sản phẩm đề xuất cho bạn (1):')).toBeInTheDocument();
    expect(screen.getByText('Samsung Galaxy S24')).toBeInTheDocument();
    expect(screen.getByText('21.000.000 đ')).toBeInTheDocument();
    expect(screen.getByText('Exynos 2400')).toBeInTheDocument();
  });

  it('bam vao quick suggestion pill se tu dong gui cau hoi', async () => {
    vi.mocked(aiService.sendMessage).mockResolvedValueOnce({
      reply: 'Dạ GreenPhone xin giới thiệu các dòng máy pin trâu chơi game mượt mà.',
      suggestedPhones: [],
    });

    renderWidget();

    // Bung mo khung chat
    fireEvent.click(screen.getByRole('button', { name: /Mở khung trợ lý AI GreenPhone/i }));

    const pill = screen.getByText('Điện thoại pin trâu chơi game tốt');
    fireEvent.click(pill);

    // Tin nhan nguoi dung xuat hien
    await waitFor(() => {
      const elements = screen.getAllByText('Điện thoại pin trâu chơi game tốt');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/các dòng máy pin trâu chơi game mượt mà/i)).toBeInTheDocument();
    });
  });

  it('hien thi nut cong (+) de chon anh va hien thi thumbnail preview khi chon tep', async () => {
    // Mock URL.createObjectURL va revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
    window.URL.revokeObjectURL = vi.fn();

    renderWidget();

    // Bung mo khung chat
    fireEvent.click(screen.getByRole('button', { name: /Mở khung trợ lý AI GreenPhone/i }));

    // Nut cong (+) de tai anh
    const uploadButton = screen.getByRole('button', { name: 'Tải ảnh lên' });
    expect(uploadButton).toBeInTheDocument();

    // File input an
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    // Gia lap chon 1 file anh
    const file = new File(['dummy content'], 'galaxy-s24.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Kiem tra thumbnail preview va ten tep xuat hien
    await waitFor(() => {
      expect(screen.getByText('galaxy-s24.jpg')).toBeInTheDocument();
      expect(screen.getByText('Sẵn sàng gửi để AI nhận diện')).toBeInTheDocument();
    });

    // Nut xoa anh hoat dong
    const removeBtn = screen.getByTitle('Xóa ảnh');
    fireEvent.click(removeBtn);

    expect(screen.queryByText('galaxy-s24.jpg')).not.toBeInTheDocument();
  });

  it('ho tro dan anh truc tiep tu clipboard (Ctrl + V) vao o chat', async () => {
    window.URL.createObjectURL = vi.fn(() => 'mock-pasted-blob-url');
    window.URL.revokeObjectURL = vi.fn();

    renderWidget();

    // Bung mo khung chat
    fireEvent.click(screen.getByRole('button', { name: /Mở khung trợ lý AI GreenPhone/i }));

    const input = screen.getByPlaceholderText('Hỏi về tầm giá, pin, camera...');
    const pastedFile = new File(['pasted image data'], 'pasted-screenshot.png', { type: 'image/png' });

    // Gia lap su kien paste file anh
    fireEvent.paste(input, {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => pastedFile,
          },
        ],
      },
    });

    // Kiem tra thumbnail preview anh paste xuat hien
    await waitFor(() => {
      expect(screen.getByText('pasted-screenshot.png')).toBeInTheDocument();
      expect(screen.getByText('Sẵn sàng gửi để AI nhận diện')).toBeInTheDocument();
    });
  });
});
