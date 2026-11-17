import { test, expect } from '@playwright/test';

for (const role of ['ADMIN', 'SALES', 'MARKETING', 'WAREHOUSE']) {
  test(`dashboard ${role}: requests, charts and exports follow permissions`, async ({ page }) => {
    await page.addInitScript((role) => {
      localStorage.setItem('greenphone.token', `${btoa('{}')}.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.mock`);
      localStorage.setItem('greenphone.user', JSON.stringify({ id: 1, fullName: role, email: 'demo@example.com', role }));
    }, role);
    const calls: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
      const path = new URL(route.request().url()).pathname;
      let data: unknown = [];
      if (path.includes('/statistics/')) calls.push(path);
      if (path.endsWith('/statistics/orders')) data = { totalOrders: 20, processingOrders: 4, shippingOrders: 6, deliveredOrders: 10 };
      if (path.endsWith('/statistics/top-selling')) data = [{ phoneId: 1, phoneName: 'iPhone demo', brandName: 'Apple', soldQuantity: 20 }];
      if (path.endsWith('/statistics/revenue')) data = { totalRevenue: 9000000, timeSeriesData: [{ date: '2026-11-01', revenue: 4000000 }, { date: '2026-11-02', revenue: 5000000 }] };
      if (path.endsWith('/statistics/financial-report')) data = { grossRevenue: 10000000, discountAmount: 1000000, shippingFee: 30000, netRevenue: 9000000, cogs: 6000000, grossProfit: 3000000, profitMarginPercentage: 33.33, refundAmount: 0, uncostedQuantity: 0,
        timeSeriesData: [{ date: '2026-11-01', revenue: 4000000, grossProfit: 1000000 }, { date: '2026-11-02', revenue: 5000000, grossProfit: 2000000 }], paymentMethodStats: [{ paymentMethod: 'VIETQR', revenue: 5000000 }, { paymentMethod: 'COD', revenue: 4000000 }] };
      if (path === '/api/cart') data = { items: [], totalItems: 0, totalAmount: 0 };
      await route.fulfill({ json: { code: 200, data } });
    });
    await page.goto('/admin');
    await expect(page.getByText('iPhone demo')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xuất Excel' })).toBeEnabled();
    if (role === 'ADMIN') {
      await expect(page.getByText('Giá vốn hàng bán (COGS)')).toBeVisible();
      await expect(page.getByRole('img', { name: 'Biểu đồ cơ cấu thanh toán' })).toBeVisible();
    } else {
      await expect(page.getByText('Giá vốn hàng bán (COGS)')).toHaveCount(0);
      expect(calls.some((path) => path.endsWith('/financial-report'))).toBe(false);
    }
    if (role === 'WAREHOUSE') {
      await expect(page.getByText('Doanh thu thuần')).toHaveCount(0);
      await expect(page.getByRole('img', { name: 'Biểu đồ doanh thu theo ngày' })).toHaveCount(0);
      expect(calls.some((path) => path.endsWith('/revenue'))).toBe(false);
    } else {
      await expect(page.locator('.recharts-line-curve').first()).toBeVisible();
      const svg = page.locator('.recharts-wrapper').first(); await svg.hover();
    }
    for (const format of ['Excel', 'PDF']) {
      const download = page.waitForEvent('download'); await page.getByRole('button', { name: `Xuất ${format}` }).click();
      expect((await download).suggestedFilename()).toMatch(format === 'Excel' ? /\.xlsx$/ : /\.pdf$/);
    }
    for (const width of [1440, 1280, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (role === 'ADMIN') await page.screenshot({ path: test.info().outputPath(`dashboard-${width}.png`), fullPage: true, animations: 'disabled' });
    }
    if (role === 'ADMIN') {
      await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
      await expect(page.getByRole('link', { name: 'Tổng quan', exact: true })).toBeVisible();
      await page.getByRole('link', { name: 'Tổng quan', exact: true }).click();
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByRole('button', { name: 'Thu gọn menu', exact: true }).click();
      await expect(page.getByRole('link', { name: 'Tổng quan', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Mở rộng thanh điều hướng' }).click();
    }
    expect(errors).toEqual([]);
  });
}
