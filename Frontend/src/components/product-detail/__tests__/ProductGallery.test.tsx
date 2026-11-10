import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductGallery from '../ProductGallery';

describe('ProductGallery Component – Click-to-Zoom & Mouse Wheel Zoom', () => {
  const mockImages = [
    { id: 1, imageUrl: 'https://images.unsplash.com/photo-1.jpg' },
    { id: 2, imageUrl: 'https://images.unsplash.com/photo-2.jpg' },
    { id: 3, imageUrl: 'https://images.unsplash.com/photo-3.jpg' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Khởi tạo và Render cơ bản trên PDP', () => {
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

    it('rê chuột (hover) KHÔNG tự động phóng to ảnh trên PDP', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      const container = screen.getByTestId('main-image-container');
      const mainImg = screen.getByTestId('main-product-image');

      // Mouse enter & mouse move trên ảnh
      fireEvent.mouseEnter(container);
      fireEvent.mouseMove(container, { clientX: 200, clientY: 200 });

      // Ảnh không có class scale 2.2x, không bị biến dạng
      expect(mainImg.className).not.toContain('scale-[2.2]');
      expect(container.className).toContain('cursor-pointer');
    });
  });

  describe('Mở Lightbox Modal (Click-to-Zoom)', () => {
    it('mở lightbox khi bấm vào ảnh chính hoặc nút phóng to', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      expect(screen.queryByTestId('lightbox-modal')).not.toBeInTheDocument();

      // Bấm vào ảnh chính
      fireEvent.click(screen.getByTestId('main-image-container'));
      expect(screen.getByTestId('lightbox-modal')).toBeInTheDocument();
      expect(document.body.style.overflow).toBe('hidden');

      // Mức zoom ban đầu là 100%
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('100%');
    });

    it('mở lightbox khi nhấn phím Enter trên ảnh chính', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      const mainContainer = screen.getByTestId('main-image-container');
      fireEvent.keyDown(mainContainer, { key: 'Enter' });

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
  });

  describe('Điều khiển Zoom bằng Con Lăn Chuột & Nút bấm', () => {
    it('cuộn chuột lên tăng zoom và cuộn chuột xuống giảm zoom', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      fireEvent.click(screen.getByTestId('main-image-container'));
      const viewport = screen.getByTestId('lightbox-viewport');
      const currentImg = screen.getByTestId('lightbox-current-image');

      // Cuộn lên (deltaY < 0) -> tăng zoom lên 120%
      fireEvent.wheel(viewport, { deltaY: -100 });
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('120%');
      expect(currentImg.style.transform).toContain('scale(1.2)');

      // Cuộn lên tiếp -> 140%
      fireEvent.wheel(viewport, { deltaY: -100 });
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('140%');

      // Cuộn xuống (deltaY > 0) -> giảm về 120%
      fireEvent.wheel(viewport, { deltaY: 100 });
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('120%');
    });

    it('giới hạn mức zoom trong khoảng 100% đến 400%', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      fireEvent.click(screen.getByTestId('main-image-container'));
      const viewport = screen.getByTestId('lightbox-viewport');

      // Cuộn xuống nhiều lần khi đang ở 100% -> không nhỏ hơn 100%
      for (let i = 0; i < 5; i++) {
        fireEvent.wheel(viewport, { deltaY: 100 });
      }
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('100%');

      // Cuộn lên liên tục -> không vượt quá 400%
      for (let i = 0; i < 25; i++) {
        fireEvent.wheel(viewport, { deltaY: -100 });
      }
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('400%');
    });

    it('hỗ trợ nút phóng to (+), thu nhỏ (-) và phím tắt (+ / - / 0)', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      fireEvent.click(screen.getByTestId('main-image-container'));

      const zoomInBtn = screen.getByTestId('zoom-in-button');
      const zoomOutBtn = screen.getByTestId('zoom-out-button');

      // Click nút zoom in
      fireEvent.click(zoomInBtn);
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('120%');

      // Phím '+' tăng zoom
      fireEvent.keyDown(window, { key: '+' });
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('140%');

      // Phím '-' giảm zoom
      fireEvent.keyDown(window, { key: '-' });
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('120%');

      // Click nút zoom out
      fireEvent.click(zoomOutBtn);
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('100%');

      // Zoom in lại để test nút Reset
      fireEvent.click(zoomInBtn);
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('120%');

      // Click nút Reset zoom
      const resetBtn = screen.getByTestId('reset-zoom-button');
      fireEvent.click(resetBtn);
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('100%');
    });
  });

  describe('Kéo ảnh khi đã zoom (Pan / Drag) & Reset Zoom', () => {
    it('cho phép giữ chuột kéo ảnh khi zoom > 100% và đổi con trỏ sang grab/grabbing', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      fireEvent.click(screen.getByTestId('main-image-container'));
      const viewport = screen.getByTestId('lightbox-viewport');
      const currentImg = screen.getByTestId('lightbox-current-image');

      // Giả lập kích thước viewport
      vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Zoom lên 140%
      fireEvent.click(screen.getByTestId('zoom-in-button'));
      fireEvent.click(screen.getByTestId('zoom-in-button'));
      expect(viewport.className).toContain('cursor-grab');

      // Mousedown để kéo
      fireEvent.mouseDown(viewport, { clientX: 100, clientY: 100 });
      expect(viewport.className).toContain('cursor-grabbing');

      // Mousemove sang vị trí khác (clientX: 150, clientY: 120)
      fireEvent.mouseMove(viewport, { clientX: 150, clientY: 120 });
      expect(currentImg.style.transform).toContain('translate(');

      // Mouseup kết thúc kéo
      fireEvent.mouseUp(viewport);
      expect(viewport.className).toContain('cursor-grab');
    });

    it('tự động reset zoom về 100% và căn giữa khi chuyển ảnh hoặc đóng modal', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      fireEvent.click(screen.getByTestId('main-image-container'));

      // Phóng to ảnh hiện tại lên 160%
      fireEvent.click(screen.getByTestId('zoom-in-button'));
      fireEvent.click(screen.getByTestId('zoom-in-button'));
      fireEvent.click(screen.getByTestId('zoom-in-button'));
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('160%');

      // Bấm Next chuyển sang ảnh tiếp theo
      const nextBtn = screen.getByTestId('lightbox-next-button');
      fireEvent.click(nextBtn);

      // Mức zoom tự động reset về 100%
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('100%');
      const currentImg = screen.getByTestId('lightbox-current-image');
      expect(currentImg.style.transform).toBe('translate(0px, 0px) scale(1)');

      // Phóng to tiếp rồi đóng modal
      fireEvent.click(screen.getByTestId('zoom-in-button'));
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('120%');

      fireEvent.click(screen.getByTestId('lightbox-close-button'));

      // Mở lại Lightbox -> mức zoom vẫn là 100%
      fireEvent.click(screen.getByTestId('main-image-container'));
      expect(screen.getByTestId('zoom-level-indicator')).toHaveTextContent('100%');
    });
  });

  describe('Cử chỉ cảm ứng trên thiết bị di động (Mobile Touch)', () => {
    it('hỗ trợ vuốt chuyển ảnh khi zoom 100%', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      fireEvent.click(screen.getByTestId('main-image-container'));
      const viewport = screen.getByTestId('lightbox-viewport');

      // Vuốt sang trái (start 200, move 100 -> delta = +100 > 50 => Next)
      fireEvent.touchStart(viewport, { touches: [{ clientX: 200 }] });
      fireEvent.touchMove(viewport, { touches: [{ clientX: 100 }] });
      fireEvent.touchEnd(viewport);

      expect(screen.getByTestId('lightbox-current-image')).toHaveAttribute('src', mockImages[1].imageUrl);

      // Vuốt sang phải (start 100, move 200 -> delta = -100 < -50 => Prev)
      fireEvent.touchStart(viewport, { touches: [{ clientX: 100 }] });
      fireEvent.touchMove(viewport, { touches: [{ clientX: 200 }] });
      fireEvent.touchEnd(viewport);

      expect(screen.getByTestId('lightbox-current-image')).toHaveAttribute('src', mockImages[0].imageUrl);
    });

    it('hỗ trợ thao tác kéo ảnh bằng cảm ứng khi zoom > 100%', () => {
      render(
        <ProductGallery
          images={mockImages}
          productName="iPhone 15 Pro Max"
        />
      );

      fireEvent.click(screen.getByTestId('main-image-container'));
      const viewport = screen.getByTestId('lightbox-viewport');
      const currentImg = screen.getByTestId('lightbox-current-image');

      // Zoom lên 140%
      fireEvent.click(screen.getByTestId('zoom-in-button'));
      fireEvent.click(screen.getByTestId('zoom-in-button'));

      // Kéo bằng 1 ngón tay
      fireEvent.touchStart(viewport, { touches: [{ clientX: 100, clientY: 100 }] });
      fireEvent.touchMove(viewport, { touches: [{ clientX: 150, clientY: 120 }] });
      fireEvent.touchEnd(viewport);

      expect(currentImg.style.transform).toContain('translate(');
    });
  });

  describe('Xử lý an toàn khi ảnh lỗi', () => {
    it('hiển thị fallback an toàn khi ảnh gặp lỗi tải', () => {
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
