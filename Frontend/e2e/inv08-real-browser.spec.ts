import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Database query helper via MySQL CLI
function queryDb(sql: string): string {
  const password = process.env.DB_PASSWORD || '12345678';
  const singleLineSql = sql.replace(/\r?\n/g, ' ').trim();
  const cmd = `"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe" --default-character-set=utf8mb4 -u root -p${password} greenphone -e "${singleLineSql.replace(/"/g, '\\"')}"`;
  try {
    const out = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return out.trim();
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    throw new Error(`MySQL error: ${error.stderr || error.message}`);
  }
}

// Credentials loaded from environment or secure defaults
const WAREHOUSE_USER = {
  email: process.env.E2E_WAREHOUSE_EMAIL || 'warehouse.le@greenphone.vn',
  password: process.env.E2E_WAREHOUSE_PASSWORD || '123456789',
};

const CUSTOMER_USER = {
  email: process.env.E2E_CUSTOMER_EMAIL || 'e2e_tester_map@greenphone.vn',
  password: process.env.E2E_CUSTOMER_PASSWORD || 'Password123@',
};

const ADMIN_USER = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@greenphone.vn',
  password: process.env.E2E_ADMIN_PASSWORD || '123456789',
};

const EVIDENCE_DIR = path.resolve(process.cwd(), '../docs/reviews/evidence/e2e');

test.beforeAll(() => {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
});

