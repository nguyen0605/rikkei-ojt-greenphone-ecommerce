import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminWarrantyClaimsPage from '../AdminWarrantyClaimsPage';
import { adminWarrantyClaimService } from '@/services';
import type { WarrantyClaimResponseDTO } from '@/types/api';

vi.mock('@/services', () => ({
  adminWarrantyClaimService: {
    list: vi.fn(),
    detail: vi.fn(),
    byCode: vi.fn(),
    byImei: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

const mockClaims: WarrantyClaimResponseDTO[] = [
  {
    id: 11,
    claimCode: 'RMA-20261111-AB12',
    warrantyId: 4,
    imeiNumber: '356938035643809',
    productName: 'iPhone 15 Pro Max',
    customerName: 'Phạm Quốc Hưng',
    customerPhone: '0933221100',
    hardwareIssueType: 'SCREEN',
    issueDescription: 'Loạn cảm ứng góc trên bên phải',
    status: 'SUBMITTED',
    isUnderWarranty: true,
    repairCost: 0,
    resolution: null,
    rejectionReason: null,
    customerNote: null,
    createdByName: 'KTV Kho',
    receivedByName: 'KTV Kho',
    receivedAt: '2026-11-11T08:00:00',
    completedAt: null,
    createdAt: '2026-11-11T08:00:00',
    updatedAt: '2026-11-11T08:00:00',
    warrantyEndDate: '2027-06-01T00:00:00',
    warrantyStatus: 'ACTIVE',
    histories: [
      {
        id: 1,
        fromStatus: null,
        toStatus: 'SUBMITTED',
        action: 'CREATE_CLAIM',
        note: 'Tiếp nhận phiếu tại kho trung tâm',
        performedByName: 'KTV Kho',
        createdAt: '2026-11-11T08:00:00',
      },
    ],
  },
];

describe('AdminWarrantyClaimsPage', () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    vi.mocked(adminWarrantyClaimService.list).mockResolvedValue([...mockClaims]);
  });

  afterEach(() => {
    cleanup();
    client.clear();
  });

  it('hiển thị danh sách phiếu bảo hành IMEI và cho phép tìm kiếm theo số IMEI / RMA', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminWarrantyClaimsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('RMA-20261111-AB12')).toBeInTheDocument();
    expect(screen.getByText('IMEI: 356938035643809')).toBeInTheDocument();
    expect(screen.getByText('Trong hạn BH')).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/Tìm theo IMEI, mã RMA/i),
      'KHONGTONTAI',
    );

    await waitFor(() => {
      expect(screen.queryByText('RMA-20261111-AB12')).not.toBeInTheDocument();
    });
  });
});
