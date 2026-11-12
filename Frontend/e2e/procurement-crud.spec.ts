import { test, expect } from '@playwright/test';
test('supplier create/edit/deactivate and draft PO edit', async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    localStorage.setItem('greenphone.token', `${btoa('{}')}.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.mock`);
    localStorage.setItem('greenphone.user', JSON.stringify({ id: 1, fullName: 'Admin', email: 'admin@example.com', role: 'ADMIN' }));
  });
  let supplier = { id: 3, code: 'SUP-DGW', name: 'Digiworld', taxCode: '', email: '', phone: '', address: '', status: 'ACTIVE' };
  let po = { id: 1, poNumber: 'PO-DRAFT', supplierId: 3, supplierName: 'Digiworld', warehouseId: 2, warehouseName: 'Kho TP.HCM', status: 'DRAFT', totalCost: 500, note: '', createdAt: '2026-11-11T10:00:00',
    items: [{ id: 1, variantId: 7, sku: 'IP16-PRO', quantityOrdered: 50, quantityReceived: 0, unitCost: 10 }] };
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname; const method = route.request().method(); let data: unknown = [];
    if (path === '/api/v1/admin/suppliers') {
      if (method === 'POST') { supplier = { ...supplier, ...route.request().postDataJSON() }; data = supplier; } else data = [supplier];
    } else if (path === '/api/v1/admin/suppliers/3/status') { supplier = { ...supplier, status: route.request().postDataJSON().status }; data = supplier; }
    else if (path === '/api/v1/admin/suppliers/3') { supplier = { ...supplier, ...route.request().postDataJSON() }; data = supplier; }
    else if (path === '/api/v1/admin/warehouses') data = [{ id: 2, code: 'WH-HCM-Q1', name: 'Kho TP.HCM', status: 'ACTIVE' }];
    else if (path === '/api/v1/admin/purchase-orders') data = { content: [po], totalElements: 1 };
    else if (path === '/api/v1/admin/purchase-orders/1') {
      if (method === 'PUT') {
        const body = route.request().postDataJSON(); expect(body.status).toBe('DRAFT');
        po = { ...po, note: body.note, totalCost: body.items[0].quantity * body.items[0].unitCost, items: [{ ...po.items[0], quantityOrdered: body.items[0].quantity }] };
      } data = po;
    } else if (path === '/api/admin/phones') data = { content: [], totalElements: 0 };
    await route.fulfill({ json: { code: 200, data } });
  });
  await page.goto('/admin/suppliers');
  await page.getByRole('button', { name: 'Thêm nhà cung cấp' }).click();
  await page.getByRole('textbox', { name: 'Mã NCC', exact: true }).fill('SUP-NEW');
  await page.getByRole('textbox', { name: 'Tên công ty' }).fill('New supplier');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('New supplier', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sửa SUP-NEW' }).click();
  await page.getByRole('textbox', { name: 'Tên công ty' }).fill('Updated supplier');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Updated supplier', { exact: true })).toBeVisible();
  await page.getByRole('switch', { name: 'Trạng thái SUP-NEW' }).click();
  await page.getByRole('button', { name: 'Ngừng hoạt động', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Trạng thái SUP-NEW' })).not.toBeChecked();
  await page.getByRole('switch', { name: 'Trạng thái SUP-NEW' }).click();
  await expect(page.getByRole('switch', { name: 'Trạng thái SUP-NEW' })).toBeChecked();
  await page.getByRole('button', { name: 'Chi tiết SUP-NEW' }).click();
  await expect(page.getByText('Chi tiết nhà cung cấp', { exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('combobox', { name: 'Sắp xếp NCC' }).click();
  await page.getByText('Mã: Z → A', { exact: true }).click();
  await page.goto('/admin/purchase-orders'); await page.getByRole('button', { name: 'PO-DRAFT', exact: true }).click();
  await page.getByRole('button', { name: 'Sửa PO nháp' }).click();
  await expect(page.getByText('IP16-PRO', { exact: true }).last()).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Số lượng', exact: true }).fill('3');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByRole('heading', { name: 'Chỉnh sửa PO nháp' })).toHaveCount(0);
  await expect(page.getByRole('dialog').getByRole('row').filter({ hasText: 'IP16-PRO' })).toContainText('3');
  expect(po.totalCost).toBe(30);
  await page.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('combobox', { name: 'Sắp xếp PO' }).click();
  await page.getByText('Tổng tiền giảm dần', { exact: true }).click();
  await page.getByRole('button', { name: 'Chi tiết PO-DRAFT' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
