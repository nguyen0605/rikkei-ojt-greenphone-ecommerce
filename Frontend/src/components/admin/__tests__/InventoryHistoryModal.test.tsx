import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminInventoryService } from '@/services';
import type { InventoryHistoryDTO, PhoneVariantDTO } from '@/types/api';
import InventoryHistoryModal from '../InventoryHistoryModal';

vi.mock('@/services', () => ({ adminInventoryService: { history: vi.fn() } }));

const variant: PhoneVariantDTO = {
  id: 42, phoneId: 1, ramItemId: 1, storageItemId: 2, colorItemId: 3,
  ram: '8GB', storage: '128GB', color: 'Đen', price: 10000000,
  discountPrice: null, stockQuantity: 4, sku: 'TEST-42', status: 'ACTIVE',
};
const clients: QueryClient[] = [];

function renderModal(props: Partial<React.ComponentProps<typeof InventoryHistoryModal>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  clients.push(client);
  const onClose = vi.fn();
  const result = render(
    <QueryClientProvider client={client}>
      <InventoryHistoryModal variant={variant} open onClose={onClose} {...props} />
    </QueryClientProvider>,
  );
  return { ...result, onClose };
}

beforeEach(() => {
  vi.mocked(adminInventoryService.history).mockReset();
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  });
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })));
  // JSDOM cannot measure pseudo-elements used by Ant Design's scrollbars.
  const getComputedStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => getComputedStyle(element));
});

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('InventoryHistoryModal', () => {
  it('loads the selected variant and displays stock and audit details', async () => {
    const createdAt = '2026-11-05T10:00:00';
    const history: InventoryHistoryDTO = {
      variantId: 42, currentStock: 4,
      entries: [
        { id: 1, changeType: 'IMPORT', quantityBefore: 2, quantityChange: 3, quantityAfter: 5,
          reason: 'Nhận hàng mới', changedByUserId: 7, changedByName: 'Admin kho', createdAt },
        { id: 2, changeType: 'EXPORT', quantityBefore: 5, quantityChange: -1, quantityAfter: 4,
          reason: 'Giao đơn hàng', changedByUserId: null, changedByName: 'SYSTEM', createdAt },
      ],
    };
    vi.mocked(adminInventoryService.history).mockResolvedValue(history);
    renderModal();

    const reason = await screen.findByText('Nhận hàng mới');
    expect(adminInventoryService.history).toHaveBeenCalledExactlyOnceWith(42);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Lịch sử kho — 8GB 128GB Đen');
    expect(screen.getByText(/Tồn kho hiện tại:/).querySelector('strong')).toHaveTextContent('4');
    const row = within(reason.closest('tr')!);
    for (const value of ['Nhập kho', '2', '+3', '5', 'Admin kho', new Date(createdAt).toLocaleString('vi-VN')]) {
      expect(row.getByText(value)).toBeInTheDocument();
    }
    const exportRow = within(screen.getByText('Giao đơn hàng').closest('tr')!);
    expect(exportRow.getByText('Xuất kho')).toBeInTheDocument();
    expect(exportRow.getByText('-1')).toBeInTheDocument();
    expect(exportRow.getByText('SYSTEM')).toBeInTheDocument();
  });

  it('shows the empty state and preserves zero stock', async () => {
    vi.mocked(adminInventoryService.history).mockResolvedValue({ variantId: 42, currentStock: 0, entries: [] });
    renderModal();
    await waitFor(() => expect(screen.getByText(/Tồn kho hiện tại:/).querySelector('strong')).toHaveTextContent('0'));
    expect(screen.getByText('Chưa có lịch sử biến động')).toBeInTheDocument();
  });

  it('shows an error when history cannot be loaded', async () => {
    vi.mocked(adminInventoryService.history).mockRejectedValue(new Error('Network unavailable'));
    renderModal();
    expect(await screen.findByText('Không thể tải lịch sử tồn kho')).toBeInTheDocument();
  });

  it('shows loading feedback while waiting for the API', async () => {
    vi.mocked(adminInventoryService.history).mockReturnValue(new Promise(() => {}));
    renderModal();
    await waitFor(() => expect(screen.getByRole('dialog').querySelector('.ant-spin-spinning')).toBeInTheDocument());
    expect(screen.getByText(/Tồn kho hiện tại:/).querySelector('strong')).toHaveTextContent('—');
  });

  it.each([
    { open: false, variant },
    { open: true, variant: null },
  ])('does not request history when open=$open and variant=$variant', (props) => {
    renderModal(props);
    expect(adminInventoryService.history).not.toHaveBeenCalled();
  });

  it('calls onClose when the user closes the modal', async () => {
    vi.mocked(adminInventoryService.history).mockResolvedValue({ variantId: 42, currentStock: 4, entries: [] });
    const { onClose } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
