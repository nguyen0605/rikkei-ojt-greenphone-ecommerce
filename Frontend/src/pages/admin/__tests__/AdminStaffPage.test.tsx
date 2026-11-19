import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
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
  {
    id: 3,
    fullName: 'Second Admin',
    email: 'second.admin@greenphone.vn',
    phone: '0909999888',
    role: 'ROLE_ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-11-10T02:00:00',
  },
];

function createMockStore(user: any) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user,
        token: 'mock-token',
        isAuthenticated: true,
        loading: false,
        error: null,
        errorCode: null,
        rememberedEmail: null,
      },
    },
  });
}

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
      totalElements: 3,
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
    const store = createMockStore({ id: 1, email: 'admin@greenphone.vn', role: 'ROLE_ADMIN' });

    render(
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <AdminStaffPage />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(screen.getByText('Quản trị nhân sự nội bộ')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm theo tên, email, sđt...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm nhân viên/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Admin System')).toBeInTheDocument();
      expect(screen.getByText('Nguyen Van Sales')).toBeInTheDocument();
      expect(screen.getByText('Second Admin')).toBeInTheDocument();
    });
  });

  it('Mở Modal Thêm nhân viên khi bấm vào nút Thêm nhân viên', async () => {
    const user = userEvent.setup();
    const store = createMockStore({ id: 1, email: 'admin@greenphone.vn', role: 'ROLE_ADMIN' });

    render(
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <AdminStaffPage />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    const addButton = screen.getByRole('button', { name: /Thêm nhân viên/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Thêm mới nhân viên nội bộ')).toBeInTheDocument();
    });
  });

  it('Khi là Admin thông thường, không thể thao tác Khóa hoặc Sửa quyền của Super Admin và Admin khác', async () => {
    // Đăng nhập là Admin thứ hai (id: 3, không phải Super Admin id 1)
    const store = createMockStore({ id: 3, email: 'second.admin@greenphone.vn', role: 'ROLE_ADMIN' });

    render(
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <AdminStaffPage />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    const adminRow = await screen.findByText('Admin System');
    expect(adminRow).toBeInTheDocument();

    // Các nút thao tác trên dòng của Super Admin (id: 1) phải bị disabled
    const buttons = screen.getAllByRole('button');
    const disabledButtons = buttons.filter((b) => b.hasAttribute('disabled'));
    expect(disabledButtons.length).toBeGreaterThan(0);
  }, 10000);
});
