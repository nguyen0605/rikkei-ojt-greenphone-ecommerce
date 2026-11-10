# Tồn kho theo chi nhánh

## Luồng sử dụng

1. Admin mở **Kho hàng → Danh mục Chi nhánh → Chi tiết**.
2. **Nhập sản phẩm**: tìm sản phẩm có sẵn, chọn đúng biến thể RAM/dung lượng/màu,
   nhập số lượng nguyên dương và lý do. Biến thể đã có được cộng số lượng, không tạo dòng trùng.
3. Mỗi dòng có **Nhập**, **Xuất**, **Lịch sử**; không có nút Chuyển kho riêng.
4. Form Nhập/Xuất giữ bốn trường Kho nhập, Kho xuất, Số lượng, Lý do. Chọn hai chi nhánh ACTIVE khác nhau để điều chuyển; giảm nguồn và tăng đích trong cùng transaction. Chọn Ngoài hệ thống ở một đầu để nhập/xuất bên ngoài.
5. Tại **Tồn kho**, mở sản phẩm rồi mở mũi tên **Chi nhánh** của biến thể để xem phân bổ.
   Tên chi nhánh liên kết về trang chi tiết tương ứng.
6. Khi nhập/xuất ngay tại trang Tồn kho, bắt buộc chọn chi nhánh.

Ví dụ: Hà Nội 60, Đà Nẵng 0. Nhập Đà Nẵng 5 → tổng 65. Xuất Đà Nẵng 2 → tổng 63.
Chuyển Hà Nội sang Đà Nẵng 10 → Hà Nội 50, Đà Nẵng 13, tổng vẫn 63.

## Mô hình và tính nhất quán

- `warehouse_stock`: một dòng duy nhất cho mỗi cặp warehouse/phone_variant, quantity không âm.
- `warehouse_stock_history`: trước/thay đổi/sau, loại thao tác, người thực hiện, lý do và mã chuyển kho.
- Hai vế `TRANSFER_OUT` / `TRANSFER_IN` dùng chung UUID. Tổng hợp có bản ghi ADJUSTMENT 0.
- `phone_variant.stock_quantity` tiếp tục là tổng khả dụng để tương thích API sản phẩm/giỏ hàng.
- Mọi thao tác khóa PhoneVariant trước khi thay đổi phân bổ. Kiểm tra tồn nguồn ở cấp chi nhánh,
  không dùng tổng kho để cho phép xuất quá số lượng tại một chi nhánh.
- Tràn số nguyên bị từ chối; lỗi giữa hai vế chuyển kho rollback toàn bộ.
- Kho INACTIVE không nhập/xuất/chuyển thủ công. Hoàn đơn cũ vẫn về kho gốc, kể cả kho đã INACTIVE.
- Lịch sử cũ tổng hợp vẫn được giữ nguyên. V12 ghi OPENING cho phân bổ ban đầu có số lượng >0.

## Đặt và hủy đơn

Code hiện tại trừ tồn ngay khi tạo đơn; module này giữ nguyên cơ chế đó, không thêm cơ chế reservation thứ hai.
Đơn mới xuất mặc định từ `WH-HN-MAIN`, lưu warehouse_id trên từng dòng đơn. Nếu Hà Nội không đủ hàng,
đơn bị từ chối dù chi nhánh khác còn hàng; chưa có định tuyến theo địa lý/tách đơn đa kho.

Hủy bởi khách/Admin và hết hạn thanh toán hoàn về warehouse_id đã lưu. Dòng đơn cũ thiếu warehouse_id
có nhánh tương thích về Hà Nội. Các luồng hủy khóa đơn và đọc lại tồn sau khi khóa biến thể để tránh
hoàn trùng/ghi đè tồn đã thay đổi. Mã kho chính WH-HN-MAIN không được đổi vì là quy tắc xuất mặc định.

## API (ADMIN, ApiResponse)

| Method | Đường dẫn | Chức năng |
|---|---|---|
| GET | `/api/v1/admin/warehouses/{id}/stock` | Sản phẩm/biến thể trong kho |
| GET | `/api/v1/admin/inventory/variants/{id}/warehouses` | Tất cả chi nhánh, bao gồm số lượng 0 |
| POST | `/api/v1/admin/warehouses/{id}/stock/movements` | Nhập/xuất |
| POST | `/api/v1/admin/warehouses/{id}/stock/transfers` | Chuyển từ kho id sang kho nhận |
| GET | `/api/v1/admin/warehouses/{id}/stock/history?variantId=...` | Tối đa 100 giao dịch gần nhất |

Nhập/xuất:

```json
{"variantId": 7, "changeType": "IMPORT", "quantity": 5, "reason": "Nhập từ nhà cung cấp"}
```

Chuyển:

```json
{"variantId": 7, "targetWarehouseId": 3, "quantity": 10, "reason": "Phân bổ chi nhánh"}
```

Hai POST trả PhoneVariantDTO với tổng mới. Endpoint nhập/xuất cũ `/api/admin/inventory/variants/{id}/movements`
tiếp tục hoạt động nhưng chỉ thao tác kho mặc định Hà Nội, không bỏ qua phân bổ chi nhánh.

## Migration V12 và vận hành

- Chỉ thêm migration `V12__warehouse_variant_stock.sql`; không sửa V1–V11.
- Dừng toàn bộ writer đơn hàng/kho và scheduler trước khi migrate/backfill; sao lưu database.
- Migration chép tổng hiện hữu của mỗi biến thể vào đúng một dòng của Hà Nội. Không thay đổi tổng cũ.
- Gắn dòng đơn cũ với Hà Nội, phù hợp mô hình kho tổng trước đây.
- Nếu kho WH-HN-MAIN bị đổi mã/mất, khôi phục mã đúng trước migration; không tự gán tồn sang kho khác.
- Chạy Flyway qua V12, kiểm tra tổng phân bổ bằng tổng biến thể rồi mới khởi động code mới.
- Không chạy đồng thời code cũ còn ghi tổng kho trực tiếp sau khi chuyển sang mô hình này.
- Không rollback binary về code cũ và tiếp tục bán hàng trên dữ liệu đã tách kho. Cần dừng writer,
  đối soát/phục hồi theo backup; không có down migration tự động xóa bảng/lịch sử.
- Môi trường local hiện dùng schema demo Hibernate; script SQL V12 phải được áp dụng trước khi khởi động
  JAR mới. Không coi Hibernate update là bằng chứng Flyway/backfill. Test migration dùng Flyway thật
  trên MySQL tách biệt.

## Kiểm tra

Backend: `gradlew test build --max-workers=2` với JDK 17 và Docker Desktop.
WarehouseInventoryIT kiểm tra nhập/xuất/chuyển, rollback khi thiếu hàng hoặc kho INACTIVE,
khách hủy đơn hoàn đúng kho gốc và xuất đồng thời chiếc cuối tại chi nhánh.
WarehouseStockMigrationIT kiểm tra backfill thật từ schema V11 đến V12.

Frontend: `npm test -- --run --maxWorkers=2`, `npm run build`;
Playwright: `npm exec -- playwright test e2e/warehouse-stock.spec.ts e2e/admin-warehouses.spec.ts --project=chromium`.
