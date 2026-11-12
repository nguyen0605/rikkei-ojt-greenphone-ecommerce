import { test, expect } from '@playwright/test';
test('admin creates and receives PO into selected warehouse with updated inventory', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('greenphone.token', `${btoa('{}')}.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.mock`);
    localStorage.setItem('greenphone.user', JSON.stringify({ id: 1, fullName: 'Admin', email: 'admin@example.com', role: 'ADMIN' }));
  });
  let received = false;
  let receiveCalls = 0;
  let createCalls = 0;
  const po = () => ({ id: 1, poNumber: 'PO-DEMO-50', supplierId: 3, supplierName: 'Digiworld', warehouseId: 2, warehouseName: 'Kho TP.HCM', status: received ? 'RECEIVED' : 'ORDERED', totalCost: 1250000000, note: '', createdAt: '2026-11-11T10:00:00',
    items: [{ id: 1, variantId: 7, sku: 'IP16-PRO', quantityOrdered: 50, quantityReceived: received ? 50 : 0, unitCost: 25000000 }] });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path === '/api/v1/admin/suppliers') data = [{ id: 3, code: 'SUP-DGW', name: 'Digiworld', status: 'ACTIVE', taxCode: null }];
    else if (path === '/api/v1/admin/warehouses') data = [{ id: 2, name: 'Kho TP.HCM', code: 'WH-HCM-Q1', address: 'Q1', status: 'ACTIVE' }];
    else if (path === '/api/v1/admin/purchase-orders/1/receive') { received = true; receiveCalls++; data = po(); }
    else if (path === '/api/v1/admin/purchase-orders/1') data = po();
    else if (path === '/api/v1/admin/purchase-orders') {
      if (route.request().method() === 'POST') {
        createCalls++;
        expect(route.request().postDataJSON()).toMatchObject({ supplierId: 3, warehouseId: 2, status: 'ORDERED', items: [{ variantId: 7, quantity: 50, unitCost: 25000000 }] });
        data = po();
      } else data = { content: [po()], totalElements: 1 };
    } else if (path === '/api/admin/phones') data = { content: [{ id: 11, name: 'iPhone 16 Pro', brandName: 'Apple', variantCount: 1 }], totalElements: 1 };
    else if (path === '/api/admin/phones/11/variants') data = [{ id: 7, phoneId: 11, sku: 'IP16-PRO', ram: '8GB', storage: '256GB', color: 'Titan Sa Mạc', price: 30000000, stockQuantity: received ? 60 : 10, status: 'ACTIVE' }];
    else if (path === '/api/cart') data = { items: [], totalItems: 0, totalAmount: 0 };
    await route.fulfill({ json: { code: 200, data } });
  });
  await page.goto('/admin/purchase-orders');
  await page.getByRole('button', { name: 'Tạo Đơn Nhập Hàng Mới' }).click();
  await page.getByRole('combobox', { name: 'Nhà cung cấp', exact: true }).click(); await page.getByText('Digiworld', { exact: true }).last().click();
  await page.getByRole('combobox', { name: 'Kho đích' }).click(); await page.getByText('Kho TP.HCM', { exact: true }).last().click();
  await page.getByRole('combobox', { name: 'Chọn sản phẩm' }).click(); await page.getByText('iPhone 16 Pro', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Chọn biến thể' }).click(); await page.getByText(/8GB \/ 256GB \/ Titan Sa Mạc/).click();
  await page.getByRole('spinbutton', { name: 'Số lượng', exact: true }).fill('50');
  await page.getByRole('spinbutton', { name: 'Đơn giá nhập (VND)' }).fill('25000000');
  await page.getByRole('button', { name: 'Tạo Đơn', exact: true }).click({ clickCount: 2 });
  await page.getByRole('button', { name: 'Nhận Hàng Vào Kho' }).click();
  await expect(page.getByText('Thao tác này sẽ tự động cộng dồn số lượng vào tồn kho thực tế và không thể hoàn tác!')).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận nhận hàng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nhận Hàng Vào Kho' })).toHaveCount(0);
  await expect(page.getByText('RECEIVED', { exact: true }).first()).toBeVisible(); expect(receiveCalls).toBe(1); expect(createCalls).toBe(1);
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('link', { name: /Tồn kho$/ }).click();
  await page.getByRole('button', { name: 'Mở rộng biến thể iPhone 16 Pro' }).click();
  await expect(page.locator('tr[data-row-key="7"]').filter({ hasText: 'IP16-PRO' })).toContainText('60');
});
