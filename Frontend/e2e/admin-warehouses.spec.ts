import { test, expect } from '@playwright/test';

test('admin creates, edits and deactivates a branch without reloading', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const token = `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.mock`;
    localStorage.setItem('greenphone.token', token);
    localStorage.setItem('greenphone.user', JSON.stringify({ id: 1, fullName: 'Admin demo', email: 'admin@example.com', role: 'ADMIN' }));
  });
  let rows = [
    { id: 1, code: 'WH-HN-MAIN', name: 'Kho Tổng Hà Nội', address: 'Cầu Giấy, Hà Nội', status: 'ACTIVE', createdAt: '2026-11-10T00:00:00', updatedAt: null },
    { id: 2, code: 'WH-HCM-Q1', name: 'Kho TP.HCM', address: 'Quận 1, TP.HCM', status: 'ACTIVE', createdAt: '2026-11-10T00:00:00', updatedAt: null },
  ];
  let statusRequests = 0;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (!requestUrl.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    const path = requestUrl.pathname;
    let data: unknown = {};
    let status = 200;
    if (path.startsWith('/api/v1/admin/warehouses')) {
      const method = request.method();
      if (method === 'GET') data = rows;
      if (method === 'POST') {
        const body = request.postDataJSON();
        const warehouse = { ...rows[0], ...body, id: 3 };
        rows.push(warehouse);
        data = warehouse;
        status = 201;
      }
      if (method === 'PUT' || method === 'PATCH') {
        const id = Number(path.split('/')[5]);
        const body = request.postDataJSON();
        rows = rows.map((row) => row.id === id ? { ...row, ...body } : row);
        data = rows.find((row) => row.id === id);
        if (method === 'PATCH') statusRequests++;
      }
    } else if (path === '/api/cart') {
      data = { items: [], totalItems: 0, totalAmount: 0 };
    }
    await route.fulfill({ status, json: { code: status, message: 'Success', data } });
  });

  await page.goto('/admin/warehouses');
  await expect(page.getByRole('heading', { name: /Chi nhánh|Quản lý kho/i })).toBeVisible();
  await expect(page.getByText('WH-HN-MAIN', { exact: true })).toBeVisible();
  await expect(page.getByText('WH-HCM-Q1', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Chi nhánh/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('warehouses-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Thêm Chi Nhánh Mới', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Tên kho phải có ít nhất 3 ký tự')).toBeVisible();
  await page.getByLabel('Mã kho', { exact: true }).fill('WH-DN-Q1');
  await page.getByLabel('Tên kho', { exact: true }).fill('Kho Chi Nhánh Đà Nẵng');
  await page.getByLabel('Địa chỉ', { exact: true }).fill('Hải Châu, Đà Nẵng');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('WH-DN-Q1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sửa WH-DN-Q1' }).click();
  await page.getByLabel('Địa chỉ', { exact: true }).fill('Địa chỉ Đà Nẵng mới');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Địa chỉ Đà Nẵng mới', { exact: true })).toBeVisible();
  const toggle = page.getByRole('switch', { name: 'Trạng thái WH-DN-Q1' });
  await toggle.click();
  await expect(page.getByText('Ngừng hoạt động chi nhánh?')).toBeVisible();
  expect(statusRequests).toBe(0);
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  expect(statusRequests).toBe(0);
  await expect(toggle).toBeChecked();
  await toggle.click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(toggle).not.toBeChecked();
  await expect(page.getByRole('row').filter({ hasText: 'WH-DN-Q1' })).toContainText('INACTIVE');
  expect(statusRequests).toBe(1);
  await expect(page.getByText('Ngừng hoạt động chi nhánh?')).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('warehouses-mobile.png'), fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('guest cannot access warehouse administration', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (!requestUrl.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    await route.fulfill({ json: { code: 200, message: 'Success', data: [] } });
  });
  await page.goto('/admin/warehouses');
  await expect(page).toHaveURL(/\/dang-nhap$/);
});
