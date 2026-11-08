const { chromium } = require('d:/IT/RIKKEI/rikkei-ojt-greenphone-ecommerce/rikkei-ojt-greenphone-ecommerce/Frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve('d:/IT/RIKKEI/rikkei-ojt-greenphone-ecommerce/rikkei-ojt-greenphone-ecommerce/docs/evidence/fe1-02-cart-sync');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function createPhoneSvgDataUri(colorHex, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="400" height="480">
    <rect width="400" height="480" fill="#f8fafc" rx="24"/>
    <rect x="80" y="30" width="240" height="420" rx="36" fill="${colorHex}" stroke="#cbd5e1" stroke-width="4"/>
    <rect x="94" y="44" width="212" height="392" rx="26" fill="#0f172a"/>
    <rect x="160" y="56" width="80" height="18" rx="9" fill="#000000"/>
    <text x="200" y="260" font-family="sans-serif" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const naturalImg = createPhoneSvgDataUri('#9A958D', 'iPhone 15 Pro Max');
const samsungImg = createPhoneSvgDataUri('#3B4856', 'Galaxy S24 Ultra');

const guestItem = {
  id: 'phone-1-10-Titan-Tu-Nhien-256GB',
  productId: '1',
  variantId: 10,
  product: {
    id: '1',
    slug: 'iphone-15-pro-max',
    name: 'iPhone 15 Pro Max 256GB',
    brand: 'apple',
    category: 'smartphone',
    price: 33990000,
    originalPrice: 34990000,
    rating: 4.9,
    reviewCount: 42,
    sold: 100,
    images: [naturalImg],
    thumbnail: naturalImg,
    colors: [{ id: '10', name: 'Titan Tự Nhiên', hex: '#9A958D' }],
    storage: [{ id: '10', capacity: '256GB' }],
    description: 'iPhone 15 Pro Max',
    specifications: [],
    features: [],
    inStock: true,
  },
  quantity: 1,
  selectedColor: 'Titan Tự Nhiên',
  selectedStorage: '256GB',
  addedAt: new Date().toISOString(),
};

let serverCartItems = [
  {
    id: 102,
    phoneVariantId: 20,
    phoneId: 2,
    phoneName: 'Samsung Galaxy S24 Ultra',
    ram: '12GB',
    storage: '512GB',
    color: 'Titan Xám',
    imageUrl: samsungImg,
    price: 31990000,
    discountPrice: 29990000,
    quantity: 2,
    subtotal: 59980000,
  },
];

async function setupRoutes(page) {
  await page.route('**/api/brands', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, message: 'Success', data: [] }),
    });
  });

  await page.route('**/api/phones/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        message: 'Success',
        data: {
          id: 1,
          name: 'Phone Detail',
          mainImageUrl: naturalImg,
          images: [],
          reviewCount: 10,
          avgRating: 4.8,
        },
      }),
    });
  });

  await page.route('**/api/cart', async (route) => {
    if (route.request().method() === 'GET') {
      const totalItems = serverCartItems.reduce((s, i) => s + i.quantity, 0);
      const totalAmount = serverCartItems.reduce((s, i) => s + (i.discountPrice || i.price) * i.quantity, 0);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'Success',
          data: {
            id: 1,
            userId: 7,
            items: serverCartItems,
            totalItems,
            totalAmount,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/cart/sync', async (route) => {
    const postData = JSON.parse(route.request().postData() || '{"items":[]}');
    console.log('Received /api/cart/sync request with items:', postData.items);

    // Merge incoming guest items with serverCartItems
    postData.items.forEach((reqItem) => {
      const existing = serverCartItems.find((i) => i.phoneVariantId === reqItem.phoneVariantId);
      if (existing) {
        existing.quantity += reqItem.quantity;
      } else {
        serverCartItems.unshift({
          id: 101,
          phoneVariantId: reqItem.phoneVariantId,
          phoneId: 1,
          phoneName: 'iPhone 15 Pro Max 256GB',
          ram: '8GB',
          storage: '256GB',
          color: 'Titan Tự Nhiên',
          imageUrl: naturalImg,
          price: 34990000,
          discountPrice: 33990000,
          quantity: reqItem.quantity,
          subtotal: 33990000 * reqItem.quantity,
        });
      }
    });

    const totalItems = serverCartItems.reduce((s, i) => s + i.quantity, 0);
    const totalAmount = serverCartItems.reduce((s, i) => s + (i.discountPrice || i.price) * i.quantity, 0);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        message: 'Cart synced successfully',
        data: {
          id: 1,
          userId: 7,
          items: serverCartItems,
          totalItems,
          totalAmount,
        },
      }),
    });
  });

  await page.route('**/api/cart/items/**', async (route) => {
    const url = route.request().url();
    const itemIdMatch = url.match(/\/items\/(\d+)/);
    const itemId = itemIdMatch ? Number(itemIdMatch[1]) : 0;

    if (route.request().method() === 'PUT') {
      const body = JSON.parse(route.request().postData() || '{}');
      if (body.quantity > 5) {
        // Simulate out of stock error
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 400,
            message: 'Số lượng yêu cầu vượt quá tồn kho (Insufficient stock)',
          }),
        });
        return;
      }

      const item = serverCartItems.find((i) => i.id === itemId);
      if (item) {
        item.quantity = body.quantity;
        item.subtotal = (item.discountPrice || item.price) * body.quantity;
      }

      const totalItems = serverCartItems.reduce((s, i) => s + i.quantity, 0);
      const totalAmount = serverCartItems.reduce((s, i) => s + (i.discountPrice || i.price) * i.quantity, 0);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          message: 'Updated quantity',
          data: { id: 1, userId: 7, items: serverCartItems, totalItems, totalAmount },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  console.log('1. Setting up guest cart in localStorage...');
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await setupRoutes(page);

  // Set guest cart in localStorage before loading
  await page.addInitScript((item) => {
    localStorage.clear();
    localStorage.setItem('greenphone.guestCart', JSON.stringify([item]));
  }, guestItem);

  await page.goto('http://127.0.0.1:5173/gio-hang', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Evidence 1: Guest cart
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '01-guest-cart.png'),
    fullPage: false,
    clip: { x: 0, y: 0, width: 1440, height: 800 },
  });
  console.log('Saved 01-guest-cart.png');

  // Evidence 2: Guest refresh
  console.log('2. Refreshing page as guest...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, '02-guest-refresh.png'),
    fullPage: false,
    clip: { x: 0, y: 0, width: 1440, height: 800 },
  });
  console.log('Saved 02-guest-refresh.png');

  // Evidence 3: Login & Cart Merge
  console.log('3. Simulating user login and cart merge...');
  await page.evaluate(() => {
    // Set authenticated token and user in localStorage
    localStorage.setItem('greenphone.token', 'jwt-test-token-7');
    localStorage.setItem(
      'greenphone.user',
      JSON.stringify({ id: 7, fullName: 'Dương Phúc Thịnh', email: 'thinh@greenphone.vn', role: 'CUSTOMER' }),
    );
  });

  // Reload page to trigger CartHydrator sync with newly set auth state
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, '03-login-merge.png'),
    fullPage: false,
    clip: { x: 0, y: 0, width: 1440, height: 800 },
  });
  console.log('Saved 03-login-merge.png');

  // Evidence 4: Realtime quantity update
  console.log('4. Incrementing item quantity...');
  const plusButton = page.locator('button[aria-label="Tăng số lượng"]').first();
  await plusButton.click();
  await page.waitForTimeout(800);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, '04-realtime-quantity-update.png'),
    fullPage: false,
    clip: { x: 0, y: 0, width: 1440, height: 800 },
  });
  console.log('Saved 04-realtime-quantity-update.png');

  // Evidence 5: Out of stock limit handling
  console.log('5. Testing out-of-stock quantity error...');
  // Click plus button 5 more times to exceed stock limit (> 5)
  for (let i = 0; i < 5; i++) {
    await plusButton.click();
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(600);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, '05-out-of-stock-limit.png'),
    fullPage: false,
    clip: { x: 0, y: 0, width: 1440, height: 800 },
  });
  console.log('Saved 05-out-of-stock-limit.png');

  await context.close();
  await browser.close();
  console.log('All 5 cart evidence screenshots captured successfully!');
})();
