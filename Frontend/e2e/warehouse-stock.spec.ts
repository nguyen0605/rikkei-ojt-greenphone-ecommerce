import { test, expect } from '@playwright/test';

test('branch import, export, transfer and nested variant allocation agree', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('greenphone.token', `${btoa('{}')}.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.mock`);
    localStorage.setItem('greenphone.user', JSON.stringify({ id: 1, fullName: 'Admin', email: 'admin@example.com', role: 'ADMIN' }));
  });
  const warehouses = [
    { id: 1, code: 'WH-HN-MAIN', name: 'Kho Hà Nội', address: 'Hà Nội', status: 'ACTIVE' },
    { id: 3, code: 'WH-DN-Q1', name: 'Kho Đà Nẵng', address: 'Hải Châu', status: 'ACTIVE' },
  ];
  let main = 60;
  let branch = 0;
  const variant = () => ({ id: 7, phoneId: 11, sku: 'REDMI-XF', ram: '8GB', storage: '256GB', color: 'Xanh', price: 1000000, stockQuantity: main + branch, status: 'ACTIVE' });
  const allocation = (id: number) => {
    const warehouse = warehouses.find((item) => item.id === id)!;
    return { warehouseId: id, warehouseCode: warehouse.code, warehouseName: warehouse.name, warehouseStatus: warehouse.status,
      variantId: 7, phoneId: 11, productName: 'Redmi Note 13 Pro', sku: 'REDMI-XF', ram: '8GB', storage: '256GB', color: 'Xanh',
      quantity: id === 1 ? main : branch, aggregateQuantity: main + branch };
  };
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (!requestUrl.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    const path = requestUrl.pathname;
    const method = route.request().method();
    let data: unknown = [];
    if (path === '/api/v1/admin/warehouses') data = warehouses;
    else if (path === '/api/v1/admin/warehouses/3') data = warehouses[1];
    else if (path === '/api/v1/admin/warehouses/3/stock') data = branch ? [allocation(3)] : [];
    else if (path.endsWith('/stock/movements') && method === 'POST') {
      const body = route.request().postDataJSON();
      branch += body.changeType === 'IMPORT' ? body.quantity : -body.quantity;
      data = variant();
    } else if (path.endsWith('/stock/transfers') && method === 'POST') {
      const body = route.request().postDataJSON(); branch -= body.quantity; main += body.quantity; data = variant();
    } else if (path === '/api/v1/admin/inventory/variants/7/warehouses') data = [allocation(1), allocation(3)];
    else if (path === '/api/admin/phones') data = { content: [{ id: 11, name: 'Redmi Note 13 Pro', brandName: 'Xiaomi', variantCount: 1 }], totalElements: 1 };
    else if (path === '/api/admin/phones/11/variants') data = [variant()];
    else if (path === '/api/cart') data = { items: [], totalItems: 0, totalAmount: 0 };
    await route.fulfill({ json: { code: 200, message: 'Success', data } });
  });
  await page.goto('/admin/warehouses');
  await page.getByRole('button', { name: 'Chi tiết WH-DN-Q1' }).click();
  await expect(page.getByRole('heading', { name: 'Kho Đà Nẵng' })).toBeVisible();
  await page.getByRole('button', { name: 'Nhập sản phẩm', exact: true }).click();
  await page.getByRole('combobox', { name: 'Sản phẩm' }).click();
  await page.getByText('Redmi Note 13 Pro', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Biến thể' }).click();
  await page.getByText('8GB / 256GB / Xanh — REDMI-XF', { exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Số lượng' }).fill('5');
  await page.getByLabel('Lý do').fill('Nhập mới');
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'REDMI-XF' })).toContainText('65');
  await page.getByRole('button', { name: 'Xuất', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Số lượng' }).fill('2');
  await page.getByLabel('Lý do').fill('Xuất bán');
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'REDMI-XF' })).toContainText('63');
  await expect(page.getByRole('button', { name: 'Chuyển kho', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Xuất', exact: true }).click();
  await page.getByRole('combobox', { name: 'Kho nhập' }).click();
  await page.getByText(/WH-HN-MAIN — Kho Hà Nội · Tồn:/).click();
  await page.getByLabel('Lý do').fill('Điều chuyển');
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(main).toBe(61); expect(branch).toBe(2);
  await page.setViewportSize({ width: 1680, height: 1000 });
  await page.locator('.ant-table-content').evaluateAll((elements) => elements.forEach((element) => { element.scrollLeft = 0; }));
  await page.screenshot({ path: testInfo.outputPath('branch-detail-layout.png'), fullPage: true });
  await page.goto('/admin/ton-kho');
  await page.getByRole('button', { name: 'Mở rộng biến thể Redmi Note 13 Pro' }).click();
  await page.locator('.ant-table-row-expand-icon').click();
  await expect(page.locator('tr.ant-table-row').filter({ hasText: 'WH-HN-MAIN' })).toContainText('61');
  await expect(page.locator('tr.ant-table-row').filter({ hasText: 'WH-DN-Q1' })).toContainText('2');
  await page.getByRole('button', { name: 'Nhập', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Kho nhập' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Kho xuất' })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Số lượng' })).toBeVisible();
  await expect(page.getByLabel('Lý do')).toBeVisible();
  await page.getByRole('combobox', { name: 'Kho xuất' }).click();
  await expect(page.getByText(/WH-HN-MAIN — Kho Hà Nội · Tồn: 61/).last()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
});
