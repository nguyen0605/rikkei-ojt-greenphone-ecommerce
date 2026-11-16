import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import authReducer from '@/store/slices/authSlice';
import cartReducer from '@/store/slices/cartSlice';
import checkoutReducer, { updateShipping } from '@/store/slices/checkoutSlice';
import settingsReducer from '@/store/slices/settingsSlice';
import CheckoutPage from '../CheckoutPage';
import { orderService } from '@/services';
import type { CartItem } from '@/types';

vi.mock('@/services', () => ({
  orderService: {
    create: vi.fn(),
  },
  paymentService: {
    create: vi.fn(),
  },
  phoneService: {
    detail: vi.fn(),
  },
  userService: {
    getAddresses: vi.fn().mockResolvedValue([]),
  },
  promotionService: {
    available: vi.fn().mockResolvedValue([]),
  },
}));

const sampleCartItem: CartItem = {
  id: 'cart-1',
  productId: '100',
  variantId: 1001,
  quantity: 1,
  selectedColor: 'Titan',
  selectedStorage: '256GB',
  addedAt: '2026-11-15T00:00:00.000Z',
  product: {
    id: '100',
    slug: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    brand: 'apple',
    category: 'smartphone',
    price: 28990000,
    rating: 5,
    reviewCount: 0,
    sold: 0,
    images: ['https://example.com/img.jpg'],
    thumbnail: 'https://example.com/img.jpg',
    colors: [],
    storage: [],
    description: '',
    specifications: [],
    features: [],
    inStock: true,
  },
};

function renderCheckout() {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
      checkout: checkoutReducer,
      settings: settingsReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 1, email: 'customer@example.com', fullName: 'Khách Hàng A', role: 'CUSTOMER', phone: '0987654321', avatar: '' },
        token: 'fake-token',
        isAuthenticated: true,
        loading: false,
        error: null,
        errorCode: null,
        rememberedEmail: null,
      },
      cart: {
        items: [sampleCartItem],
        appliedVoucher: null,
      },
    },
  });

  store.dispatch(
    updateShipping({
      fullName: 'Nguyễn Văn Test',
      phone: '0912345678',
      address: '123 Đường Cầu Giấy, Hà Nội',
    })
  );

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <App>
            <MemoryRouter initialEntries={['/thanh-toan']}>
              <Routes>
                <Route path="/thanh-toan" element={<CheckoutPage />} />
              </Routes>
            </MemoryRouter>
          </App>
        </QueryClientProvider>
      </Provider>,
    ),
  };
}

describe('CheckoutPage Corporate VAT Invoice', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('toggles VAT invoice registration form on checkbox change', () => {
    renderCheckout();

    // Checkbox exists
    const checkbox = screen.getByTestId('request-vat-checkbox') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(false);

    // Form inputs not rendered initially
    expect(screen.queryByTestId('vat-company-name-input')).not.toBeInTheDocument();

    // Check the box
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    // Inputs appear
    expect(screen.getByTestId('vat-company-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('vat-tax-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('vat-address-input')).toBeInTheDocument();
  });

  it('validates VAT fields with Zod: blocks next step when fields are empty or MST invalid', async () => {
    renderCheckout();

    // Enable VAT invoice
    const checkbox = screen.getByTestId('request-vat-checkbox');
    fireEvent.click(checkbox);

    // Also check paper invoice request
    const paperCheckbox = screen.getByTestId('include-paper-invoice-checkbox');
    fireEvent.click(paperCheckbox);

    // Click "Tiếp tục xác nhận đơn hàng" without filling VAT fields
    const nextBtn = screen.getByRole('button', { name: /Tiếp tục xác nhận đơn hàng/i });
    fireEvent.click(nextBtn);

    // Error messages should appear
    await waitFor(() => {
      expect(screen.getAllByText(/Tên công ty \/ đơn vị không được để trống/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Mã số thuế không được để trống/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Địa chỉ công ty không được để trống/i).length).toBeGreaterThanOrEqual(1);
    });

    // Enter invalid Tax Code (e.g. 5 digits)
    const taxInput = screen.getByTestId('vat-tax-code-input');
    fireEvent.change(taxInput, { target: { value: '12345' } });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Mã số thuế không hợp lệ/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('proceeds to step 2 and sends VAT info to orderService.create when valid', async () => {
    vi.mocked(orderService.create).mockResolvedValue({ id: 777 } as any);
    renderCheckout();

    // Enable VAT invoice
    const checkbox = screen.getByTestId('request-vat-checkbox');
    fireEvent.click(checkbox);

    // Also check paper invoice request
    const paperCheckbox = screen.getByTestId('include-paper-invoice-checkbox');
    fireEvent.click(paperCheckbox);

    // Fill valid VAT fields
    const companyInput = screen.getByTestId('vat-company-name-input');
    const taxInput = screen.getByTestId('vat-tax-code-input');
    const vatAddressInput = screen.getByTestId('vat-address-input');
    const vatEmailInput = screen.getByTestId('vat-email-input');

    fireEvent.change(companyInput, { target: { value: 'CÔNG TY CP GREEN TECH' } });
    fireEvent.change(taxInput, { target: { value: '0101234567' } });
    fireEvent.change(vatAddressInput, { target: { value: '456 Phố Huế, Hà Nội' } });
    fireEvent.change(vatEmailInput, { target: { value: 'ketoan@greentech.vn' } });

    // Click Next
    const nextBtn = screen.getByRole('button', { name: /Tiếp tục xác nhận đơn hàng/i });
    fireEvent.click(nextBtn);

    // Step 2 confirmation should render VAT summary
    await waitFor(() => {
      expect(screen.getAllByText('Xác nhận đơn hàng').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/CÔNG TY CP GREEN TECH/)).toBeInTheDocument();
      expect(screen.getByText(/0101234567/)).toBeInTheDocument();
    });

    // Place order
    const orderBtn = screen.getByRole('button', { name: /Đặt hàng \(COD\)/i });
    fireEvent.click(orderBtn);

    await waitFor(() => {
      expect(orderService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestInvoice: true,
          includePaperInvoice: true,
          companyName: 'CÔNG TY CP GREEN TECH',
          taxCode: '0101234567',
          companyAddress: '456 Phố Huế, Hà Nội',
          invoiceEmail: 'ketoan@greentech.vn',
        }),
      );
    });
  });
});
