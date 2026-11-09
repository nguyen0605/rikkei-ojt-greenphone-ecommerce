import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductGallery from '../ProductGallery';

describe('ProductGallery Component', () => {
  const mockImages = [
    { id: 1, imageUrl: 'https://images.unsplash.com/photo-1.jpg' },
    { id: 2, imageUrl: 'https://images.unsplash.com/photo-2.jpg' },
    { id: 3, imageUrl: 'https://images.unsplash.com/photo-3.jpg' },
  ];

  beforeEach(() => {
    // Giả lập matchMedia hỗ trợ hover (desktop)
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('hover: hover'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  describe('Khởi tạo và Render cơ bản', () => {
    it('hiển thị ảnh sản phẩm chính và danh sách thumbnail', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      const mainImg = screen.getByTestId('main-product-image');
      expect(mainImg).toBeInTheDocument();
      expect(mainImg).toHaveAttribute('src', mockImages[0].imageUrl);
      expect(mainImg).toHaveAttribute('alt', 'iPhone 15 Pro Max - Ảnh 1');

      const thumbnails = screen.getAllByRole('button', { name: /Xem ảnh \d+ của iPhone 15 Pro Max/i });
      expect(thumbnails).toHaveLength(3);
    });

    it('ẩn dải thumbnail khi sản phẩm chỉ có 1 ảnh', () => {
      render(
        <ProductGallery
          images={['https://images.unsplash.com/single.jpg']}
          productName="iPhone 15 Pro Max"
        />
      );

      expect(screen.queryByTestId('thumbnail-strip')).not.toBeInTheDocument();
      const mainImg = screen.getByTestId('main-product-image');
      expect(mainImg).toHaveAttribute('src', 'https://images.unsplash.com/single.jpg');
    });

    it('bấm vào thumbnail chuyển đổi ảnh chính tương ứng', () => {
      const handleSelectIndex = vi.fn();
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
          onSelectIndex={handleSelectIndex}
        />
      );

      const thumbnails = screen.getAllByRole('button', { name: /Xem ảnh \d+ của iPhone 15 Pro Max/i });
      fireEvent.click(thumbnails[1]);

      const mainImg = screen.getByTestId('main-product-image');
      expect(mainImg).toHaveAttribute('src', mockImages[1].imageUrl);
      expect(handleSelectIndex).toHaveBeenCalledWith(1);
    });
  });

  describe('Hover Zoom kính lúp', () => {
    it('kích hoạt zoom và scale khi rê chuột trên desktop', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      const container = screen.getByTestId('main-image-container');
      const mainImg = screen.getByTestId('main-product-image');

      // Giả lập kích thước bounding box cho container
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 100,
        width: 400,
        height: 400,
        right: 500,
        bottom: 500,
        x: 100,
        y: 100,
        toJSON: () => {},
      });

      // Mouse enter -> scale 2.2x
      fireEvent.mouseEnter(container);
      expect(mainImg.className).toContain('scale-[2.2]');

      // Mouse move đến tọa độ giữa (200px từ left => 50%, 200px từ top => 50%)
      fireEvent.mouseMove(container, { clientX: 300, clientY: 300 });
      expect(mainImg.style.transformOrigin).toBe('50% 50%');

      // Mouse move đến góc trên bên trái (100px clientX = 0%, 100px clientY = 0%)
      fireEvent.mouseMove(container, { clientX: 100, clientY: 100 });
      expect(mainImg.style.transformOrigin).toBe('0% 0%');

      // Mouse leave -> trở về scale-100 và center center
      fireEvent.mouseLeave(container);
      expect(mainImg.className).toContain('scale-100');
      expect(mainImg.style.transformOrigin).toBe('center center');
    });

    it('không kích hoạt zoom khi thiết bị không hỗ trợ hover (touch device)', () => {
      // Giả lập thiết bị cảm ứng (không có hover pointer)
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      const container = screen.getByTestId('main-image-container');
      const mainImg = screen.getByTestId('main-product-image');

      fireEvent.mouseEnter(container);
      // Vẫn giữ scale-100
      expect(mainImg.className).toContain('scale-100');
    });
  });

  describe('Image Lightbox Modal', () => {
    it('mở lightbox khi bấm vào ảnh chính', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      expect(screen.queryByTestId('lightbox-modal')).not.toBeInTheDocument();

      const mainContainer = screen.getByTestId('main-image-container');
      fireEvent.click(mainContainer);

      expect(screen.getByTestId('lightbox-modal')).toBeInTheDocument();
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('mở lightbox khi bấm nút phóng to góc trên', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      const maximizeBtn = screen.getByRole('button', { name: 'Phóng to ảnh toàn màn hình' });
      fireEvent.click(maximizeBtn);

      expect(screen.getByTestId('lightbox-modal')).toBeInTheDocument();
    });

    it('đóng lightbox khi bấm nút X hoặc phím Escape và phục hồi cuộn trang', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      fireEvent.click(screen.getByTestId('main-image-container'));
      expect(screen.getByTestId('lightbox-modal')).toBeInTheDocument();

      // Bấm nút đóng
      const closeBtn = screen.getByTestId('lightbox-close-button');
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId('lightbox-modal')).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe('');

      // Mở lại và test phím Escape
      fireEvent.click(screen.getByTestId('main-image-container'));
      expect(screen.getByTestId('lightbox-modal')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('lightbox-modal')).not.toBeInTheDocument();
    });

    it('chuyển ảnh bằng nút Next/Prev và phím mũi tên', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      fireEvent.click(screen.getByTestId('main-image-container'));

      const nextBtn = screen.getByTestId('lightbox-next-button');
      const prevBtn = screen.getByTestId('lightbox-prev-button');
      const currentImg = screen.getByTestId('lightbox-current-image');

      expect(currentImg).toHaveAttribute('src', mockImages[0].imageUrl);

      // Bấm Next -> sang ảnh 2
      fireEvent.click(nextBtn);
      expect(screen.getByTestId('lightbox-current-image')).toHaveAttribute('src', mockImages[1].imageUrl);

      // Nhấn ArrowRight -> sang ảnh 3
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByTestId('lightbox-current-image')).toHaveAttribute('src', mockImages[2].imageUrl);

      // Nhấn ArrowRight lần nữa -> quay vòng về ảnh 1
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByTestId('lightbox-current-image')).toHaveAttribute('src', mockImages[0].imageUrl);

      // Bấm Prev -> quay về ảnh 3
      fireEvent.click(prevBtn);
      expect(screen.getByTestId('lightbox-current-image')).toHaveAttribute('src', mockImages[2].imageUrl);

      // Nhấn ArrowLeft -> quay về ảnh 2
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(screen.getByTestId('lightbox-current-image')).toHaveAttribute('src', mockImages[1].imageUrl);
    });

    it('hỗ trợ thao tác vuốt cảm ứng (touch swipe) trong lightbox', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      fireEvent.click(screen.getByTestId('main-image-container'));
      const modal = screen.getByTestId('lightbox-modal');

      // Vuốt sang trái (start 200, move 100 -> delta = +100 > 50 => Next)
      fireEvent.touchStart(modal, { touches: [{ clientX: 200 }] });
      fireEvent.touchMove(modal, { touches: [{ clientX: 100 }] });
      fireEvent.touchEnd(modal);

      expect(screen.getByTestId('lightbox-current-image')).toHaveAttribute('src', mockImages[1].imageUrl);

      // Vuốt sang phải (start 100, move 200 -> delta = -100 < -50 => Prev)
      fireEvent.touchStart(modal, { touches: [{ clientX: 100 }] });
      fireEvent.touchMove(modal, { touches: [{ clientX: 200 }] });
      fireEvent.touchEnd(modal);

      expect(screen.getByTestId('lightbox-current-image')).toHaveAttribute('src', mockImages[0].imageUrl);
    });

    it('xử lý an toàn khi ảnh gặp lỗi tải (Image Error Fallback)', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      const mainImg = screen.getByTestId('main-product-image');
      fireEvent.error(mainImg);

      expect(screen.getByText('Hình ảnh không khả dụng')).toBeInTheDocument();
    });
  });
});

