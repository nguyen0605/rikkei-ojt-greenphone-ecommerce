const path = require('path');
const fs = require('fs');

async function run() {
  console.log('Ensuring sample order statuses in database...');
  try {
    const { execSync } = require('child_process');
    execSync(
      'mysql -u root -p12345678 -e "USE greenphone; UPDATE orders SET order_status = \'PENDING\', payment_status = \'UNPAID\', payment_method = \'VIETQR\' WHERE id = 15; UPDATE orders SET order_status = \'SHIPPING\', payment_status = \'PAID\' WHERE id = 1; UPDATE orders SET order_status = \'DELIVERED\', payment_status = \'PAID\' WHERE id = 3;"',
      { stdio: 'ignore' }
    );
  } catch (e) {
    console.log('MySQL warning:', e.message);
  }

  console.log('Logging in to get JWT token for an.nguyen@example.com...');
  const loginRes = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'an.nguyen@example.com', password: '123456789' }),
  });

  if (!loginRes.ok) {
    throw new Error('Failed to login: ' + loginRes.statusText);
  }

  const loginData = await loginRes.json();
  const token = loginData.data.token;
  const user = {
    id: loginData.data.userId,
    fullName: loginData.data.fullName,
    email: loginData.data.email,
    role: loginData.data.role,
  };

  const { chromium } = require(path.resolve(__dirname, '../Frontend/node_modules/@playwright/test'));
  console.log('Token acquired. Launching Chrome...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const evidenceDir = path.resolve(__dirname, '../docs/evidence/fe2-order-history');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  async function createContext(viewport) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 2,
    });

    await context.addInitScript(({ token, user }) => {
      localStorage.setItem('greenphone.token', token);
      localStorage.setItem('greenphone.user', JSON.stringify(user));
    }, { token, user });

    return context;
  }

  // 1. Desktop - Order History (All Tabs)
  console.log('1. Capturing 01-order-history-desktop.png...');
  {
    const context = await createContext({ width: 1280, height: 850 });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/tai-khoan/don-hang', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(evidenceDir, '01-order-history-desktop.png'),
    });
    await context.close();
  }

  // 2. Desktop - Status Filter (Shipping Tab)
  console.log('2. Capturing 02-order-status-filter.png...');
  {
    const context = await createContext({ width: 1280, height: 850 });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/tai-khoan/don-hang?status=shipping', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(evidenceDir, '02-order-status-filter.png'),
    });
    await context.close();
  }

  // 3. Desktop - Order Detail Timeline
  console.log('3. Capturing 03-order-detail-timeline.png...');
  {
    const context = await createContext({ width: 1280, height: 950 });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/tai-khoan/don-hang/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(evidenceDir, '03-order-detail-timeline.png'),
    });
    await context.close();
  }

  // 4. Desktop - Order Card Actions
  console.log('4. Capturing 04-order-card-actions.png...');
  {
    const context = await createContext({ width: 1280, height: 900 });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/tai-khoan/don-hang', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const card = page.locator('article[data-testid="order-card"]').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(evidenceDir, '04-order-card-actions.png'),
    });
    await context.close();
  }

  // 5. Mobile - Order History (375px)
  console.log('5. Capturing 05-order-history-mobile.png...');
  {
    const context = await createContext({ width: 375, height: 750 });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/tai-khoan/don-hang', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const mainContent = page.locator('main');
    await mainContent.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(evidenceDir, '05-order-history-mobile.png'),
    });
    await context.close();
  }

  // 6. Mobile - Order Detail Timeline (375px)
  console.log('6. Capturing 06-order-detail-mobile.png...');
  {
    const context = await createContext({ width: 375, height: 800 });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/tai-khoan/don-hang/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const mainContent = page.locator('main');
    await mainContent.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(evidenceDir, '06-order-detail-mobile.png'),
    });
    await context.close();
  }

  await browser.close();
  console.log('All 6 high-resolution screenshots generated successfully!');
}

run().catch((err) => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
