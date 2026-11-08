const { chromium } = require('d:/IT/RIKKEI/rikkei-ojt-greenphone-ecommerce/rikkei-ojt-greenphone-ecommerce/Frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve('d:/IT/RIKKEI/rikkei-ojt-greenphone-ecommerce/rikkei-ojt-greenphone-ecommerce/docs/evidence/fe1-01-variant-selector');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate simple clean SVG phone illustrations as Data URIs for mock gallery
function createPhoneSvgDataUri(colorHex, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="400" height="480">
    <rect width="400" height="480" fill="#f8fafc" rx="24"/>
    <!-- Phone body -->
    <rect x="80" y="30" width="240" height="420" rx="36" fill="${colorHex}" stroke="#cbd5e1" stroke-width="4"/>
    <!-- Phone screen -->
    <rect x="94" y="44" width="212" height="392" rx="26" fill="#0f172a"/>
    <!-- Dynamic island -->
    <rect x="160" y="56" width="80" height="18" rx="9" fill="#000000"/>
    <!-- Screen content wallpaper gradient -->
    <defs>
      <linearGradient id="g_${label}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colorHex}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect x="100" y="80" width="200" height="348" rx="20" fill="url(#g_${label})"/>
    <text x="200" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle">iPhone 15 Pro Max</text>
    <text x="200" y="290" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="#e2e8f0" text-anchor="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const naturalImg = createPhoneSvgDataUri('#9A958D', 'Titan Tự Nhiên');
const blueImg = createPhoneSvgDataUri('#3B4856', 'Titan Xanh');
const blackImg = createPhoneSvgDataUri('#2E2C2F', 'Titan Đen');
const whiteImg = createPhoneSvgDataUri('#E3E4E5', 'Titan Trắng');

const mockPhoneDetail = {
  id: 1,
  name: 'iPhone 15 Pro Max 256GB Chính Hãng VN/A',
  brandId: 1,
  brandName: 'Apple',
  description: 'iPhone 15 Pro Max với thiết kế titan siêu bền và nhẹ, viền màn hình mỏng nhất từng có trên iPhone. Trang bị nút tác vụ Action button linh hoạt, chip Apple A17 Pro tiến trình 3nm đỉnh cao và camera tiềm vọng 5x zoom quang học.',
  screen: '6.7 inch Super Retina XDR OLED 120Hz',
  os: 'iOS 17',
  chip: 'Apple A17 Pro 6 nhân',
  rearCamera: 'Chính 48 MP & Phụ 12 MP, 12 MP (Zoom quang học 5x)',
  frontCamera: '12 MP TrueDepth',
  battery: '4422 mAh, Sạc nhanh 20W, MagSafe 15W',
  warranty: '12 tháng chính hãng Apple Việt Nam',
  status: 'ACTIVE',
  mainImageUrl: naturalImg,
  variantCount: 5,
  avgRating: 4.9,
  reviewCount: 42,
  lowestPrice: 33990000,
  images: [
    {
      id: 101,
      phoneId: 1,
      imageUrl: naturalImg,
      isMain: true,
      displayOrder: 1,
    },
    {
      id: 102,
      phoneId: 1,
      imageUrl: blueImg,
      isMain: false,
      displayOrder: 2,
    },
    {
      id: 103,
      phoneId: 1,
      imageUrl: blackImg,
      isMain: false,
      displayOrder: 3,
    },
    {
      id: 104,
      phoneId: 1,
      imageUrl: whiteImg,
      isMain: false,
      displayOrder: 4,
    },
  ],
  variants: [
    {
      id: 1,
      phoneId: 1,
      ramItemId: 1,
      storageItemId: 8,
      colorItemId: 22,
      ram: '8GB',
      storage: '256GB',
      color: 'Titan Tự Nhiên',
      price: 34990000,
      discountPrice: 33990000,
      stockQuantity: 24,
      sku: 'IP15PM-256-NAT',
      status: 'ACTIVE',
    },
    {
      id: 2,
      phoneId: 1,
      ramItemId: 1,
      storageItemId: 8,
      colorItemId: 27,
      ram: '8GB',
      storage: '256GB',
      color: 'Titan Đen',
      price: 34990000,
      discountPrice: null,
      stockQuantity: 0, // OUT OF STOCK
      sku: 'IP15PM-256-BLK',
      status: 'ACTIVE',
    },
    {
      id: 3,
      phoneId: 1,
      ramItemId: 1,
      storageItemId: 9,
      colorItemId: 23,
      ram: '8GB',
      storage: '512GB',
      color: 'Titan Xanh',
      price: 40990000,
      discountPrice: 38490000,
      stockQuantity: 15,
      sku: 'IP15PM-512-BLU',
      status: 'ACTIVE',
    },
    {
      id: 4,
      phoneId: 1,
      ramItemId: 1,
      storageItemId: 9,
      colorItemId: 22,
      ram: '8GB',
      storage: '512GB',
      color: 'Titan Tự Nhiên',
      price: 40990000,
      discountPrice: null,
      stockQuantity: 8,
      sku: 'IP15PM-512-NAT',
      status: 'ACTIVE',
    },
    {
      id: 5,
      phoneId: 1,
      ramItemId: 1,
      storageItemId: 10,
      colorItemId: 24,
      ram: '8GB',
      storage: '1TB',
      color: 'Titan Trắng',
      price: 46990000,
      discountPrice: 44990000,
      stockQuantity: 5,
      sku: 'IP15PM-1TB-WHT',
      status: 'ACTIVE',
    },
  ],
};

async function setupMocks(page, customPhoneDetail = mockPhoneDetail) {
  await page.route('**/api/phones/1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        message: 'Success',
        data: customPhoneDetail,
      }),
    });
  });

  await page.route('**/api/reviews/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        message: 'Success',
        data: {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 10,
          number: 0,
        },
      }),
    });
  });

  await page.route('**/api/phones?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        message: 'Success',
        data: {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 10,
          number: 0,
        },
      }),
    });
  });
}

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  console.log('1. Capturing Desktop Variant Selector (1440px)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await desktopContext.newPage();
  await setupMocks(page);

  await page.goto('http://127.0.0.1:5173/san-pham/1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Evidence 1: Desktop overview
  const selectorContainer = page.locator('text=Dung lượng:').locator('xpath=ancestor::div[contains(@class, "rounded-2xl border")]');
  await selectorContainer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, '01-variant-selector-desktop.png'),
    fullPage: false,
    clip: { x: 0, y: 80, width: 1440, height: 800 },
  });
  console.log('Saved 01-variant-selector-desktop.png');

  // Evidence 2: Storage Selection (Click 512GB)
  console.log('2. Switching storage to 512GB...');
  const storage512Btn = page.getByRole('button', { name: /512GB/i });
  await storage512Btn.click();
  await page.waitForTimeout(600);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, '02-storage-selection.png'),
    fullPage: false,
    clip: { x: 0, y: 80, width: 1440, height: 800 },
  });
  console.log('Saved 02-storage-selection.png');

  // Evidence 3: Color Swatch Selection (Click Titan Xanh)
  console.log('3. Selecting Color Swatch Titan Xanh...');
  const swatchBlueBtn = page.getByRole('button', { name: /Màu Titan Xanh/i });
  await swatchBlueBtn.click();
  await page.waitForTimeout(600);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, '03-color-swatch-selection.png'),
    fullPage: false,
    clip: { x: 0, y: 80, width: 1440, height: 800 },
  });
  console.log('Saved 03-color-swatch-selection.png');
  await desktopContext.close();

  // Evidence 4: Out of stock variant
  console.log('4. Capturing Out Of Stock variant state...');
  const oosContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const oosPage = await oosContext.newPage();
  // All variants out of stock to showcase diagonal strikethrough, badge, disabled buttons, and out-of-stock alert
  const allOutOfStockPhone = {
    ...mockPhoneDetail,
    variants: mockPhoneDetail.variants.map((v) => ({
      ...v,
      stockQuantity: 0,
    })),
  };
  await setupMocks(oosPage, allOutOfStockPhone);
  await oosPage.goto('http://127.0.0.1:5173/san-pham/1', { waitUntil: 'networkidle' });
  await oosPage.waitForTimeout(800);

  const oosSelectorContainer = oosPage.locator('text=Dung lượng:').locator('xpath=ancestor::div[contains(@class, "rounded-2xl border")]');
  await oosSelectorContainer.scrollIntoViewIfNeeded();
  await oosPage.waitForTimeout(500);

  await oosPage.screenshot({
    path: path.join(OUTPUT_DIR, '04-out-of-stock-variant.png'),
    fullPage: false,
    clip: { x: 0, y: 80, width: 1440, height: 800 },
  });
  console.log('Saved 04-out-of-stock-variant.png');
  await oosContext.close();

  // Evidence 5: Mobile Viewport (375px)
  console.log('5. Capturing Mobile Viewport (375px)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await setupMocks(mobilePage);

  await mobilePage.goto('http://127.0.0.1:5173/san-pham/1', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(800);

  const mobileSelector = mobilePage.locator('text=Dung lượng:').locator('xpath=ancestor::div[contains(@class, "rounded-2xl border")]');
  await mobileSelector.scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(500);

  await mobilePage.screenshot({
    path: path.join(OUTPUT_DIR, '05-variant-selector-mobile.png'),
    fullPage: false,
  });
  console.log('Saved 05-variant-selector-mobile.png');

  await mobileContext.close();
  await browser.close();
  console.log('All 5 screenshots captured successfully with crisp visuals!');
})();
