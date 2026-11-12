import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminStaffPage from '../AdminStaffPage';
import { adminStaffService } from '@/services/adminStaffService';
import type { StaffDTO, PageResponse } from '@/types/api';

vi.mock('@/services/adminStaffService', () => ({
  adminStaffService: {
    list: vi.fn(),
    detail: vi.fn(),
    create: vi.fn(),
    updateRole: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

const mockStaffList: StaffDTO[] = [
  {
    id: 1,
    fullName: 'Admin System',
    email: 'admin@greenphone.vn',
    phone: '0901234567',
    role: 'ROLE_ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-11-10T00:00:00',
  },
  {
    id: 2,
    fullName: 'Nguyen Van Sales',
    email: 'sales@greenphone.vn',
    phone: '0909876543',
    role: 'ROLE_SALES',
    status: 'ACTIVE',
    createdAt: '2026-11-10T01:00:00',
  },
];

describe('AdminStaffPage Component', () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    });

    const pageResponse: PageResponse<StaffDTO> = {
      content: [...mockStaffList],
      page: 0,
      size: 10,
      totalElements: 2,
      totalPages: 1,
      last: true,
    };

    vi.mocked(adminStaffService.list).mockResolvedValue(pageResponse);
  });

  afterEach(() => {
    cleanup();
    client.clear();
  });

  it('Hiển thị tiêu đề, thanh tìm kiếm và nút Thêm nhân viên', async () => {
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminStaffPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Quản trị nhân sự nội bộ')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm theo tên, email, sđt...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm nhân viên/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Admin System')).toBeInTheDocument();
      expect(screen.getByText('Nguyen Van Sales')).toBeInTheDocument();
    });
  });

  it('Mở Modal Thêm nhân viên khi bấm vào nút Thêm nhân viên', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminStaffPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const addButton = screen.getByRole('button', { name: /Thêm nhân viên/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Thêm mới nhân viên nội bộ')).toBeInTheDocument();
      expect(screen.getByLabelText(/Họ và tên nhân viên/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email đăng nhập/i)).toBeInTheDocument();
    });
  });
});
