const path = require('path');
const fs = require('fs');

async function run() {
  const { chromium } = require(path.resolve(__dirname, '../Frontend/node_modules/@playwright/test'));
  console.log('Launching Chromium...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const evidenceDir = path.resolve(__dirname, '../docs/evidence/fe1-03');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  // ── 1. Kịch bản 1: Mở PDP iPhone 15 Pro Max & Rê chuột Hover Zoom ──
  console.log('Scenario 1: Testing Hover Zoom on PDP...');
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      hasTouch: false,
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/san-pham/1', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="main-image-container"]');

    // Hover lên góc trên bên trái cụm camera của ảnh
    const container = page.locator('[data-testid="main-image-container"]');
    const box = await container.boundingBox();
    if (box) {
      // Di chuyển chuột đến vị trí 35% x, 30% y (khu vực cụm camera)
      await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.30);
      await page.waitForTimeout(600);
    }

    await page.screenshot({
      path: path.join(evidenceDir, '01-pdp-image-zoom-hover.png'),
      fullPage: false,
    });
    console.log('Saved 01-pdp-image-zoom-hover.png');
    await context.close();
  }

  // ── 2. Kịch bản 2: Click mở Lightbox & chuyển qua các ảnh bằng mũi tên ──
  console.log('Scenario 2: Testing Lightbox modal navigation...');
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/san-pham/1', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="main-image-container"]');

    // Click vào ảnh để mở Lightbox
    await page.click('[data-testid="main-image-container"]');
    await page.waitForSelector('[data-testid="lightbox-modal"]');
    await page.waitForTimeout(400);

    // Bấm Next chuyển sang ảnh thứ 2
    await page.click('[data-testid="lightbox-next-button"]');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(evidenceDir, '02-lightbox-fullscreen-navigation.png'),
      fullPage: false,
    });
    console.log('Saved 02-lightbox-fullscreen-navigation.png');
    await context.close();
  }

  // ── 3. Kịch bản 3: Giả lập mạng chậm Fast 3G xem Skeleton ProductsPage ──
  console.log('Scenario 3: Testing Skeleton Loading on ProductsPage...');
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // Giữ API /api/phones pending trong 2500ms để chụp trạng thái Skeleton
    await page.route('**/api/phones*', async (route) => {
      await new Promise((res) => setTimeout(res, 2500));
      await route.continue();
    });

    await page.goto('http://localhost:5173/san-pham');
    await page.waitForSelector('[aria-label="Đang tải danh sách sản phẩm"]');
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(evidenceDir, '03-products-page-skeleton-loading.png'),
      fullPage: false,
    });
    console.log('Saved 03-products-page-skeleton-loading.png');
    await context.close();
  }

  // ── 4. Kịch bản 4: Mobile Responsive Lightbox & Gallery ──
  console.log('Scenario 4: Testing Mobile Responsive Gallery & Lightbox...');
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/san-pham/1', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="main-image-container"]');

    // Chụp giao diện Mobile PDP
    await page.screenshot({
      path: path.join(evidenceDir, '04-mobile-pdp-responsive.png'),
      fullPage: false,
    });
    console.log('Saved 04-mobile-pdp-responsive.png');

    // Mở Lightbox trên mobile
    await page.click('[data-testid="main-image-container"]');
    await page.waitForSelector('[data-testid="lightbox-modal"]');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(evidenceDir, '05-mobile-lightbox-fullscreen.png'),
      fullPage: false,
    });
    console.log('Saved 05-mobile-lightbox-fullscreen.png');
    await context.close();
  }

  // ── 5. Kịch bản 5: ProductDetailSkeleton khi PDP đang tải ──
  console.log('Scenario 5: Testing ProductDetailSkeleton...');
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // Giữ API /api/phones/1 pending trong 2500ms
    await page.route('**/api/phones/1', async (route) => {
      await new Promise((res) => setTimeout(res, 2500));
      await route.continue();
    });

    await page.goto('http://localhost:5173/san-pham/1');
    await page.waitForSelector('[aria-label="Đang tải chi tiết sản phẩm"]');
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(evidenceDir, '06-product-detail-skeleton-loading.png'),
      fullPage: false,
    });
    console.log('Saved 06-product-detail-skeleton-loading.png');
    await context.close();
  }

  await browser.close();
  console.log('All 5 evidence screenshots successfully captured in docs/evidence/fe1-03/!');
}

run().catch((err) => {
  console.error('Evidence capture failed:', err);
  process.exit(1);
});

