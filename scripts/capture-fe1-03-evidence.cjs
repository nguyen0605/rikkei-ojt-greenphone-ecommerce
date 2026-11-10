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

  // ── 1. Kịch bản 1: Mở PDP iPhone 15 Pro Max & Rê chuột (KHÔNG tự động zoom) ──
  console.log('Scenario 1: Testing No Hover Zoom on PDP...');
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      hasTouch: false,
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/san-pham/1', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="main-image-container"]');

    // Hover lên ảnh
    const container = page.locator('[data-testid="main-image-container"]');
    const box = await container.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: path.join(evidenceDir, '01-pdp-no-hover-zoom.png'),
      fullPage: false,
    });
    console.log('Saved 01-pdp-no-hover-zoom.png');
    await context.close();
  }

  // ── 2. Kịch bản 2: Click mở Lightbox Modal với zoom ban đầu 100% ──
  console.log('Scenario 2: Testing Click-to-Zoom Lightbox at 100%...');
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
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(evidenceDir, '02-lightbox-initial-100.png'),
      fullPage: false,
    });
    console.log('Saved 02-lightbox-initial-100.png');
    await context.close();
  }

  // ── 3. Kịch bản 3: Cuộn chuột / Zoom in lên 200% trong Lightbox ──
  console.log('Scenario 3: Testing Mouse Wheel Zoom in Lightbox...');
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/san-pham/1', { waitUntil: 'networkidle' });
    await page.click('[data-testid="main-image-container"]');
    await page.waitForSelector('[data-testid="lightbox-viewport"]');

    // Cuộn chuột zoom in (hoặc click zoom-in) 5 lần lên 200%
    const viewport = page.locator('[data-testid="lightbox-viewport"]');
    const box = await viewport.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, -500);
      await page.waitForTimeout(600);
    }

    await page.screenshot({
      path: path.join(evidenceDir, '03-lightbox-mouse-wheel-zoom.png'),
      fullPage: false,
    });
    console.log('Saved 03-lightbox-mouse-wheel-zoom.png');
    await context.close();
  }

  // ── 4. Kịch bản 4: Kéo ảnh (Pan/Drag) khi đã zoom ──
  console.log('Scenario 4: Testing Pan / Drag when zoomed...');
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/san-pham/1', { waitUntil: 'networkidle' });
    await page.click('[data-testid="main-image-container"]');
    await page.waitForSelector('[data-testid="lightbox-viewport"]');

    // Zoom in lên 200%
    const zoomInBtn = page.locator('[data-testid="zoom-in-button"]');
    for (let i = 0; i < 5; i++) {
      await zoomInBtn.click();
    }
    await page.waitForTimeout(300);

    // Kéo ảnh từ giữa sang góc
    const viewport = page.locator('[data-testid="lightbox-viewport"]');
    const box = await viewport.boundingBox();
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 150, startY - 100, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(400);
    }

    await page.screenshot({
      path: path.join(evidenceDir, '04-lightbox-pan-drag.png'),
      fullPage: false,
    });
    console.log('Saved 04-lightbox-pan-drag.png');
    await context.close();
  }

  // ── 5. Kịch bản 5: Mobile Responsive Lightbox & Controls ──
  console.log('Scenario 5: Testing Mobile Lightbox with Zoom Controls...');
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/san-pham/1', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="main-image-container"]');

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

  // ── 6. Kịch bản 6: Skeleton Loading ProductsPage ──
  console.log('Scenario 6: Testing ProductsPage Skeleton Loading...');
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // Giữ API /api/phones pending trong 2500ms
    await page.route('**/api/phones*', async (route) => {
      await new Promise((res) => setTimeout(res, 2500));
      await route.continue();
    });

    await page.goto('http://localhost:5173/san-pham');
    await page.waitForSelector('[aria-label="Đang tải danh sách sản phẩm"]');
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(evidenceDir, '06-products-page-skeleton-loading.png'),
      fullPage: false,
    });
    console.log('Saved 06-products-page-skeleton-loading.png');
    await context.close();
  }

  await browser.close();
  console.log('All evidence screenshots successfully updated!');
}

run().catch((err) => {
  console.error('Evidence capture failed:', err);
  process.exit(1);
});
