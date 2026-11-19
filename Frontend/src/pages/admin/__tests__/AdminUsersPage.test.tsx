import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminUsersPage from '../AdminUsersPage';
import { adminUserService } from '@/services';
import type { UserDTO, PageResponse } from '@/types/api';

vi.mock('@/services', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    adminUserService: {
      list: vi.fn(),
      getDetail: vi.fn(),
      updateStatus: vi.fn(),
    },
  };
});

const mockCustomerList: UserDTO[] = [
  {
    id: 10,
    fullName: 'Nguyen Van Khach Hang',
    email: 'khachhang@example.com',
    phone: '0901112233',
    role: 'ROLE_CUSTOMER',
    status: 'ACTIVE',
    address: '123 Duong ABC, Quan 1, TP.HCM',
  },
  {
    id: 11,
    fullName: 'Khach Hang Bi Khoa',
    email: 'bikhoa@example.com',
    phone: '0904445566',
    role: 'ROLE_CUSTOMER',
    status: 'BLOCKED',
    address: '456 Duong XYZ, Ha Noi',
  },
  {
    id: 12,
    fullName: 'Khach Hang Chua Kich Hoat',
    email: 'unverified@example.com',
    phone: '0907778899',
    role: 'ROLE_CUSTOMER',
    status: 'UNVERIFIED',
    address: '',
  },
];

function createMockStore() {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { id: 1, email: 'admin@greenphone.vn', fullName: 'Super Admin', role: 'ROLE_ADMIN' },
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

describe('AdminUsersPage Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const mockResponse: PageResponse<UserDTO> = {
      content: mockCustomerList,
      page: 0,
      size: 15,
      totalElements: mockCustomerList.length,
      totalPages: 1,
      last: true,
    };

    vi.mocked(adminUserService.list).mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders customer list with separate status tags and switch toggles', async () => {
    render(
      <Provider store={createMockStore()}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminUsersPage />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(await screen.findByText('Nguyen Van Khach Hang')).toBeInTheDocument();
    expect(screen.getByText('Khach Hang Bi Khoa')).toBeInTheDocument();
    expect(screen.getByText('Khach Hang Chua Kich Hoat')).toBeInTheDocument();

    // Check status tags
    expect(screen.getByText('Hoạt động')).toBeInTheDocument();
    expect(screen.getByText('Bị khóa')).toBeInTheDocument();
    expect(screen.getByText('Chưa kích hoạt')).toBeInTheDocument();

    // Check switches
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBe(3);
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
    expect(switches[1]).toHaveAttribute('aria-checked', 'false');
  });

  it('triggers block confirmation and calls updateStatus with BLOCKED', async () => {
    const user = userEvent.setup();
    vi.mocked(adminUserService.updateStatus).mockResolvedValue({
      ...mockCustomerList[0],
      status: 'BLOCKED',
    });

    render(
      <Provider store={createMockStore()}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminUsersPage />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(await screen.findByText('Nguyen Van Khach Hang')).toBeInTheDocument();

    const switches = screen.getAllByRole('switch');
    await user.click(switches[0]);

    // Check popconfirm popover description
    expect(await screen.findByText(/Khách hàng sẽ bị đăng xuất ngay lập tức/)).toBeInTheDocument();

    // Click confirm button
    const confirmBtn = screen.getByRole('button', { name: 'Khóa tài khoản' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(adminUserService.updateStatus).toHaveBeenCalledWith(10, 'BLOCKED');
    });
  });

  it('triggers unblock confirmation and calls updateStatus with ACTIVE', async () => {
    const user = userEvent.setup();
    vi.mocked(adminUserService.updateStatus).mockResolvedValue({
      ...mockCustomerList[1],
      status: 'ACTIVE',
    });

    render(
      <Provider store={createMockStore()}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminUsersPage />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    expect(await screen.findByText('Khach Hang Bi Khoa')).toBeInTheDocument();

    const switches = screen.getAllByRole('switch');
    await user.click(switches[1]);

    expect(await screen.findByText(/Bạn có chắc muốn mở khóa cho tài khoản/)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Mở khóa' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(adminUserService.updateStatus).toHaveBeenCalledWith(11, 'ACTIVE');
    });
  });

  it('renders correct serial numbers across pagination pages (page 1 is 1-15, page 2 is 16-30)', async () => {
    const user = userEvent.setup();
    const page2Customers: UserDTO[] = [
      {
        id: 20,
        fullName: 'Khach Hang Trang Hai',
        email: 'trang2@example.com',
        phone: '0908889900',
        role: 'ROLE_CUSTOMER',
        status: 'ACTIVE',
        address: '789 Duong Trang 2',
      },
    ];

    vi.mocked(adminUserService.list).mockImplementation(async (params) => {
      if (params?.page === '1') {
        return {
          content: page2Customers,
          page: 1,
          size: 15,
          totalElements: 16,
          totalPages: 2,
          last: true,
        };
      }
      return {
        content: mockCustomerList,
        page: 0,
        size: 15,
        totalElements: 16,
        totalPages: 2,
        last: false,
      };
    });

    render(
      <Provider store={createMockStore()}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminUsersPage />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );

    // Ở trang 1: kiểm tra STT dòng đầu tiên là 1
    expect(await screen.findByText('Nguyen Van Khach Hang')).toBeInTheDocument();
    const cellsWithOne = screen.getAllByText('1');
    expect(cellsWithOne.length).toBeGreaterThanOrEqual(1);

    // Chuyển sang trang 2 bằng cách click nút phân trang '2'
    const page2Button = screen.getByRole('listitem', { name: '2' });
    await user.click(page2Button);

    // Ở trang 2: kiểm tra STT hiển thị là 16 (tiếp nối phân trang 15/trang, thay vì quay về 1)
    expect(await screen.findByText('Khach Hang Trang Hai')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
  });
});
