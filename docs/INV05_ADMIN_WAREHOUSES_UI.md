# INV-05 — Giao diện quản lý chi nhánh kho

Route dành cho ADMIN: `/admin/warehouses`.
Sidebar: **Kho hàng → Danh mục Chi nhánh**.

## Chức năng

- Bảng Ant Design hiển thị mã kho, tên, địa chỉ, trạng thái và thao tác.
- ACTIVE dùng Badge xanh; INACTIVE dùng Badge xám.
- Thêm/sửa bằng Modal React Hook Form và Zod, lỗi nằm dưới từng trường.
- Mã kho: 1–50 ký tự, chữ hoa ASCII/số, các nhóm được phân cách bằng dấu `-`.
- Tên kho: bỏ khoảng trắng đầu/cuối, từ 3 đến 150 ký tự.
- Địa chỉ: bắt buộc, bỏ khoảng trắng đầu/cuối, tối đa 255 ký tự.
- Nút Lưu hiển thị loading và bị khóa trong khi gửi; có khóa đồng bộ chống gửi lặp.
- Tắt kho phải xác nhận Popconfirm. Hủy xác nhận không gửi request và giữ ACTIVE.
- Bật lại kho INACTIVE thực hiện trực tiếp. Khi API lỗi, giữ trạng thái cũ và báo lỗi.
- Dữ liệu được cập nhật từ response server vào Query cache, sau đó refetch để đối chiếu;
  không cần F5. Request danh sách đang chạy được hủy trước mutation để tránh ghi đè dữ liệu mới.
- Mã trùng được hiển thị tại trường mã; lỗi không làm mất dữ liệu form.
- Có trạng thái tải, danh sách rỗng và lỗi tải kèm nút thử lại.
- Không có thao tác xóa kho.

## Kết nối backend

`warehouseService` dùng Axios client chung có base URL `/api` và token tài khoản hiện tại.
Các path tương đối là `/v1/admin/warehouses`, PUT `/{id}` và PATCH `/{id}/status`.
Không gọi nhầm `/api/admin/warehouses` hoặc lặp `/api/api`.

Backend cần task BE3-Warehouse-Management/INV-03. WarehouseRequest backend cũng kiểm tra
tên tối thiểu 3 ký tự sau khi trim để thống nhất với form. Không sửa migration V5.
Hai kho mặc định phải được cấp bởi database/backend, không hardcode seed vào giao diện.

## Demo

1. Đăng nhập ADMIN, mở sidebar Kho hàng → Danh mục Chi nhánh.
2. Xác nhận `WH-HN-MAIN` và `WH-HCM-Q1` từ API.
3. Bấm Thêm Chi Nhánh Mới; thử lưu rỗng để quan sát lỗi Zod.
4. Nhập `WH-DN-Q1`, `Kho Chi Nhánh Đà Nẵng`, `Hải Châu, Đà Nẵng` rồi Lưu.
5. Dòng mới xuất hiện; Sửa địa chỉ và xác nhận thông tin được cập nhật.
6. Tắt Switch: thử Hủy trước, sau đó tắt lại và Xác nhận; dòng chuyển INACTIVE.
7. Reload để kiểm tra dữ liệu đã lưu ở backend. Thử tạo trùng mã để kiểm tra lỗi dưới ô mã.

Nếu mã demo đã có từ lần trước, dùng mã mới hoặc sửa/bật lại kho đó. Không xóa dữ liệu để reset demo.

## Kiểm tra

Trong Frontend:

```powershell
npm.cmd test -- --run --maxWorkers=2
npm.cmd run build
npm.cmd exec -- playwright test e2e/admin-warehouses.spec.ts --project=chromium --reporter=line
```

Vitest kiểm tra bảng, tạo/sửa, Zod, lỗi API, chặn gửi lặp và confirm/cancel trạng thái.
Service test kiểm tra đường dẫn, payload PATCH và unwrap ApiResponse.
Playwright dùng API giả lập để kiểm tra luồng trình duyệt, route guest và bố cục mobile;
nó không thay thế kiểm thử tích hợp với API thật.
