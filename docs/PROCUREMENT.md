# INV-04 / INV-06 — Nhà cung cấp và đơn nhập hàng

## Phạm vi

Admin quản lý nhà cung cấp, lập PO nhiều biến thể và nhận toàn bộ một lần vào một chi nhánh.
Không nhận từng phần, không hoàn hàng NCC, không thay đổi giá bán và không định tuyến đơn bán hàng.

`DRAFT -> ORDERED -> RECEIVED`; `DRAFT/ORDERED -> CANCELLED`. Hai trạng thái cuối không nhận/chuyển lại.
Mặc định tạo ORDERED; form cũng có lựa chọn lưu nháp và nút Đặt hàng trong chi tiết.

## API (ADMIN, ApiResponse)

| Method | Đường dẫn | Chức năng |
|---|---|---|
| GET | /api/v1/admin/suppliers?keyword= | Danh sách, tìm tên/mã/MST |
| GET | /api/v1/admin/suppliers/{id} | Chi tiết |
| POST | /api/v1/admin/suppliers | Tạo NCC |
| PUT | /api/v1/admin/suppliers/{id} | Cập nhật |
| PATCH | /api/v1/admin/suppliers/{id}/status | ACTIVE/INACTIVE, không xóa lịch sử |
| GET | /api/v1/admin/purchase-orders?status=ORDERED&page=0&size=10 | Danh sách phân trang |
| GET | /api/v1/admin/purchase-orders/{id} | Chi tiết dòng hàng |
| POST | /api/v1/admin/purchase-orders | Tạo PO, HTTP 201 |
| PUT | /api/v1/admin/purchase-orders/{id} | Chỉnh PO DRAFT, không thay đổi tồn kho |
| POST | /api/v1/admin/purchase-orders/{id}/order | Đặt PO nháp |
| POST | /api/v1/admin/purchase-orders/{id}/cancel | Hủy PO chưa nhận |
| POST | /api/v1/admin/purchase-orders/{id}/receive | Nhận đủ một lần |

Ví dụ request tạo (thay ID bằng dữ liệu thật):

```json
{"supplierId":3,"warehouseId":2,"status":"ORDERED","items":[{"variantId":7,"quantity":50,"unitCost":25000000}]}
```

NCC/kho phải ACTIVE khi tạo và khi nhận; không cho dòng trùng biến thể, rỗng, số lượng/đơn giá không nguyên dương.
Tiền VND nguyên đồng; server tính tổng BigDecimal, không lấy tổng do client cung cấp. Tổng không vượt DECIMAL(15,2).
Mã PO do server sinh UUID và bảo vệ bởi unique constraint; mỗi PO chỉ một kho đích.

## Toàn vẹn tồn kho

Receive chạy trong một transaction READ_COMMITTED: khóa bi quan PO, kiểm tra ORDERED, rồi khóa biến thể tăng dần theo ID.
READ_COMMITTED bảo đảm ledger đọc được dòng phân bổ vừa được transaction trước tạo sau khi chờ khóa,
tránh snapshot REPEATABLE_READ cũ gây trùng unique key khi hai PO nhập cùng biến thể lần đầu.
Refresh số lượng dưới khóa để không dùng entity cũ đã load. Cộng tổng tồn một lần và gọi recordAtWarehouse
để cộng đúng kho đích, ghi lịch sử chi nhánh và lịch sử tổng với lý do chứa mã PO.
Các dòng quantity_received cập nhật bằng quantity_ordered. Lỗi bất kỳ rollback toàn phiếu.
Hai request nhận cùng PO: chỉ request đầu thành công; request sau bị từ chối, không cộng kho lần nữa.

## Giao diện

- Kho hàng -> Nhà cung cấp (`/admin/suppliers`): tìm tên/MST; MST chưa có hiển thị dấu gạch.
- Giao diện NCC có thêm/sửa bằng form RHF/Zod; Switch ngừng hoạt động cần xác nhận, có thể kích hoạt lại. Không xóa cứng.
- NCC có lọc ACTIVE/INACTIVE, sắp xếp tên/mã hai chiều, reset bộ lọc và icon chi tiết xem toàn bộ thông tin.
- PO có tìm mã/NCC, lọc trạng thái/NCC/chi nhánh, sort mới/cũ/tổng tiền/mã, reset và icon chi tiết. API GET PO nhận thêm keyword/supplierId/warehouseId/sort; lọc/sort trước phân trang trên server, sort được whitelist và có ID làm tie-breaker. Các request cũ không truyền bộ lọc vẫn dùng mặc định mới nhất.
- Kho hàng -> Đơn Nhập Hàng (PO) (`/admin/purchase-orders`): lọc trạng thái, tạo PO, mở chi tiết.
- Modal RHF/Zod, chọn NCC/kho ACTIVE, thêm nhiều dòng, chọn sản phẩm rồi biến thể, số lượng và giá nhập.
- Drawer có Popconfirm trước khi nhận; spinner/disabled và guard chống gửi lặp.
- Chỉ PO DRAFT có nút Sửa PO nháp; chỉnh NCC/kho/dòng hàng/ghi chú và tính lại tổng, giữ mã PO/trạng thái nháp. API cũng chặn sửa ORDERED/RECEIVED/CANCELLED. Các dòng bỏ khỏi nháp được xóa bằng orphanRemoval trong cùng transaction; chưa tác động tồn kho. Dùng thao tác Đặt hàng riêng để chuyển ORDERED.
- Sau nhận, PO chuyển RECEIVED, nút nhận biến mất, cache tồn tổng/chi nhánh/lịch sử bị invalidated.
- Bảng biến thể tải lại khi mở, tránh dùng state tồn cũ sau khi điều hướng giữa PO và sản phẩm.

## Migration và nghiệm thu

V6 giữ nguyên. V20 bổ sung supplier.tax_code nullable; không bịa mã số thuế cho 3 NCC seed.
Chạy bằng Flyway trên DB đã có lịch sử đúng; không coi Hibernate update của local là bằng chứng migration.
Chuỗi nền V10/V11 trước đây trùng constraint fk_refund_order với V1; nếu còn lỗi phải xử lý upstream
trước khi nâng cấp DB sạch qua V20. Task này không thay đổi các migration cũ.

Demo: chọn Digiworld, kho đích HN hoặc HCM, biến thể có thật, 50 x 25.000.000 VND; nhận hàng ->
RECEIVED, tổng tồn +50, kho đã chọn +50, lịch sử IMPORT chứa mã PO. Nhận lại phải bị từ chối.
Kiểm tra API sản phẩm thật tại /api/phones/{id}, không phải /api/v1/phones/{id}.

Kiểm thử: AdminPurchaseOrderServiceTest, AdminSupplierServiceTest, AdminPurchaseOrderControllerTest,
PurchaseOrderInventoryIT (MySQL, rollback và cạnh tranh), Vitest AdminPurchaseOrdersPage.test.tsx,
Playwright e2e/purchase-orders.spec.ts. Kết quả thực tế từng lần chạy lưu trong history task ngoài repo.
