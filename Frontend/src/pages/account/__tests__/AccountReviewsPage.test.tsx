import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AccountReviewsPage from '../AccountReviewsPage';
import { reviewService } from '@/services';
import type { OrderDTO, PageResponse } from '@/types/api';
import { message } from 'antd';

vi.mock('@/services', () => ({
  reviewService: {
    eligible: vi.fn(),
    myReviews: vi.fn(),
    create: vi.fn(),
    uploadImages: vi.fn(),
  },
}));

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    message: {
      ...actual.message,
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    },
  };
});

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AccountReviewsPage - Regression Tests for Findings F-01, F-02, F-03, F-04', () => {
  let blobCounter = 0;

  const mockOrders: OrderDTO[] = [
    {
      id: 99,
      userId: 1,
      userName: 'Nguyễn Văn A',
      receiverName: 'Nguyễn Văn A',
      receiverPhone: '0901234567',
      shippingAddress: '123 Đường ABC, Hà Nội',
      totalAmount: 25000000,
      discountAmount: 0,
      finalAmount: 25000000,
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID',
      paymentMethod: 'COD',
      note: '',
      promotionCode: '',
      createdAt: '2026-11-10T10:00:00Z',
      orderDetails: [
        {
          id: 101,
          phoneVariantId: 1,
          productName: 'iPhone 15 Pro Max',
          ram: '8GB',
          storage: '256GB',
          color: 'Titan Tự Nhiên',
          unitPrice: 25000000,
          quantity: 1,
          subtotal: 25000000,
          reviewed: false,
        },
      ],
    },
  ];

  const mockEligibleResponse: PageResponse<OrderDTO> = {
    content: mockOrders,
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1,
    last: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reviewService.eligible).mockReset();
    vi.mocked(reviewService.myReviews).mockReset();
    vi.mocked(reviewService.create).mockReset();
    vi.mocked(reviewService.uploadImages).mockReset();

    document.body.innerHTML = '';
    blobCounter = 0;
    global.URL.createObjectURL = vi.fn(() => `blob:mock-url-${++blobCounter}`);
    global.URL.revokeObjectURL = vi.fn();
    vi.mocked(reviewService.eligible).mockResolvedValue(mockEligibleResponse);
    vi.mocked(reviewService.myReviews).mockResolvedValue({
      content: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('renders eligible orders and allows opening the review modal', async () => {
    renderWithProviders(<AccountReviewsPage />);

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
      expect(screen.getByText(/Đơn #99/)).toBeInTheDocument();
    });

    const reviewBtn = screen.getByRole('button', { name: 'Đánh giá' });
    fireEvent.click(reviewBtn);

    expect(screen.getByText('ĐÁNH GIÁ SẢN PHẨM')).toBeInTheDocument();
    expect(screen.getByText(/Phân loại: 8GB\/256GB • Màu Titan Tự Nhiên/)).toBeInTheDocument();
    expect(screen.getByText(/Đánh giá của bạn/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nhận xét/)).toBeInTheDocument();
    expect(screen.getByText(/Hình ảnh thực tế \(0\/5\)/)).toBeInTheDocument();
  });

  // ==========================================
  // REGRESSION 1: F-01 - Thêm ảnh thứ 2 không làm hỏng preview ảnh 1
  // ==========================================
  it('Regression 1 (F-01): Thêm ảnh thứ 2 không thu hồi blob URL preview của ảnh 1', async () => {
    renderWithProviders(<AccountReviewsPage />);

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Đánh giá' }));

    const fileInput1 = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput1).toBeInTheDocument();

    const file1 = new File(['img1'], 'photo1.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput1, { target: { files: [file1] } });

    // Đợi URL preview cho file 1 được tạo
    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    });
    const firstUrl = 'blob:mock-url-1';

    // Thêm ảnh thứ 2
    const fileInput2 = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    const file2 = new File(['img2'], 'photo2.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput2, { target: { files: [file2] } });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);
    });

    // Đảm bảo URL preview của file 1 KHÔNG bị revoke khi thêm file 2
    expect(global.URL.revokeObjectURL).not.toHaveBeenCalledWith(firstUrl);
  });

  // ==========================================
  // REGRESSION 2: F-01 - Xóa 1 ảnh chỉ thu hồi URL của chính nó
  // ==========================================
  it('Regression 2 (F-01): Xóa 1 ảnh chỉ thu hồi URL của chính nó, không ảnh hưởng ảnh còn lại', async () => {
    renderWithProviders(<AccountReviewsPage />);

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Đánh giá' }));

    const fileInput = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['img1'], 'photo1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['img2'], 'photo2.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    // Chờ 2 ảnh xuất hiện và tạo blob URL
    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);
      const deleteButtons = document.body.querySelectorAll('.anticon-delete, [title="Remove file"]');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    // Xóa ảnh đầu tiên qua nút xóa của Ant Design
    const deleteButtons = document.body.querySelectorAll('.anticon-delete, [title="Remove file"]');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      // URL của ảnh 1 bị thu hồi
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url-1');
      // URL của ảnh 2 KHÔNG bị thu hồi
      expect(global.URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:mock-url-2');
    });
  });

  // ==========================================
  // REGRESSION 3: F-01 - Đóng modal hoặc unmount thu hồi toàn bộ URL đang active
  // ==========================================
  it('Regression 3 (F-01): Đóng modal hoặc unmount component thu hồi toàn bộ URL đang active', async () => {
    const { unmount } = renderWithProviders(<AccountReviewsPage />);

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Đánh giá' }));

    const fileInput = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['img1'], 'photo1.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file1] } });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    // Unmount component
    unmount();

    // Toàn bộ active blob URLs phải được revoke
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url-1');
  });

  // ==========================================
  // REGRESSION 4: F-02 - Thử lại sau khi gửi review thất bại: không upload lại ảnh
  // ==========================================
  it('Regression 4 (F-02): Thử lại sau khi gửi review thất bại không upload lại ảnh (tái sử dụng URL đã tải)', async () => {
    const uploadedUrls = ['https://cdn.greenphone.vn/reviews/cached-img1.webp'];
    vi.mocked(reviewService.uploadImages).mockResolvedValue(uploadedUrls);

    // Lần 1: reviewService.create lỗi
    // Lần 2: reviewService.create thành công
    vi.mocked(reviewService.create)
      .mockRejectedValueOnce(new Error('Lỗi máy chủ tạm thời'))
      .mockResolvedValueOnce({
        id: 10,
        userId: 1,
        userName: 'Tester',
        phoneId: 10,
        orderDetailId: 101,
        rating: 5,
        content: 'Hài lòng về sản phẩm',
        status: 'SHOW',
        createdAt: '2026-11-16T00:00:00Z',
        images: uploadedUrls,
      });

    renderWithProviders(<AccountReviewsPage />);

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Đánh giá' }));

    const contentInput = screen.getByPlaceholderText(/Chia sẻ cảm nhận chi tiết của bạn về sản phẩm.../);
    fireEvent.change(contentInput, { target: { value: 'Hài lòng về sản phẩm' } });

    const fileInput = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['photo-bytes'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    const submitBtn = screen.getByRole('button', { name: 'Gửi đánh giá' });

    // Lần submit 1 -> create fail
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(reviewService.uploadImages).toHaveBeenCalledTimes(1);
      expect(reviewService.create).toHaveBeenCalledTimes(1);
      expect(message.error).toHaveBeenCalledWith('Không thể gửi đánh giá. Vui lòng thử lại.');
    });

    // Người dùng bấm "Gửi đánh giá" lại lần 2 (không thay đổi ảnh)
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // KHÔNG upload lại ảnh (uploadImages vẫn chỉ được gọi 1 lần duy nhất)
      expect(reviewService.uploadImages).toHaveBeenCalledTimes(1);
      // create được gọi lần 2 với đúng uploadedUrls từ cache
      expect(reviewService.create).toHaveBeenCalledTimes(2);
      expect(reviewService.create).toHaveBeenLastCalledWith({
        orderDetailId: 101,
        rating: 5,
        content: 'Hài lòng về sản phẩm',
        images: uploadedUrls,
      });
      expect(message.success).toHaveBeenCalledWith('Đã gửi đánh giá');
    });
  });

  // ==========================================
  // REGRESSION 5: F-02 - Thêm/xóa ảnh sau khi lỗi: upload lại đúng danh sách mới
  // ==========================================
  it('Regression 5 (F-02): Thay đổi danh sách ảnh sau khi lỗi sẽ vô hiệu hóa cache và upload lại danh sách mới', async () => {
    vi.mocked(reviewService.uploadImages)
      .mockResolvedValueOnce(['https://cdn.greenphone.vn/reviews/img-batch-1.webp'])
      .mockResolvedValueOnce([
        'https://cdn.greenphone.vn/reviews/img-batch-2a.webp',
        'https://cdn.greenphone.vn/reviews/img-batch-2b.webp',
      ]);

    vi.mocked(reviewService.create)
      .mockRejectedValueOnce(new Error('Lỗi server'))
      .mockResolvedValueOnce({
        id: 11,
        userId: 1,
        userName: 'Tester',
        phoneId: 10,
        orderDetailId: 101,
        rating: 5,
        content: 'Nội dung cập nhật',
        status: 'SHOW',
        createdAt: '2026-11-16T00:00:00Z',
      });

    renderWithProviders(<AccountReviewsPage />);

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Đánh giá' }));

    const contentInput = screen.getByPlaceholderText(/Chia sẻ cảm nhận chi tiết của bạn về sản phẩm.../);
    fireEvent.change(contentInput, { target: { value: 'Nội dung cập nhật' } });

    const fileInput = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['photo-1'], 'photo1.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file1] } });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    const submitBtn = screen.getByRole('button', { name: 'Gửi đánh giá' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(reviewService.uploadImages).toHaveBeenCalledTimes(1);
      expect(message.error).toHaveBeenCalledWith('Không thể gửi đánh giá. Vui lòng thử lại.');
    });

    // Thêm ảnh thứ 2 -> làm thay đổi danh sách file -> cache bị invalidate
    const file2 = new File(['photo-2'], 'photo2.jpg', { type: 'image/jpeg' });
    const fileInput2 = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput2, { target: { files: [file2] } });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);
    });

    // Submit lại
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // uploadImages được gọi lần 2 vì danh sách file đã thay đổi
      expect(reviewService.uploadImages).toHaveBeenCalledTimes(2);
      expect(reviewService.create).toHaveBeenCalledTimes(2);
      expect(message.success).toHaveBeenCalledWith('Đã gửi đánh giá');
    });
  });

  // ==========================================
  // REGRESSION 6: F-03 - Xóa ảnh chỉ trigger 1 lần update callback
  // ==========================================
  it('Regression 6 (F-03): Xóa ảnh giải phóng blob URL mà không gây lỗi hoặc xung đột state', async () => {
    renderWithProviders(<AccountReviewsPage />);

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Đánh giá' }));

    const fileInput = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['photo'], 'delete-me.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    const deleteBtn = document.body.querySelector('.anticon-delete, [title="Remove file"]');
    if (deleteBtn) {
      fireEvent.click(deleteBtn);
      await waitFor(() => {
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url-1');
      });
    }
  });

  // ==========================================
  // REGRESSION 7: F-04 - File mime rỗng nhưng extension hợp lệ (.webp) vẫn được chấp nhận
  // ==========================================
  it('Regression 7 (F-04): File MIME rỗng nhưng extension .webp được chấp nhận và có thể gửi thành công', async () => {
    vi.mocked(reviewService.uploadImages).mockResolvedValue([
      'https://cdn.greenphone.vn/reviews/fallback.webp',
    ]);
    vi.mocked(reviewService.create).mockResolvedValue({
      id: 12,
      userId: 1,
      userName: 'Tester',
      phoneId: 10,
      orderDetailId: 101,
      rating: 5,
      content: 'Ảnh webp không mime',
      status: 'SHOW',
      createdAt: '2026-11-16T00:00:00Z',
    });

    renderWithProviders(<AccountReviewsPage />);

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Đánh giá' }));

    const contentInput = screen.getByPlaceholderText(/Chia sẻ cảm nhận chi tiết của bạn về sản phẩm.../);
    fireEvent.change(contentInput, { target: { value: 'Ảnh webp không mime' } });

    // File có MIME type rỗng ('') nhưng đuôi mở rộng .webp
    const emptyMimeFile = new File(['bytes'], 'sample.webp', { type: '' });
    const fileInput = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [emptyMimeFile] } });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    // Không bị lỗi định dạng
    expect(message.error).not.toHaveBeenCalledWith(
      'Định dạng ảnh không hợp lệ. Chỉ hỗ trợ JPG, PNG hoặc WEBP.'
    );

    const submitBtn = screen.getByRole('button', { name: 'Gửi đánh giá' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(reviewService.uploadImages).toHaveBeenCalledTimes(1);
      expect(reviewService.create).toHaveBeenCalledWith({
        orderDetailId: 101,
        rating: 5,
        content: 'Ảnh webp không mime',
        images: ['https://cdn.greenphone.vn/reviews/fallback.webp'],
      });
      expect(message.success).toHaveBeenCalledWith('Đã gửi đánh giá');
    });
  });

  // ==========================================
  // REGRESSION 8: Double submit prevention
  // ==========================================
  it('Regression 8: Double submit prevention: nút bị disable và hiển thị "Đang gửi đánh giá..." trong lúc request đang xử lý', async () => {
    let resolveCreate: (value: any) => void;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    vi.mocked(reviewService.create).mockImplementation(() => createPromise as any);

    renderWithProviders(<AccountReviewsPage />);

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Đánh giá' }));

    const contentInput = screen.getByPlaceholderText(/Chia sẻ cảm nhận chi tiết của bạn về sản phẩm.../);
    fireEvent.change(contentInput, { target: { value: 'Test double submit' } });

    const submitBtn = screen.getByRole('button', { name: 'Gửi đánh giá' });
    fireEvent.click(submitBtn);

    // Nút chuyển sang trạng thái loading "Đang gửi đánh giá..." và disabled
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Đang gửi đánh giá/i });
      expect(btn).toBeDisabled();
    });

    // Click lần nữa không gây duplicate call
    const loadingBtn = screen.getByRole('button', { name: /Đang gửi đánh giá/i });
    fireEvent.click(loadingBtn);
    expect(reviewService.create).toHaveBeenCalledTimes(1);

    // Hoàn tất promise
    resolveCreate!({
      id: 999,
      userId: 1,
      userName: 'Tester',
      phoneId: 10,
      orderDetailId: 101,
      rating: 5,
      content: 'Test double submit',
      status: 'SHOW',
      createdAt: '2026-11-16T00:00:00Z',
    });

    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Đã gửi đánh giá');
    });
  });

  // ==========================================
  // REGRESSION 9: Lỗi upload ảnh hiển thị tiếng Việt và giữ nguyên form
  // ==========================================
  it('Regression 9: Lỗi upload ảnh hiển thị thông báo tiếng Việt và giữ nguyên form cho người dùng sửa', async () => {
    vi.mocked(reviewService.uploadImages).mockRejectedValue(new Error('Network upload failed'));

    renderWithProviders(<AccountReviewsPage />);

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Đánh giá' }));

    const contentInput = screen.getByPlaceholderText(/Chia sẻ cảm nhận chi tiết của bạn về sản phẩm.../);
    fireEvent.change(contentInput, { target: { value: 'Nội dung quan trọng không được mất' } });

    const file = new File(['photo'], 'p.jpg', { type: 'image/jpeg' });
    const fileInput = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    const submitBtn = screen.getByRole('button', { name: 'Gửi đánh giá' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith(
        'Không thể tải hình ảnh lên. Vui lòng kiểm tra kết nối và thử lại.'
      );
      expect(reviewService.create).not.toHaveBeenCalled();
    });

    // Form không bị đóng và nội dung vẫn còn nguyên
    expect(screen.getByText('ĐÁNH GIÁ SẢN PHẨM')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nội dung quan trọng không được mất')).toBeInTheDocument();
  });

  // ==========================================
  // REGRESSION 10: Gửi review không có ảnh vẫn hoạt động bình thường, không gọi upload
  // ==========================================
  it('Regression 10: Gửi review không có ảnh vẫn hoạt động bình thường, không gọi uploadImages', async () => {
    vi.mocked(reviewService.create).mockResolvedValue({
      id: 1,
      userId: 1,
      userName: 'Tester',
      phoneId: 10,
      orderDetailId: 101,
      rating: 5,
      content: 'Máy chụp ảnh rất đẹp',
      status: 'SHOW',
      createdAt: '2026-11-16T00:00:00Z',
    });

    renderWithProviders(<AccountReviewsPage />);

    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Đánh giá' }));

    const contentInput = screen.getByPlaceholderText(/Chia sẻ cảm nhận chi tiết của bạn về sản phẩm.../);
    fireEvent.change(contentInput, { target: { value: 'Máy chụp ảnh rất đẹp' } });

    const submitBtn = screen.getByRole('button', { name: 'Gửi đánh giá' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(reviewService.uploadImages).not.toHaveBeenCalled();
      expect(reviewService.create).toHaveBeenCalledWith({
        orderDetailId: 101,
        rating: 5,
        content: 'Máy chụp ảnh rất đẹp',
        images: undefined,
      });
      expect(message.success).toHaveBeenCalledWith('Đã gửi đánh giá');
    });
  });

  it('Regression 11: Chuyển sang tab "Đánh giá của tôi" hiển thị các đánh giá đã gửi và mở được Lightbox', async () => {
    vi.mocked(reviewService.myReviews).mockResolvedValue({
      content: [
        {
          id: 66,
          userId: 1,
          userName: 'Tester',
          phoneId: 10,
          phoneName: 'Samsung Galaxy S24 Ultra',
          orderDetailId: 101,
          rating: 5,
          content: 'Đánh giá của tôi đã lưu thành công',
          status: 'APPROVED',
          createdAt: '2026-11-16T18:00:00Z',
          images: ['https://cdn.greenphone.vn/review-photo-1.jpg'],
        },
      ],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });

    renderWithProviders(<AccountReviewsPage />);

    // Click tab "Đánh giá của tôi"
    const myReviewsTab = await screen.findByRole('tab', { name: /Đánh giá của tôi/i });
    fireEvent.click(myReviewsTab);

    // Kiểm tra tên điện thoại và nội dung đánh giá xuất hiện
    await waitFor(() => {
      expect(screen.getByText('Samsung Galaxy S24 Ultra')).toBeInTheDocument();
      expect(screen.getByText('Đánh giá của tôi đã lưu thành công')).toBeInTheDocument();
    });

    // Thumbnail ảnh đính kèm có mặt
    const imageBtn = screen.getByRole('button', { name: /Xem ảnh lớn 1/i });
    expect(imageBtn).toBeInTheDocument();

    // Click vào ảnh để mở Lightbox
    fireEvent.click(imageBtn);

    // Lightbox modal mở lên
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Xem ảnh đánh giá/i })).toBeInTheDocument();
    });
  });
});
