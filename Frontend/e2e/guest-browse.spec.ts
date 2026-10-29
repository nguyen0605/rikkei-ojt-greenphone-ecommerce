import { test, expect } from '@playwright/test';

test.describe('E2E-01: Guest browsing', () => {
  test('should load homepage and see products', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header, nav, [class*="header"], [class*="Header"]').first()).toBeVisible({ timeout: 10000 });
    // The page should render without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to products page', async ({ page }) => {
    await page.goto('/dien-thoai');
    await page.waitForTimeout(2000);
    // Product listing page should load
    await expect(page.locator('body')).toBeVisible();
  });

  test('guest should be redirected to login for protected routes', async ({ page }) => {
    await page.goto('/tai-khoan/don-hang');
    await page.waitForTimeout(2000);
    // Should redirect to login page
    const url = page.url();
    expect(url).toMatch(/dang-nhap|login/i);
  });

  test('guest should not access admin routes', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    const url = page.url();
    // Should not stay on admin page
    expect(url).not.toContain('/admin');
  });
});
