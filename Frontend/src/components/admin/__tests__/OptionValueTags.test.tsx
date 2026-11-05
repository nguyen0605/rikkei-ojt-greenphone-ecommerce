import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OptionValueTags from '../catalog/OptionValueTags';
import adminCatalogService from '@/services/adminCatalogService';
import type { OptionDTO, OptionItemDTO, PhoneDTO } from '@/types/api';

vi.mock('@/services/adminCatalogService', () => ({
  default: {
    createItem: vi.fn(),
    deleteItem: vi.fn(),
    getItemUsage: vi.fn(),
  },
  adminCatalogService: {
    createItem: vi.fn(),
    deleteItem: vi.fn(),
    getItemUsage: vi.fn(),
  },
}));

const colorCategory: OptionDTO = {
  id: 1,
  type: 'COLOR',
  label: 'Màu sắc',
  enabled: true,
  maxItems: 5,
  sortOrder: 1,
};

const colorItems: OptionItemDTO[] = [
  { id: 10, optionId: 1, optionType: 'COLOR', value: 'Titan Đen', hexColor: '#1F1F1F', sortOrder: 1 },
  { id: 11, optionId: 1, optionType: 'COLOR', value: 'Titan Trắng', hexColor: '#E5E5E5', sortOrder: 2 },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  });
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('OptionValueTags', () => {
  it('renders existing color items with their tags and hex codes', () => {
    render(
      <OptionValueTags
        category={colorCategory}
        items={colorItems}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('Titan Đen')).toBeInTheDocument();
    expect(screen.getByText('Titan Trắng')).toBeInTheDocument();
    expect(screen.getByText('(#1F1F1F)')).toBeInTheDocument();
    expect(screen.getByText('(#E5E5E5)')).toBeInTheDocument();
  });

  it('rejects invalid hex color format (not matching #RRGGBB)', async () => {
    const user = userEvent.setup();
    render(
      <OptionValueTags
        category={colorCategory}
        items={colorItems}
        onRefresh={vi.fn()}
      />
    );

    // Type name
    const nameInput = screen.getByPlaceholderText(/Tên màu sắc/i);
    await user.type(nameInput, 'Xanh Neon');

    // Type invalid HEX
    const hexInput = screen.getByPlaceholderText('#8a857e');
    await user.clear(hexInput);
    await user.type(hexInput, 'invalid');

    // Click Add
    const addBtn = screen.getByRole('button', { name: /Thêm màu/i });
    await user.click(addBtn);

    expect(adminCatalogService.createItem).not.toHaveBeenCalled();
  });

  it('successfully creates color with valid hex #8a857e', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    vi.mocked(adminCatalogService.createItem).mockResolvedValueOnce({
      id: 12,
      optionId: 1,
      optionType: 'COLOR',
      value: 'Titan Tự Nhiên',
      hexColor: '#8A857E',
      sortOrder: 3,
    });

    render(
      <OptionValueTags
        category={colorCategory}
        items={colorItems}
        onRefresh={onRefresh}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Tên màu sắc/i);
    await user.type(nameInput, 'Titan Tự Nhiên');

    const hexInput = screen.getByPlaceholderText('#8a857e');
    await user.clear(hexInput);
    await user.type(hexInput, '#8a857e');

    const addBtn = screen.getByRole('button', { name: /Thêm màu/i });
    await user.click(addBtn);

    await waitFor(() => {
      expect(adminCatalogService.createItem).toHaveBeenCalledWith(1, {
        value: 'Titan Tự Nhiên',
        hexColor: '#8A857E',
        sortOrder: 3,
      });
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('shows Foreign Key Warning Modal when deleting item that is in use', async () => {
    const user = userEvent.setup();
    vi.mocked(adminCatalogService.deleteItem).mockRejectedValueOnce(
      new Error('Item is in use by 3 phone(s)')
    );
    vi.mocked(adminCatalogService.getItemUsage).mockResolvedValueOnce({
      content: [
        {
          id: 1,
          name: 'iPhone 15 Pro Max',
          brandName: 'Apple',
          status: 'ACTIVE',
          category: 'SMARTPHONE',
          slug: 'iphone-15-pro-max',
          images: [],
          variants: [],
          description: '',
          warranty: '12 tháng',
        } as unknown as PhoneDTO,
      ],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });

    render(
      <OptionValueTags
        category={colorCategory}
        items={colorItems}
        onRefresh={vi.fn()}
      />
    );

    // Find delete buttons on tags
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    // Ant Design Popconfirm appears
    const confirmBtn = await screen.findByRole('button', { name: /^Xóa$/i });
    await user.click(confirmBtn);

    // Foreign Key Warning Modal appears
    await waitFor(() => {
      expect(screen.getByText('Cảnh Báo Ràng Buộc Khóa Ngoại')).toBeInTheDocument();
      expect(screen.getByText(/Không thể xóa giá trị thuộc tính/i)).toBeInTheDocument();
    });
  });
});
