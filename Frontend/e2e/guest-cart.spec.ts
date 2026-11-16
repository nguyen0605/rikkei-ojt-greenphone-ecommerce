import { test, expect } from '@playwright/test';

test('guest can edit, reload and remove a cart item without cart API requests', async ({ page }) => {
  const cartRequests: string[] = [];
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (!requestUrl.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    const url = route.request().url();
    if (/\/api\/cart(?:\/|$)/.test(url)) cartRequests.push(url);
    const data = /\/brands/.test(url) ? [] : /\/phones/.test(url)
      ? { content: [], totalElements: 0, totalPages: 0 } : {};
    await route.fulfill({ json: { code: 200, message: 'Success', data } });
  });
  await page.goto('/gio-hang');
  await expect(page.getByText('Giỏ hàng trống')).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem('greenphone.guestCart', JSON.stringify([{
      id: 'guest-phone-42', productId: '1', variantId: 42, quantity: 2, addedAt: new Date().toISOString(),
      product: { id: '1', slug: 'guest-phone', name: 'Guest test phone', brand: 'apple',
        category: 'smartphone', price: 1000000, rating: 0, reviewCount: 0, sold: 0,
        images: [], thumbnail: '', colors: [], storage: [], description: '',
        specifications: [], features: [], inStock: true },
    }]));
  });
  await page.reload();
  await expect(page).toHaveURL(/\/gio-hang$/);
  await expect(page.getByText('Guest test phone', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tăng số lượng' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('greenphone.guestCart')!)[0].quantity)).toBe(3);
  await page.reload();
  await expect(page.getByText('3 sản phẩm', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Giảm số lượng' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('greenphone.guestCart')!)[0].quantity)).toBe(2);
  await page.getByRole('button', { name: 'Xóa', exact: true }).click();
  await page.locator('.ant-popconfirm').getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(page.getByText('Giỏ hàng trống')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Giỏ hàng trống')).toBeVisible();
  expect(cartRequests).toEqual([]);
});
