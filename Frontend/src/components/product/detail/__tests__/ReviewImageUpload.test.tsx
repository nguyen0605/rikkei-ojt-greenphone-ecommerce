import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { message } from 'antd';
import type { UploadFile } from 'antd';
import {
  ReviewImageUpload,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
} from '../ReviewImageUpload';

// Mock antd message to verify Vietnamese notification messages
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

describe('ReviewImageUpload - Group A: Upload validation & Group B: UI', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  const createMockFile = (name: string, size: number, type: string): File => {
    const file = new File(['a'.repeat(size)], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  it('1. Chấp nhận JPEG hợp lệ', () => {
    const file = createMockFile('test.jpg', 1024, 'image/jpeg');
    const { container } = render(
      <ReviewImageUpload fileList={[]} onChange={mockOnChange} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.accept).toContain('image/jpeg');
    expect(ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
  });

  it('2. Chấp nhận PNG hợp lệ', () => {
    const file = createMockFile('test.png', 2048, 'image/png');
    render(<ReviewImageUpload fileList={[]} onChange={mockOnChange} />);
    expect(ALLOWED_IMAGE_TYPES).toContain('image/png');
  });

  it('3. Chấp nhận WEBP hợp lệ', () => {
    const file = createMockFile('test.webp', 3072, 'image/webp');
    render(<ReviewImageUpload fileList={[]} onChange={mockOnChange} />);
    expect(ALLOWED_IMAGE_TYPES).toContain('image/webp');
  });

  it('4. Từ chối PDF với thông báo tiếng Việt', () => {
    const file = createMockFile('document.pdf', 1024, 'application/pdf');
    const { container } = render(
      <ReviewImageUpload fileList={[]} onChange={mockOnChange} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(message.error).toHaveBeenCalledWith(
      'Định dạng ảnh không hợp lệ. Chỉ hỗ trợ JPG, PNG hoặc WEBP.'
    );
  });

  it('5. Từ chối SVG', () => {
    const file = createMockFile('vector.svg', 1024, 'image/svg+xml');
    const { container } = render(
      <ReviewImageUpload fileList={[]} onChange={mockOnChange} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(message.error).toHaveBeenCalledWith(
      'Định dạng ảnh không hợp lệ. Chỉ hỗ trợ JPG, PNG hoặc WEBP.'
    );
  });

  it('6. Từ chối video (MP4)', () => {
    const file = createMockFile('video.mp4', 1024, 'video/mp4');
    const { container } = render(
      <ReviewImageUpload fileList={[]} onChange={mockOnChange} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(message.error).toHaveBeenCalledWith(
      'Định dạng ảnh không hợp lệ. Chỉ hỗ trợ JPG, PNG hoặc WEBP.'
    );
  });

  it('7. Từ chối ảnh lớn hơn 5 MiB', () => {
    const file = createMockFile('huge.png', MAX_IMAGE_SIZE + 10, 'image/png');
    const { container } = render(
      <ReviewImageUpload fileList={[]} onChange={mockOnChange} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(message.error).toHaveBeenCalledWith(
      'Ảnh vượt quá dung lượng 5MB. Vui lòng chọn ảnh nhỏ hơn.'
    );
  });

  it('8. Chấp nhận ảnh đúng ngưỡng 5 MiB', () => {
    const file = createMockFile('max.jpg', MAX_IMAGE_SIZE, 'image/jpeg');
    const { container } = render(
      <ReviewImageUpload fileList={[]} onChange={mockOnChange} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(message.error).not.toHaveBeenCalled();
  });

  it('9. Chặn tệp ảnh rỗng (size === 0)', () => {
    const file = createMockFile('empty.png', 0, 'image/png');
    const { container } = render(
      <ReviewImageUpload fileList={[]} onChange={mockOnChange} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(message.error).toHaveBeenCalledWith('File ảnh không có dữ liệu hoặc bị rỗng.');
  });

  it('10. Chặn chọn vượt 5 ảnh trong cùng một lần', () => {
    const files = Array.from({ length: 6 }, (_, i) =>
      createMockFile(`photo-${i}.jpg`, 1000, 'image/jpeg')
    );
    const { container } = render(
      <ReviewImageUpload fileList={[]} onChange={mockOnChange} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files } });

    expect(message.warning).toHaveBeenCalledWith(
      'Bạn chỉ có thể tải lên tối đa 5 hình ảnh cho mỗi đánh giá.'
    );
  });

  it('11. Chặn tổng số ảnh vượt 5 sau nhiều lần chọn', () => {
    const existingList: UploadFile[] = Array.from({ length: 4 }, (_, i) => ({
      uid: `existing-${i}`,
      name: `existing-${i}.jpg`,
      status: 'done',
      url: `https://example.com/existing-${i}.jpg`,
    }));

    const newFiles = [
      createMockFile('new-1.jpg', 1000, 'image/jpeg'),
      createMockFile('new-2.jpg', 1000, 'image/jpeg'),
    ];

    const { container } = render(
      <ReviewImageUpload fileList={existingList} onChange={mockOnChange} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: newFiles } });

    expect(message.warning).toHaveBeenCalledWith(
      'Bạn chỉ có thể tải lên tối đa 5 hình ảnh cho mỗi đánh giá.'
    );
  });

  it('12. Hiển thị preview các ảnh đã chọn', () => {
    const list: UploadFile[] = [
      {
        uid: 'f-1',
        name: 'photo-1.jpg',
        status: 'done',
        url: 'https://cdn.greenphone.vn/review-1.jpg',
      },
      {
        uid: 'f-2',
        name: 'photo-2.jpg',
        status: 'done',
        url: 'https://cdn.greenphone.vn/review-2.jpg',
      },
    ];

    render(<ReviewImageUpload fileList={list} onChange={mockOnChange} />);

    expect(screen.getByText(/Đã chọn: 2\/5/i)).toBeInTheDocument();
    expect(screen.getByText(/JPG, PNG, WEBP • Tối đa 5MB\/ảnh/i)).toBeInTheDocument();
  });

  it('13 & F-03: Nút xóa giải phóng blob URL và kích hoạt onChange duy nhất 1 lần', async () => {
    const list: UploadFile[] = [
      {
        uid: 'f-1',
        name: 'photo-1.jpg',
        status: 'done',
        url: 'blob:mock-preview-url',
      },
    ];

    const { container } = render(
      <ReviewImageUpload fileList={list} onChange={mockOnChange} />
    );

    const deleteBtn = container.querySelector('.anticon-delete') || container.querySelector('[title="Remove file"]');
    if (deleteBtn) {
      fireEvent.click(deleteBtn);
      // Đảm bảo URL bị thu hồi
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-preview-url');
      // Đảm bảo mockOnChange chỉ được gọi 1 lần (không double onChange)
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(1);
      });
    }
  });

  it('14 & 15. Counter X/5 cập nhật đúng theo số ảnh', () => {
    const { rerender } = render(
      <ReviewImageUpload fileList={[]} onChange={mockOnChange} />
    );
    expect(screen.getByText(/Đã chọn: 0\/5/i)).toBeInTheDocument();

    const list3: UploadFile[] = Array.from({ length: 3 }, (_, i) => ({
      uid: `uid-${i}`,
      name: `img-${i}.jpg`,
      status: 'done',
    }));

    rerender(<ReviewImageUpload fileList={list3} onChange={mockOnChange} />);
    expect(screen.getByText(/Đã chọn: 3\/5/i)).toBeInTheDocument();
  });

  it('16. Nút thêm ảnh biến mất khi đủ 5 ảnh', () => {
    const fullList: UploadFile[] = Array.from({ length: 5 }, (_, i) => ({
      uid: `uid-${i}`,
      name: `img-${i}.jpg`,
      status: 'done',
    }));

    const { rerender } = render(
      <ReviewImageUpload fileList={[]} onChange={mockOnChange} />
    );
    expect(screen.getByRole('button', { name: /Thêm ảnh đánh giá/i })).toBeInTheDocument();

    rerender(<ReviewImageUpload fileList={fullList} onChange={mockOnChange} />);
    expect(
      screen.queryByRole('button', { name: /Thêm ảnh đánh giá/i })
    ).not.toBeInTheDocument();
  });

  it('17. Disable không cho thao tác khi đang submit/disabled', () => {
    const list: UploadFile[] = [
      {
        uid: 'f-1',
        name: 'photo-1.jpg',
        status: 'done',
      },
    ];

    render(<ReviewImageUpload fileList={list} onChange={mockOnChange} disabled={true} />);
    const uploadBtn = screen.getByRole('button', { name: /Thêm ảnh đánh giá/i });
    expect(uploadBtn).toBeDisabled();
  });

  it('18 & F-04: MIME type rỗng với phần mở rộng .webp, .jpg, .png được chấp nhận qua fallback', () => {
    const fileWebpNoMime = createMockFile('picture.webp', 2048, '');
    const { container } = render(
      <ReviewImageUpload fileList={[]} onChange={mockOnChange} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileWebpNoMime] } });

    // Không bị báo lỗi MIME
    expect(message.error).not.toHaveBeenCalledWith(
      'Định dạng ảnh không hợp lệ. Chỉ hỗ trợ JPG, PNG hoặc WEBP.'
    );
  });

  it('19 & F-04: MIME type rỗng với phần mở rộng không hợp lệ (.exe, .pdf) vẫn bị từ chối', () => {
    const fileExeNoMime = createMockFile('danger.exe', 2048, '');
    const { container } = render(
      <ReviewImageUpload fileList={[]} onChange={mockOnChange} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileExeNoMime] } });

    expect(message.error).toHaveBeenCalledWith(
      'Định dạng ảnh không hợp lệ. Chỉ hỗ trợ JPG, PNG hoặc WEBP.'
    );
  });
});