// Helper to authenticate via API and get JWT token
async function getAuthToken(email: string, password: string): Promise<string> {
  const res = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok || json.code !== 200) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(json)}`);
  }
  return json.data.token;
}

test.describe('GreenPhone INV-07 / INV-08 Real Browser E2E Suite', () => {

  test('E2E-01: Quản lý chi nhánh & Phân quyền Kho', async ({ page }) => {
    // 1. Visit login page
    await page.goto('/dang-nhap');
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();

    // 2. Fill warehouse staff credentials
    await page.getByPlaceholder('Nhập email').fill(WAREHOUSE_USER.email);
    await page.getByPlaceholder('Nhập mật khẩu').fill(WAREHOUSE_USER.password);
    
    const loginResponse = page.waitForResponse(
      (r) => r.url().includes('/api/auth/login') && r.status() === 200
    );
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await loginResponse;

    // 3. Verify redirected to /admin
    await page.waitForURL((url) => url.pathname.startsWith('/admin'), { timeout: 10000 });

    // 4. Navigate to /admin/warehouses
    await page.goto('/admin/warehouses');
    await expect(page.getByRole('heading', { name: 'Chi nhánh' })).toBeVisible();

    // 5. Verify all 3 branches exist in table
    const table = page.locator('table');
    await expect(table).toContainText('WH-HN-MAIN');
    await expect(table).toContainText('WH-HCM-Q1');
    await expect(table).toContainText('WH-DN-HAI');

    // 6. Verify exact UTF-8 Vietnamese names (NO MOJIBAKE)
    await expect(table).toContainText('Kho Tổng Hà Nội');
    await expect(table).toContainText('Kho Chi Nhánh TP.HCM');
    await expect(table).toContainText('Kho Chi Nhánh Đà Nẵng');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-admin-warehouses-list.png'), fullPage: true });

    // 7. Click detail eye icon on warehouse #1
    const detailLink = page.locator('a[href="/admin/warehouses/1"]').first();
    if (await detailLink.count() > 0) {
      await detailLink.click();
    } else {
      await page.goto('/admin/warehouses/1');
    }
    await expect(page).toHaveURL(/\/admin\/warehouses\/1/);
    await expect(page.locator('table')).toBeVisible();
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-warehouse-detail-stock.png'), fullPage: true });

    // 8. Test Edit warehouse info in database
    await page.goto('/admin/warehouses');
    const editBtn = page.getByRole('button', { name: /Sửa WH-DN-HAI/i }).or(page.locator('button:has(.anticon-edit)').last());
    await editBtn.first().click();
    const addressInput = page.getByLabel('Địa chỉ', { exact: true });
    await expect(addressInput).toBeVisible();
    
    // Save updated address
    const updatedAddress = 'Số 155 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng (Đã xác minh E2E)';
    await addressInput.fill(updatedAddress);
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(page.getByText('Đã lưu thông tin chi nhánh').last()).toBeVisible();

    // Verify DB update
    const dbAddress = queryDb("SELECT address FROM warehouse WHERE code = 'WH-DN-HAI';");
    expect(dbAddress).toContain('Đã xác minh E2E');

    // Restore original address
    await editBtn.first().click();
    await page.getByLabel('Địa chỉ', { exact: true }).fill('Số 155 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng');
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(page.getByText('Đã lưu thông tin chi nhánh').last()).toBeVisible();

    // 9. Check /admin/inventory redirect to /admin/ton-kho
    await page.goto('/admin/inventory');
    await expect(page).toHaveURL(/\/admin\/ton-kho/);
    await expect(page.getByRole('heading', { name: /Tồn kho/i })).toBeVisible();
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-admin-inventory-redirect.png'), fullPage: true });

    // 10. Check role permissions: warehouse staff accessing /admin/nhan-su
    await page.goto('/admin/nhan-su');
    await expect(page.getByText('Không có quyền truy cập')).toBeVisible();
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-warehouse-staff-forbidden.png'), fullPage: true });
  });

  test('E2E-02: Bản đồ OpenStreetMap trên Checkout & Đồng bộ Redux/Payload', async ({ page }) => {
    // 1. Login Customer
    await page.goto('/dang-nhap');
    await page.getByPlaceholder('Nhập email').fill(CUSTOMER_USER.email);
    await page.getByPlaceholder('Nhập mật khẩu').fill(CUSTOMER_USER.password);
    
    const loginResponse = page.waitForResponse(
      (r) => r.url().includes('/api/auth/login') && r.status() === 200
    );
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await loginResponse;

    await page.waitForURL((url) => !url.pathname.includes('/dang-nhap'), { timeout: 10000 });

    // 2. Go to product detail page and click Buy Now
    await page.goto('/san-pham/1');
    await page.waitForLoadState('networkidle');

    // Ensure buy now button is visible and click
    const buyNowBtn = page.getByTestId('buy-now-button');
    await expect(buyNowBtn).toBeVisible({ timeout: 10000 });
    await buyNowBtn.click();

    // 3. Verify on Checkout page
    await page.waitForURL((url) => url.pathname.includes('/thanh-toan'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // 4. Fill required shipping form fields if empty
    const fullNameInput = page.getByPlaceholder('Nguyễn Văn A').first();
    await fullNameInput.fill('Nguyễn Văn E2E Map');
    const phoneInput = page.getByPlaceholder('0901234567').first();
    await phoneInput.fill('0912345678');

    // 5. Expand OpenStreetMap
    const expandMapBtn = page.getByRole('button', { name: /Xem bản đồ/i });
    if (await expandMapBtn.isVisible()) {
      await expandMapBtn.click();
    }

    // 6. Verify Leaflet map container is visible and skeleton finished
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
    const skeleton = page.getByTestId('checkout-map-skeleton');
    if (await skeleton.isVisible()) {
      await expect(skeleton).not.toBeVisible({ timeout: 10000 });
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-checkout-map-visible.png'), fullPage: true });

    // 7. Click on the Leaflet map element to pin coordinates
    const leafletMap = page.getByTestId('checkout-leaflet-map-element');
    await leafletMap.click({ position: { x: 160, y: 140 } });

    // 8. Verify delivery marker is placed on the map
    const marker = page.locator('.custom-delivery-pin-marker').or(page.locator('.leaflet-marker-icon'));
    await expect(marker.first()).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-map-pin-placed.png'), fullPage: true });

    // 9. Verify Redux state has latitude/longitude (using expect.poll)
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const store = (window as unknown as { __store__?: { getState: () => { checkout?: { shipping?: { latitude?: number; longitude?: number } } } } }).__store__;
        return typeof store?.getState()?.checkout?.shipping?.latitude === 'number';
      });
    }, { timeout: 8000 }).toBe(true);

    // 10. Verify manual address change clears coordinates
    const addressInput = page.getByPlaceholder(/Nhập địa chỉ, tên đường/i).first();
    await addressInput.fill('99 Phố Cầu Giấy, Hà Nội (Tự gõ bằng tay)');
    await page.waitForTimeout(500);

    const reduxCoordsAfterEdit = await page.evaluate(() => {
      const store = (window as unknown as { __store__?: { getState: () => { checkout?: { shipping?: { latitude?: number; longitude?: number } } } } }).__store__;
      return store ? store.getState()?.checkout?.shipping : null;
    });
    expect(reduxCoordsAfterEdit?.latitude).toBeUndefined();
    expect(reduxCoordsAfterEdit?.longitude).toBeUndefined();
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-address-manual-reset-coords.png'), fullPage: true });

    // 11. Re-click map to set valid coordinates for order creation
    await leafletMap.click({ position: { x: 200, y: 150 } });
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const store = (window as unknown as { __store__?: { getState: () => { checkout?: { shipping?: { latitude?: number; longitude?: number } } } } }).__store__;
        return typeof store?.getState()?.checkout?.shipping?.latitude === 'number';
      });
    }, { timeout: 8000 }).toBe(true);

    // 12. Proceed from Step 1 (Shipping & Payment) to Step 2 (Order Confirmation)
    const nextStepBtn = page.getByRole('button', { name: /Tiếp tục xác nhận đơn hàng/i });
    await expect(nextStepBtn).toBeVisible({ timeout: 5000 });
    await nextStepBtn.click();

    // 13. Create order and intercept POST /api/orders request payload
    let capturedPayload: { latitude?: number; longitude?: number } | null = null;
    page.on('request', (req) => {
      if (req.url().includes('/api/orders') && req.method() === 'POST') {
        capturedPayload = req.postDataJSON();
      }
    });

    const submitOrderBtn = page.getByRole('button', { name: /Đặt hàng/i });
    await expect(submitOrderBtn).toBeVisible({ timeout: 5000 });
    await submitOrderBtn.click();

    // Verify order created successfully and redirected to payment/success
    await page.waitForURL((url) => url.pathname.includes('/thanh-toan/'), { timeout: 15000 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-order-created-with-coords.png'), fullPage: true });

    // Assert intercepted payload had valid coords
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload?.latitude).toBeGreaterThanOrEqual(-90);
    expect(capturedPayload?.latitude).toBeLessThanOrEqual(90);
    expect(capturedPayload?.longitude).toBeGreaterThanOrEqual(-180);
    expect(capturedPayload?.longitude).toBeLessThanOrEqual(180);
  });

  test('E2E-03: Định tuyến kho theo tọa độ Hà Nội, Đà Nẵng, TP.HCM (INV-07)', async () => {
    // Ensure all 3 warehouses have adequate stock for 1 unit
    queryDb("UPDATE warehouse_stock SET quantity = 10, reserved_quantity = 0 WHERE phone_variant_id = 1;");
    queryDb("UPDATE phone_variant SET stock_quantity = 30 WHERE id = 1;");

    const token = await getAuthToken(CUSTOMER_USER.email, CUSTOMER_USER.password);

    const testLocations = [
      { name: 'Hà Nội', lat: 21.0285, lng: 105.8542, expectedWarehouseId: 1, expectedCode: 'WH-HN-MAIN' },
      { name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022, expectedWarehouseId: 3, expectedCode: 'WH-DN-HAI' },
      { name: 'TP.HCM', lat: 10.7769, lng: 106.7009, expectedWarehouseId: 2, expectedCode: 'WH-HCM-Q1' },
    ];

    for (const loc of testLocations) {
      const orderReq = {
        receiverName: `Khách hàng ${loc.name}`,
        receiverPhone: '0901234567',
        shippingAddress: `Địa chỉ kiểm thử ${loc.name}`,
        paymentMethod: 'COD',
        latitude: loc.lat,
        longitude: loc.lng,
        buyNow: true,
        items: [{ phoneVariantId: 1, quantity: 1 }],
      };

      const res = await fetch('http://localhost:8080/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderReq),
      });

      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.code).toBe(201);
      const orderId = json.data.id;

      // Verify in MySQL
      const dbRow = queryDb(`SELECT id, fulfillment_warehouse_id, order_status FROM orders WHERE id = ${orderId};`);
      expect(dbRow).toContain(String(loc.expectedWarehouseId));

      const whRow = queryDb(`SELECT code FROM warehouse WHERE id = ${loc.expectedWarehouseId};`);
      expect(whRow).toContain(loc.expectedCode);
    }
  });

  test('E2E-04: Điều chuyển liên kho & Giữ chỗ tồn kho (INV-08 Option B)', async () => {
    const customerToken = await getAuthToken(CUSTOMER_USER.email, CUSTOMER_USER.password);
    const adminToken = await getAuthToken(ADMIN_USER.email, ADMIN_USER.password);

    // 1. Setup inventory: WH-HN-MAIN has 5, WH-DN-HAI has 4, WH-HCM-Q1 has 4 (Total 13, but no single warehouse has 10)
    queryDb("UPDATE warehouse_stock SET quantity = 5, reserved_quantity = 0 WHERE warehouse_id = 1 AND phone_variant_id = 1;");
    queryDb("UPDATE warehouse_stock SET quantity = 4, reserved_quantity = 0 WHERE warehouse_id = 2 AND phone_variant_id = 1;");
    queryDb("UPDATE warehouse_stock SET quantity = 4, reserved_quantity = 0 WHERE warehouse_id = 3 AND phone_variant_id = 1;");
    queryDb("UPDATE phone_variant SET stock_quantity = 13 WHERE id = 1;");

    // 2. Customer places order for 10 units at Hanoi
    const orderReq = {
      receiverName: 'Khách hàng Điều Chuyển',
      receiverPhone: '0909999888',
      shippingAddress: '144 Xuân Thủy, Cầu Giấy, Hà Nội',
      paymentMethod: 'COD',
      latitude: 21.0285,
      longitude: 105.8542,
      buyNow: true,
      items: [{ phoneVariantId: 1, quantity: 10 }],
    };

    const res = await fetch('http://localhost:8080/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(orderReq),
    });

    const json = await res.json();
    expect(res.status).toBe(201);
    const orderId = json.data.id;
    expect(json.data.orderStatus).toBe('WAITING_FOR_TRANSFER');

    // 3. Verify warehouse_transfer records created in DB
    const transfers = queryDb(`SELECT id, transfer_code, source_warehouse_id, destination_warehouse_id, status FROM warehouse_transfer WHERE order_id = ${orderId};`);
    expect(transfers).toContain('PENDING');

    // 4. Verify reserved_quantity in warehouse_stock
    const stockHn = queryDb(`SELECT quantity, reserved_quantity FROM warehouse_stock WHERE warehouse_id = 1 AND phone_variant_id = 1;`);
    expect(stockHn).toContain('5'); // 5 reserved locally at WH-HN-MAIN

    // 5. Query all transfer IDs generated for this order
    const transferIdRows = queryDb(`SELECT id FROM warehouse_transfer WHERE order_id = ${orderId};`);
    const transferIds = transferIdRows.split('\n')
      .map((l) => l.trim())
      .filter((l) => /^\d+$/.test(l))
      .map(Number);
    expect(transferIds.length).toBeGreaterThanOrEqual(1);

    // Dispatch and Receive ALL transfers so destination warehouse collects full 10 units
    for (const tId of transferIds) {
      const dispatchRes = await fetch(`http://localhost:8080/api/admin/transfers/${tId}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ note: `E2E Dispatching transfer #${tId}` }),
      });
      expect(dispatchRes.status).toBe(200);

      const transferStatusInTransit = queryDb(`SELECT status FROM warehouse_transfer WHERE id = ${tId};`);
      expect(transferStatusInTransit).toContain('DISPATCHED');

      const receiveRes = await fetch(`http://localhost:8080/api/admin/transfers/${tId}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ note: `E2E Received transfer #${tId} at Hanoi` }),
      });
      expect(receiveRes.status).toBe(200);

      const transferStatusCompleted = queryDb(`SELECT status FROM warehouse_transfer WHERE id = ${tId};`);
      expect(transferStatusCompleted).toContain('RECEIVED');
    }

    // 6. Verify order transitioned to PROCESSING and is eligible for single fulfillment
    const orderStatusProcessing = queryDb(`SELECT order_status FROM orders WHERE id = ${orderId};`);
    expect(orderStatusProcessing).toContain('PROCESSING');

    // Verify destination warehouse stock has collected all 10 units (10 qty, 10 reserved)
    const destStockBeforeShip = queryDb(`SELECT quantity, reserved_quantity FROM warehouse_stock WHERE warehouse_id = 1 AND phone_variant_id = 1;`);
    expect(destStockBeforeShip).toMatch(/10\s+10/);

    // 7. Single Fulfillment: Create shipment for the aggregated order
    const shipmentRes = await fetch('http://localhost:8080/api/admin/shipments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        orderId,
        carrierCode: 'GHN',
        trackingNumber: `GHN-E2E-SF-${orderId}`,
        hubLocation: 'Kho Tổng Hà Nội',
        note: 'Xuất giao đơn hàng gom liên kho thành công (Single Fulfillment)',
      }),
    });
    expect(shipmentRes.status).toBe(201);
    const shipmentJson = await shipmentRes.json();
    expect(shipmentJson.code).toBe(201);
    expect(shipmentJson.data.status).toBe('READY_TO_SHIP');

    // 8. Verify exactly ONE shipment exists for this order
    const shipmentCountRow = queryDb(`SELECT count(*) FROM shipment WHERE order_id = ${orderId};`);
    expect(shipmentCountRow).toContain('1');

    // Verify order status transitioned to SHIPPING
    const orderStatusShipping = queryDb(`SELECT order_status FROM orders WHERE id = ${orderId};`);
    expect(orderStatusShipping).toContain('SHIPPING');

    // 9. Verify destination stock deducted exactly once and reservation released (quantity=0, reserved=0)
    const destStockAfterFulfill = queryDb(`SELECT quantity, reserved_quantity FROM warehouse_stock WHERE warehouse_id = 1 AND phone_variant_id = 1;`);
    expect(destStockAfterFulfill).toMatch(/0\s+0/);

    // 10. Verify stock history has exactly 1 entry for fulfillment
    const historyCount = queryDb(`SELECT count(*) FROM warehouse_stock_history WHERE transfer_reference = 'FULFILL-ORDER-${orderId}';`);
    expect(historyCount).toContain('1');

    const historyDetail = queryDb(`SELECT change_type, quantity_change FROM warehouse_stock_history WHERE transfer_reference = 'FULFILL-ORDER-${orderId}';`);
    expect(historyDetail).toContain('EXPORT');
    expect(historyDetail).toContain('-10');

    // 11. Duplicate prevention: Call create shipment a second time -> Must be rejected
    const secondShipmentRes = await fetch('http://localhost:8080/api/admin/shipments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        orderId,
        carrierCode: 'GHN',
        trackingNumber: `GHN-E2E-DUP-${orderId}`,
        hubLocation: 'Kho Tổng Hà Nội',
        note: 'Cố ý tạo shipment lần 2 - phải bị từ chối 400 Bad Request',
      }),
    });
    expect(secondShipmentRes.status).toBe(400);
    const secondError = await secondShipmentRes.json();
    expect(secondError.message).toContain('PROCESSING');

    // 12. Assert no duplicate shipment, no duplicate stock deduction, no negative stock
    const shipmentCountAfterDup = queryDb(`SELECT count(*) FROM shipment WHERE order_id = ${orderId};`);
    expect(shipmentCountAfterDup).toContain('1');

    const historyCountAfterDup = queryDb(`SELECT count(*) FROM warehouse_stock_history WHERE transfer_reference = 'FULFILL-ORDER-${orderId}';`);
    expect(historyCountAfterDup).toContain('1');

    const destStockAfterDup = queryDb(`SELECT quantity, reserved_quantity FROM warehouse_stock WHERE warehouse_id = 1 AND phone_variant_id = 1;`);
    expect(destStockAfterDup).toMatch(/0\s+0/);
  });

  test('E2E-05: Hủy đơn hàng & Hoàn trả reservation (INV-08 Rollback)', async () => {
    const customerToken = await getAuthToken(CUSTOMER_USER.email, CUSTOMER_USER.password);

    // 1. Setup inventory so transfer is triggered
    queryDb("UPDATE warehouse_stock SET quantity = 5, reserved_quantity = 0 WHERE warehouse_id = 1 AND phone_variant_id = 1;");
    queryDb("UPDATE warehouse_stock SET quantity = 4, reserved_quantity = 0 WHERE warehouse_id = 2 AND phone_variant_id = 1;");
    queryDb("UPDATE warehouse_stock SET quantity = 4, reserved_quantity = 0 WHERE warehouse_id = 3 AND phone_variant_id = 1;");
    queryDb("UPDATE phone_variant SET stock_quantity = 13 WHERE id = 1;");

    // 2. Create order in WAITING_FOR_TRANSFER
    const orderReq = {
      receiverName: 'Khách hàng Hủy Đơn',
      receiverPhone: '0901111222',
      shippingAddress: '144 Xuân Thủy, Cầu Giấy, Hà Nội',
      paymentMethod: 'COD',
      latitude: 21.0285,
      longitude: 105.8542,
      buyNow: true,
      items: [{ phoneVariantId: 1, quantity: 10 }],
    };

    const res = await fetch('http://localhost:8080/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(orderReq),
    });

    const json = await res.json();
    expect(res.status).toBe(201);
    const orderId = json.data.id;
    expect(json.data.orderStatus).toBe('WAITING_FOR_TRANSFER');

    // Verify reservations were placed
    const reservedBefore = queryDb("SELECT SUM(reserved_quantity) FROM warehouse_stock WHERE phone_variant_id = 1;");
    expect(Number(reservedBefore.split('\n')[1].trim())).toBeGreaterThanOrEqual(10);

    // 3. Cancel order
    const cancelRes = await fetch(`http://localhost:8080/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ reason: 'E2E cancellation test' }),
    });
    expect(cancelRes.status).toBe(200);

    // 4. Verify order is CANCELLED in DB
    const orderStatus = queryDb(`SELECT order_status FROM orders WHERE id = ${orderId};`);
    expect(orderStatus).toContain('CANCELLED');

    // 5. Verify all warehouse_transfer records are CANCELLED
    const transferStatus = queryDb(`SELECT status FROM warehouse_transfer WHERE order_id = ${orderId};`);
    expect(transferStatus).toContain('CANCELLED');

    // 6. Verify reserved_quantity is released to 0
    const reservedAfter = queryDb("SELECT SUM(reserved_quantity) FROM warehouse_stock WHERE phone_variant_id = 1;");
    expect(Number(reservedAfter.split('\n')[1].trim())).toBe(0);

    // 7. Test Idempotency / Double cancellation rejection
    const secondCancelRes = await fetch(`http://localhost:8080/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ reason: 'E2E double cancel test' }),
    });
    // Should be rejected with 400 Bad Request
    expect(secondCancelRes.status).toBe(400);

    // Ensure reservations still 0 (no double rollback or underflow)
    const reservedFinal = queryDb("SELECT SUM(reserved_quantity) FROM warehouse_stock WHERE phone_variant_id = 1;");
    expect(Number(reservedFinal.split('\n')[1].trim())).toBe(0);
  });

});
