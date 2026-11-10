# BÁO CÁO KẾ HOẠCH SPRINT VÀ PHÂN BỔ NHIỆM VỤ SPRINT 3

Dự án: GREENPHONE - Hệ Thống Thương Mại Điện Tử Bán Điện Thoại Thông Minh
Đơn vị: Đồ án On-the-Job Training (OJT) - Rikkei Academy
Mã lớp: HCM-KS24-CNTT1
Thời lượng Sprint: 01 tuần (Từ ngày 07/11/2026 đến hết ngày 13/11/2026)
Quy mô: 06 Thành viên Kỹ thuật (Fullstack & DevOps)
Nguồn dữ liệu đồng bộ: Cột Sprint Backlog (Sprint 3) trên Trello Board chính thức (https://trello.com/b/LBnO1w9t/greenphone-smartphone-e-commerce)
Ngày lập kế hoạch: 09 tháng 11 năm 2026

---

## 1. THÔNG TIN CHUNG VÀ BỐI CẢNH ĐẦU SPRINT 3

### 1.1. Bối cảnh dự án
Dự án GreenPhone là nền tảng thương mại điện tử chuyên sâu ngành hàng thiết bị di động, được xây dựng trên nền tảng Backend Spring Boot 3 (Java 21) và Frontend React 19 (TypeScript, Vite, Tailwind CSS).

Trải qua 2 Sprint đầu tiên:
- Sprint 1: Hoàn thành thiết lập nền tảng kiến trúc base, xác thực JWT Bearer, quản lý danh mục smartphone, ma trận biến thể và luồng mua sắm cơ bản, đạt 62/70 Story Points (88.6%).
- Sprint 2: Hoàn thành nâng cấp giao dịch thực chiến với cổng thanh toán tự động VietQR SePay Webhook, cơ chế khóa bi quan (@Lock Pessimistic Write) chống bán âm kho biến thể, đồng bộ giỏ hàng với Database, máy trạng thái đơn hàng (Order State Machine), cấu trúc OTP Redis có TTL chống tấn công vét cạn (brute-force), cụm Redis Cache 5 vùng dữ liệu và bộ giao diện quản trị đơn hàng chi tiết phía Admin, đạt 85.5% khối lượng cam kết.
- Giai đoạn chuyển giao hạ tầng: Đã hoàn tất nâng cấp lưu trữ hình ảnh đám mây Cloudflare R2 (165 tệp ảnh chất lượng cao), mở rộng danh mục 51 dòng điện thoại thế hệ mới cùng 150 biến thể chi tiết thông qua bản di chuyển cơ sở dữ liệu Flyway V4.1; đồng thời nạp thành công các bản di chuyển lũy tiến V5 (quản trị kho đa điểm, giữ hàng tồn kho), V6 (quản trị nhà cung cấp, đơn đặt mua hàng PO) và V7 (kích hoạt bảo hành điện tử IMEI, danh sách yêu thích Wishlist).

### 1.2. Cơ chế phân bổ vai trò trong Sprint 3
Nhóm tiếp tục duy trì cơ chế phân công chuyên trách theo phân hệ, kết hợp luân chuyển để phát huy tối đa năng lực kỹ thuật của từng thành viên:
- Vũ Đăng Nguyên (dangnguyenvu): Trưởng nhóm Kỹ thuật (Lead Tech & DevOps / Core Backend).
- Dương Phúc Thịnh (38phucthinh): Frontend Kỹ thuật (Catalog Sản phẩm, Bản đồ Giao hàng & Dispatch UI).
- Nguyễn Lê Vũ (vunguynle1): Fullstack Kỹ thuật (Quy trình Khiếu nại Đổi trả, Hoàn tiền & Thẩm định Admin).
- Phan Văn Đạt (dtphanvan3): Backend Kỹ thuật (Voucher Engine, Quản trị Vận chuyển & Chi tiết Đơn hàng).
- Nguyễn Văn Toàn (toannguynvan12): Backend Kỹ thuật (Trọn gói Module Danh sách Yêu thích Wishlist).
- Nguyễn Trọng Đăng Dương (dangduongre): Fullstack Kỹ thuật (Kho Đa Điểm, Đơn Nhập Hàng PO & Bảo Hành IMEI).

---

## 2. MỤC TIÊU SPRINT 3 (SPRINT GOAL)

Tuyên ngôn mục tiêu Sprint 3:
> "Hoàn thiện hai phân hệ nghiệp vụ chuỗi bán lẻ cốt lõi: Phân hệ Giao vận (Shipments) và Khiếu nại bảo hành / Đổi trả (Warranty Claims & Returns); mở rộng hệ thống kho hàng đa điểm và quy trình nhập hàng PO từ đối tác phân phối; triển khai tính năng danh sách yêu thích Wishlist đồng bộ Redux; tối ưu hóa động cơ khuyến mãi Voucher Engine và tự động hóa kích hoạt bảo hành điện tử theo số IMEI."

---

## 3. CHỈ SỐ CAM KẾT VÀ VẬN TỐC NHÓM (SPRINT 3 CAPACITY & VELOCITY)

### 3.1. Phân tích năng lực thực tế
- Thời lượng: 07 ngày làm việc (01 tuần).
- Tổng nhân sự: 06 thành viên kỹ thuật.
- Vận tốc trung bình các Sprint trước:
  - Sprint 1: 62 SP (10.3 SP / thành viên).
  - Sprint 2: 67 SP khả dụng (11.2 SP / thành viên).
- Năng lực cam kết Sprint 3: 60 Story Points (trung bình 10.0 SP / thành viên), tương ứng với đúng 19 nhiệm vụ kỹ thuật độc lập được duyệt trên Trello Board.

### 3.2. Bảng phân bổ Story Points theo các phân hệ nghiệp vụ

| Mã Module | Phân Hệ Nghiệp Vụ | Số Thẻ | Điểm Cam Kết (SP) | Tỷ Trọng Tiến Độ |
|---|---|:---:|:---:|:---:|
| CAT | Catalog & Sản Phẩm (Wishlist, Ảnh R2) | 4 thẻ | 11 SP | 18.3% |
| ORD | Đơn Hàng & Giao Vận (Shipments, Tracking, Bản đồ) | 7 thẻ | 19 SP | 31.7% |
| INV | Quản Trị Kho & Đơn Nhập Hàng (PO, Kho đa điểm) | 2 thẻ | 8 SP | 13.3% |
| WAR | Bảo Hành & Đổi Trả (IMEI, Thẩm định, Hoàn tiền) | 5 thẻ | 17 SP | 28.3% |
| MKT | Khuyến Mãi & Voucher Engine | 1 thẻ | 5 SP | 8.4% |
| **TỔNG CỘNG** | **Toàn bộ 5 phân hệ Sprint 3** | **19 thẻ** | **60 SP** | **100.0%** |

---

## 4. TOP 10 HẠNG MỤC CÔNG VIỆC TRỌNG TÂM BỨT PHÁ TRONG SPRINT 3

| STT | Nhiệm vụ kỹ thuật trọng tâm | SP | Người phụ trách |
|:---:|---|:---:|---|
| 1 | [ORD-22] Schema Migration V8 & Entity Kiện Hàng Shipments | 3 SP | Vũ Đăng Nguyên |
| 2 | [ORD-23] API Đóng Gói Xuất Kho & Public Tracking Vận Đơn | 3 SP | Vũ Đăng Nguyên |
| 3 | [WAR-03] Migration V9 & Nghiệp Vụ Tiếp Nhận Sửa Chữa Bảo Hành Theo IMEI | 3 SP | Vũ Đăng Nguyên |
| 4 | [ORD-19] Tích Hợp Bản Đồ OpenStreetMap & Mô Phỏng Tiến Trình Giao Hàng | 3 SP | Dương Phúc Thịnh |
| 5 | [ORD-21] API Tiếp Nhận & Xử Lý Yêu Cầu Hoàn Tiền Đơn Hàng (Refund Service) | 3 SP | Nguyễn Lê Vũ |
| 6 | [WAR-04 & WAR-05] Nghiệp Vụ & Giao Diện Thẩm Định Kỹ Thuật, Đổi Máy Mới & Duyệt Hoàn Tiền | 6 SP | Nguyễn Lê Vũ |
| 7 | [MKT-03] Quản Lý Vòng Đời Voucher, Kiểm Tra Hạn Mức & Đồng Bộ Hoàn Trả | 5 SP | Phan Văn Đạt |
| 8 | [CAT-19/20/21] Bộ 3 Tính Năng Danh Sách Yêu Thích (Wishlist) Đồng Bộ Redux & API | 8 SP | Nguyễn Văn Toàn |
| 9 | [INV-04] Quản Lý Nhà Cung Cấp Và Lập Đơn Nhập Hàng Tăng Tồn Kho (PO) | 5 SP | Nguyễn Trọng Đăng Dương |
| 10 | [WAR-01] Tự Động Kích Hoạt Và API Tra Cứu Bảo Hành Điện Tử Theo Mã IMEI | 5 SP | Nguyễn Trọng Đăng Dương |

---

## 5. BẢNG PHÂN BỔ STORY POINTS THEO 06 THÀNH VIÊN (SPRINT 3)

| Họ và tên | Username | Vai trò S3 | Phân hệ chính | Số thẻ | Tổng SP | Tỷ lệ SP |
|---|---|---|---|:---:|:---:|:---:|
| Vũ Đăng Nguyên | dangnguyenvu | BE 1 (Lead Tech & Infra) | Giao vận Shipments (Migration V8, API xuất kho), Migration V9 Sửa chữa IMEI, Fix ảnh Cloudflare R2 | 4 thẻ | 12 SP | 20.0% |
| Dương Phúc Thịnh | 38phucthinh | FE 1 (Catalog & UI/UX) | Bản đồ OpenStreetMap giao hàng, Điều hướng PDP, Giao diện điều phối và in phiếu giao hàng Admin | 3 thẻ | 7 SP | 11.7% |
| Nguyễn Lê Vũ | vunguynle1 | FE 2 / Fullstack (Tracking & Returns) | Nghiệp vụ Đổi trả & Hoàn tiền, Giao diện Khách hàng gửi khiếu nại, Giao diện Admin thẩm định kỹ thuật | 4 thẻ | 12 SP | 20.0% |
| Phan Văn Đạt | dtphanvan3 | BE 3 (Finance & Promo) | Voucher Engine vòng đời hoàn trả, Admin API cập nhật trạng thái vận chuyển toàn diện | 2 thẻ | 8 SP | 13.3% |
| Nguyễn Văn Toàn | toannguynvan12 | BE 2 (Commerce & Kho) | Trọn gói Module Danh sách Yêu thích Wishlist (API Service, Redux Slice, Giao diện Thả tim tương tác) | 3 thẻ | 8 SP | 13.3% |
| Nguyễn Trọng Đăng Dương | dangduongre | FE 3 / Fullstack (Admin & Operations) | Quản lý Kho đa điểm, Đơn nhập hàng PO tăng tồn kho, Kích hoạt và API tra cứu bảo hành điện tử IMEI | 3 thẻ | 13 SP | 21.7% |
| **TỔNG CỘNG** | **6 thành viên** | **Fullstack & DevOps Team** | **Toàn hệ thống GreenPhone** | **19 thẻ** | **60 SP** | **100.0%** |

---

## 6. DANH MỤC TOÀN BỘ 19 THẺ CÔNG VIỆC SPRINT 3 CHI TIẾT

| STT | Tên nhiệm vụ kỹ thuật chi tiết | SP | Người phụ trách | Trạng thái Trello |
|:---:|---|:---:|---|:---:|
| 1 | [3 SP] [CAT-18] Khắc Phục Lỗi Hiển Thị Ảnh Danh Mục Sản Phẩm & Mở Rộng Dữ Liệu Catalog | 3 SP | Vũ Đăng Nguyên | Sprint Backlog |
| 2 | [3 SP] [ORD-22] Schema Migration V8 & Entity Kiện Hàng Shipments | 3 SP | Vũ Đăng Nguyên | Sprint Backlog |
| 3 | [3 SP] [ORD-23] API Đóng Gói Xuất Kho & Public Tracking Vận Đơn | 3 SP | Vũ Đăng Nguyên | Sprint Backlog |
| 4 | [3 SP] [ORD-19] Tích Hợp Bản Đồ OpenStreetMap & Mô Phỏng Tiến Trình Giao Hàng Thời Gian Thực | 3 SP | Dương Phúc Thịnh | Sprint Backlog |
| 5 | [2 SP] [ORD-20] Điều Hướng Nhanh Đến Trang Chi Tiết Sản Phẩm Từ Chi Tiết Đơn Hàng | 2 SP | Dương Phúc Thịnh | Sprint Backlog |
| 6 | [3 SP] [ORD-21] API Tiếp Nhận & Xử Lý Yêu Cầu Hoàn Tiền Đơn Hàng (Refund Service) | 3 SP | Nguyễn Lê Vũ | Sprint Backlog |
| 7 | [3 SP] [ORD-22] API Quản Trị Chi Tiết Đơn Hàng & Cập Nhật Trạng Thái Vận Chuyển Toàn Diện | 3 SP | Phan Văn Đạt | Sprint Backlog |
| 8 | [5 SP] [MKT-03] Quản Lý Vòng Đời Voucher, Kiểm Tra Hạn Mức & Đồng Bộ Hoàn Trả | 5 SP | Phan Văn Đạt | Sprint Backlog |
| 9 | [3 SP] [CAT-19] API Quản Lý Danh Sách Sản Phẩm Yêu Thích (Wishlist Service & Controller) | 3 SP | Nguyễn Văn Toàn | Sprint Backlog |
| 10 | [2 SP] [CAT-20] Đồng Bộ Danh Sách Yêu Thích Với Redux Và API (Wishlist State & Service) | 2 SP | Nguyễn Văn Toàn | Sprint Backlog |
| 11 | [3 SP] [CAT-21] Giao Diện Trang Danh Mục Yêu Thích & Nút Thả Tim Tương Tác | 3 SP | Nguyễn Văn Toàn | Sprint Backlog |
| 12 | [3 SP] [INV-03] Quản Lý Danh Mục Kho Hàng Và Chi Nhánh Đa Điểm | 3 SP | Nguyễn Trọng Đăng Dương | Sprint Backlog |
| 13 | [5 SP] [INV-04] Quản Lý Nhà Cung Cấp Và Lập Đơn Nhập Hàng Tăng Tồn Kho (Purchase Orders) | 5 SP | Nguyễn Trọng Đăng Dương | Sprint Backlog |
| 14 | [5 SP] [WAR-01] Tự Động Kích Hoạt Và API Tra Cứu Bảo Hành Điện Tử Theo Mã IMEI | 5 SP | Nguyễn Trọng Đăng Dương | Sprint Backlog |
| 15 | [2 SP] [ORD-29] Giao Diện Điều Phối Giao Hàng & In Phiếu Giao Cho Admin | 2 SP | Dương Phúc Thịnh | Sprint Backlog |
| 16 | [3 SP] [WAR-03] Migration V9 & Nghiệp Vụ Tiếp Nhận Sửa Chữa Bảo Hành Theo IMEI | 3 SP | Vũ Đăng Nguyên | Sprint Backlog |
| 17 | [3 SP] [WAR-04] Nghiệp Vụ Đổi Trả Sản Phẩm Lỗi Trong 30 Ngày & Hoàn Tiền (Refund) | 3 SP | Nguyễn Lê Vũ | Sprint Backlog |
| 18 | [3 SP] [FE1] Giao Diện Khách Hàng Gửi Yêu Cầu Đổi Trả & Theo Dõi Tiến Độ | 3 SP | Nguyễn Lê Vũ | Sprint Backlog |
| 19 | [3 SP] [WAR-05] Giao Diện Admin Thẩm Định Kỹ Thuật, Xử Lý Đổi Máy & Duyệt Hoàn Tiền | 3 SP | Nguyễn Lê Vũ | Sprint Backlog |

---

## 7. MÔ TẢ CHI TIẾT NGHIỆP VỤ VÀ TIÊU CHUẨN NGHIỆM THU 19 NHIỆM VỤ

### Nhiệm vụ 1: [3 SP] [CAT-18] Khắc Phục Lỗi Hiển Thị Ảnh Danh Mục Sản Phẩm & Mở Rộng Dữ Liệu Catalog
- Người phụ trách: Vũ Đăng Nguyên (@dangnguyenvu)
- Điểm Story Points: 3 SP
- Phân hệ: CAT (FE (UI), Epic: Catalog & Product, Priority: Must-Have, Sprint 3)
- Mục tiêu & Nghiệp vụ: Khắc phục triệt để lỗi hiển thị ảnh sản phẩm trên trang danh mục và chi tiết máy; đồng bộ 100% đường dẫn ảnh sang Cloudflare R2 đã cấu hình từ bản di chuyển Flyway V4.1, đảm bảo tốc độ tải mượt mà.
- Đường dẫn file tác động:
  - Frontend/src/components/common/ProductCard.tsx
  - Frontend/src/pages/product/ProductsPage.tsx
  - GreenPhone-Backend/src/main/java/com/re/greenphone/service/PhoneService.java
- Tiêu chuẩn nghiệm thu: 100% hình ảnh điện thoại trên danh mục hiển thị sắc nét từ kho Cloudflare R2; có ảnh placeholder thay thế an toàn nếu phát sinh sự cố mạng.

### Nhiệm vụ 2: [3 SP] [ORD-22] Schema Migration V8 & Entity Kiện Hàng Shipments
- Người phụ trách: Vũ Đăng Nguyên (@dangnguyenvu)
- Điểm Story Points: 3 SP
- Phân hệ: ORD (Epic: Fulfillment & Shipping, Priority: Must-Have, BE (Core), Sprint 3)
- Mục tiêu & Nghiệp vụ: Tách nghiệp vụ quản lý giao vận độc lập khỏi bảng đơn hàng. Tạo bảng shipment và shipment_history để quản lý mã vận đơn, đơn vị vận chuyển (GHTK, GHN, Viettel Post), tiền thu hộ COD và phí vận chuyển.
- Đường dẫn file tác động:
  - GreenPhone-Backend/src/main/resources/db/migration/V8__create_shipments.sql
  - GreenPhone-Backend/src/main/java/com/re/greenphone/entity/Shipment.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/entity/ShipmentHistory.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/repository/ShipmentRepository.java
- Tiêu chuẩn nghiệm thu: Bảng shipment lưu trữ đầy đủ order_id, tracking_number, carrier_code, shipping_fee, cod_amount, status; ràng buộc khóa ngoại an toàn với orders.

### Nhiệm vụ 3: [3 SP] [ORD-23] API Đóng Gói Xuất Kho & Public Tracking Vận Đơn
- Người phụ trách: Vũ Đăng Nguyên (@dangnguyenvu)
- Điểm Story Points: 3 SP
- Phân hệ: ORD (Epic: Fulfillment & Shipping, Priority: Must-Have, BE (Service), Sprint 3)
- Mục tiêu & Nghiệp vụ: Xây dựng dịch vụ API cho Admin thực hiện đóng gói xuất kho, cập nhật trạng thái vận đơn và API công khai cho khách hàng tra cứu tiến trình vận chuyển theo mã vận đơn.
- Đường dẫn file tác động:
  - GreenPhone-Backend/src/main/java/com/re/greenphone/service/ShipmentService.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/controller/ShipmentController.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/controller/admin/AdminShipmentController.java
- Tiêu chuẩn nghiệm thu: Khi kiện hàng chuyển sang DELIVERED, hệ thống tự động cập nhật orders.order_status sang COMPLETED và kích hoạt bản ghi bảo hành điện tử warranty theo IMEI.

### Nhiệm vụ 4: [3 SP] [ORD-19] Tích Hợp Bản Đồ OpenStreetMap & Mô Phỏng Tiến Trình Giao Hàng Thời Gian Thực
- Người phụ trách: Dương Phúc Thịnh (@38phucthinh)
- Điểm Story Points: 3 SP
- Phân hệ: ORD (FE (UI), Epic: Order & Checkout, Priority: Must-Have, Sprint 3)
- Mục tiêu & Nghiệp vụ: Tích hợp bản đồ nguồn mở Leaflet / OpenStreetMap trên trang chi tiết đơn hàng: hiển thị vị trí xuất phát từ kho hàng gần nhất, lộ trình di chuyển mô phỏng và địa chỉ nhận hàng của khách hàng.
- Đường dẫn file tác động:
  - Frontend/src/components/order/DeliveryTrackingMap.tsx
  - Frontend/src/pages/account/AccountOrderDetailPage.tsx
- Tiêu chuẩn nghiệm thu: Bản đồ hiển thị tọa độ điểm giao hàng rõ nét, tải mượt mà không cần API key thương mại, hoạt động trơn tru trên cả máy tính và thiết bị di động.

### Nhiệm vụ 5: [2 SP] [ORD-20] Điều Hướng Nhanh Đến Trang Chi Tiết Sản Phẩm Từ Chi Tiết Đơn Hàng
- Người phụ trách: Dương Phúc Thịnh (@38phucthinh)
- Điểm Story Points: 2 SP
- Phân hệ: ORD (FE (UI), Epic: Order & Checkout, Priority: Should-Have, Sprint 3)
- Mục tiêu & Nghiệp vụ: Nâng cấp trải nghiệm người dùng: cho phép khách hàng và Admin click trực tiếp vào hình ảnh hoặc tên dòng máy trong chi tiết đơn hàng để chuyển hướng nhanh sang trang chi tiết điện thoại (PDP).
- Đường dẫn file tác động:
  - Frontend/src/pages/account/AccountOrderDetailPage.tsx
  - Frontend/src/components/admin/AdminOrderDetailDrawer.tsx
- Tiêu chuẩn nghiệm thu: Liên kết chuyển trang chính xác kèm slug sản phẩm, hỗ trợ mở trong tab mới khi giữ phím Ctrl/Command mà không làm gián đoạn phiên làm việc.

### Nhiệm vụ 6: [3 SP] [ORD-21] API Tiếp Nhận & Xử Lý Yêu Cầu Hoàn Tiền Đơn Hàng (Refund Service)
- Người phụ trách: Nguyễn Lê Vũ (@vunguynle1)
- Điểm Story Points: 3 SP
- Phân hệ: ORD (Epic: Order & Checkout, Priority: Must-Have, BE (Service), Sprint 3)
- Mục tiêu & Nghiệp vụ: Xây dựng dịch vụ xử lý hoàn tiền cho đơn hàng đã thanh toán VietQR nhưng phát sinh sự cố hủy đơn hoặc đổi trả máy lỗi: ghi nhận thông tin tài khoản thụ hưởng, lưu vết và cập nhật trạng thái thanh toán sang REFUNDED.
- Đường dẫn file tác động:
  - GreenPhone-Backend/src/main/java/com/re/greenphone/entity/RefundRequest.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/service/RefundService.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/controller/RefundController.java
- Tiêu chuẩn nghiệm thu: Kiểm tra tính hợp lệ của đơn hàng trước khi tạo yêu cầu hoàn tiền; ngăn chặn việc gửi yêu cầu hoàn tiền lặp lại nhiều lần trên cùng một đơn hàng.

### Nhiệm vụ 7: [3 SP] [ORD-22] API Quản Trị Chi Tiết Đơn Hàng & Cập Nhật Trạng Thái Vận Chuyển Toàn Diện
- Người phụ trách: Phan Văn Đạt (@dtphanvan3)
- Điểm Story Points: 3 SP
- Phân hệ: ORD (Epic: Order & Checkout, Priority: Must-Have, BE (Service), Sprint 3)
- Mục tiêu & Nghiệp vụ: Hoàn thiện trọn gói các Admin API phục vụ đội ngũ vận hành: cập nhật mã vận đơn, đơn vị vận chuyển, ngày dự kiến giao; tự động gửi email thông báo mã vận đơn cho khách hàng qua EmailService.
- Đường dẫn file tác động:
  - GreenPhone-Backend/src/main/java/com/re/greenphone/service/admin/AdminOrderService.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/controller/admin/AdminOrderController.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/dto/request/UpdateShippingInfoRequest.java
- Tiêu chuẩn nghiệm thu: Khách hàng nhận được email thông báo có chứa mã vận đơn ngay sau khi nhân viên cập nhật trạng thái đơn sang SHIPPING; chuyển đổi trạng thái tuân thủ Order State Machine.

### Nhiệm vụ 8: [5 SP] [MKT-03] Quản Lý Vòng Đời Voucher, Kiểm Tra Hạn Mức & Đồng Bộ Hoàn Trả
- Người phụ trách: Phan Văn Đạt (@dtphanvan3)
- Điểm Story Points: 5 SP
- Phân hệ: MKT (Epic: Order & Checkout, Priority: Must-Have, BE (Service), Sprint 3)
- Mục tiêu & Nghiệp vụ: Nâng cấp toàn diện Voucher Engine: kiểm tra thời hạn hiệu lực chính xác đến từng giây, giới hạn số lần sử dụng tối đa trên mỗi tài khoản, tự động trừ lượt khi thanh toán và hoàn trả voucher khi đơn hàng bị hủy.
- Đường dẫn file tác động:
  - GreenPhone-Backend/src/main/java/com/re/greenphone/service/PromotionService.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/service/OrderService.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/repository/PromotionRepository.java
- Tiêu chuẩn nghiệm thu: Ngăn chặn tuyệt đối việc sử dụng voucher đã hết hạn hoặc hết lượt; bảo vệ tính toàn vẹn dữ liệu khi nhiều người dùng cùng áp dụng mã đồng thời nhờ khóa bi quan.

### Nhiệm vụ 9: [3 SP] [CAT-19] API Quản Lý Danh Sách Sản Phẩm Yêu Thích (Wishlist Service & Controller)
- Người phụ trách: Nguyễn Văn Toàn (@toannguynvan12)
- Điểm Story Points: 3 SP
- Phân hệ: CAT (Priority: Should-Have, Epic: Catalog & Product, Sprint 3, BE (Service))
- Mục tiêu & Nghiệp vụ: Xây dựng các API quản lý sản phẩm yêu thích của khách hàng dựa trên bảng wishlist đã được khởi tạo trong bản di chuyển V7: thêm sản phẩm, xóa sản phẩm và lấy danh sách yêu thích kèm giá bán, khuyến mãi.
- Đường dẫn file tác động:
  - GreenPhone-Backend/src/main/java/com/re/greenphone/entity/Wishlist.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/repository/WishlistRepository.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/service/WishlistService.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/controller/WishlistController.java
- Tiêu chuẩn nghiệm thu: API kiểm tra tính duy nhất (không lưu trùng 1 sản phẩm 2 lần cho cùng một tài khoản), trả về ApiResponse chuẩn kèm thông tin sản phẩm chi tiết.

### Nhiệm vụ 10: [2 SP] [CAT-20] Đồng Bộ Danh Sách Yêu Thích Với Redux Và API (Wishlist State & Service)
- Người phụ trách: Nguyễn Văn Toàn (@toannguynvan12)
- Điểm Story Points: 2 SP
- Phân hệ: CAT (FE (State), Priority: Should-Have, Epic: Catalog & Product, Sprint 3)
- Mục tiêu & Nghiệp vụ: Xây dựng wishlistSlice trong Redux Toolkit kết hợp Redux Persist để lưu trạng thái yêu thích trên máy khách khi chưa đăng nhập, tự động đồng bộ lên máy chủ qua API khi đăng nhập tài khoản.
- Đường dẫn file tác động:
  - Frontend/src/store/slices/wishlistSlice.ts
  - Frontend/src/services/wishlistService.ts
  - Frontend/src/store/index.ts
- Tiêu chuẩn nghiệm thu: Trạng thái thả tim được ghi nhớ liên tục; khi đăng nhập trên trình duyệt mới dữ liệu tự động đồng bộ và tải về đầy đủ.

### Nhiệm vụ 11: [3 SP] [CAT-21] Giao Diện Trang Danh Mục Yêu Thích & Nút Thả Tim Tương Tác
- Người phụ trách: Nguyễn Văn Toàn (@toannguynvan12)
- Điểm Story Points: 3 SP
- Phân hệ: CAT (FE (UI), Priority: Should-Have, Epic: Catalog & Product, Sprint 3)
- Mục tiêu & Nghiệp vụ: Thiết kế trang giao diện /wishlist hiển thị lưới các sản phẩm khách đã lưu yêu thích kèm nút 'Thêm vào giỏ hàng nhanh'; gắn nút thả tim trên từng thẻ sản phẩm ProductCard và trang chi tiết PDP.
- Đường dẫn file tác động:
  - Frontend/src/pages/account/WishlistPage.tsx
  - Frontend/src/components/product/ProductCard.tsx
  - Frontend/src/pages/product/ProductDetailPage.tsx
- Tiêu chuẩn nghiệm thu: Bấm vào nút thả tim đổi trạng thái tức thì; số lượng badge trên Header tự động nhảy số theo thời gian thực.

### Nhiệm vụ 12: [3 SP] [INV-03] Quản Lý Danh Mục Kho Hàng Và Chi Nhánh Đa Điểm
- Người phụ trách: Nguyễn Trọng Đăng Dương (@dangduongre)
- Điểm Story Points: 3 SP
- Phân hệ: INV (Epic: Inventory & Stock, Priority: Should-Have, Sprint 3, BE (Service))
- Mục tiêu & Nghiệp vụ: Xây dựng trọn gói Backend API và giao diện Admin quản lý các địa điểm kho hàng (Kho Tổng Hà Nội, Kho Chi Nhánh TP.HCM) dựa trên bảng database warehouse đã tạo ở bản di chuyển V5.
- Đường dẫn file tác động:
  - GreenPhone-Backend/src/main/java/com/re/greenphone/entity/Warehouse.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/service/WarehouseService.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/controller/admin/AdminWarehouseController.java
  - Frontend/src/pages/admin/AdminWarehousesPage.tsx
- Tiêu chuẩn nghiệm thu: Admin có thể xem danh sách kho, thêm mới địa điểm chi nhánh kho, cập nhật địa chỉ và trạng thái hoạt động; API trả về ApiResponse chuẩn.

### Nhiệm vụ 13: [5 SP] [INV-04] Quản Lý Nhà Cung Cấp Và Lập Đơn Nhập Hàng Tăng Tồn Kho (Purchase Orders)
- Người phụ trách: Nguyễn Trọng Đăng Dương (@dangduongre)
- Điểm Story Points: 5 SP
- Phân hệ: INV (Epic: Admin & Inventory, Priority: Must-Have, Sprint 3, BE (Core))
- Mục tiêu & Nghiệp vụ: Xây dựng quy trình nhập hàng chuyên nghiệp từ đối tác chính hãng (Apple Vietnam, FPT Synnex, Digiworld): quản lý danh mục nhà cung cấp, lập đơn đặt hàng nhập kho (PO), cập nhật trạng thái đơn (DRAFT -> ORDERED -> RECEIVED).
- Đường dẫn file tác động:
  - GreenPhone-Backend/src/main/java/com/re/greenphone/entity/Supplier.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/entity/PurchaseOrder.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/entity/PurchaseOrderItem.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/service/admin/AdminPurchaseOrderService.java
  - Frontend/src/pages/admin/AdminPurchaseOrdersPage.tsx
- Tiêu chuẩn nghiệm thu: Khi đơn PO chuyển sang RECEIVED, số lượng tồn kho của các biến thể máy được cộng thêm chính xác, đồng thời tự động ghi nhận nhật ký biến động kho (InventoryAuditLog).

### Nhiệm vụ 14: [5 SP] [WAR-01] Tự Động Kích Hoạt Và API Tra Cứu Bảo Hành Điện Tử Theo Mã IMEI
- Người phụ trách: Nguyễn Trọng Đăng Dương (@dangduongre)
- Điểm Story Points: 5 SP
- Phân hệ: WAR (Epic: Order & Checkout, Priority: Must-Have, Sprint 3, BE (Service))
- Mục tiêu & Nghiệp vụ: Xây dựng dịch vụ bảo hành điện tử dựa trên bảng warranty đã tạo ở bản di chuyển V7: tự động kích hoạt gói bảo hành 12 tháng khi đơn hàng sang DELIVERED, sinh mã IMEI và cung cấp API tra cứu GET /api/v1/warranties/check.
- Đường dẫn file tác động:
  - GreenPhone-Backend/src/main/java/com/re/greenphone/entity/Warranty.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/service/WarrantyService.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/controller/WarrantyController.java
  - Frontend/src/pages/warranty/WarrantyLookupPage.tsx
- Tiêu chuẩn nghiệm thu: Nhập số IMEI hợp lệ hiển thị thông tin dòng máy, ngày bắt đầu và kết thúc bảo hành; thông báo rõ ràng nếu IMEI không tồn tại hoặc đã hết hạn bảo hành.

### Nhiệm vụ 15: [2 SP] [ORD-29] Giao Diện Điều Phối Giao Hàng & In Phiếu Giao Cho Admin
- Người phụ trách: Dương Phúc Thịnh (@38phucthinh)
- Điểm Story Points: 2 SP
- Phân hệ: ORD (FE (UI), Priority: Should-Have, Epic: Fulfillment & Shipping, Sprint 3)
- Mục tiêu & Nghiệp vụ: Thiết kế modal đóng gói kiện hàng trên giao diện Admin: chọn đơn vị vận chuyển (GHTK, GHN, Viettel Post), sinh mã vận đơn và in phiếu giao hàng chuẩn khổ giấy (Shipping Label có mã vạch).
- Đường dẫn file tác động:
  - Frontend/src/components/admin/shipping/ShipmentDispatchModal.tsx
  - Frontend/src/components/admin/shipping/PrintShippingLabel.tsx
  - Frontend/src/pages/admin/AdminOrdersPage.tsx
- Tiêu chuẩn nghiệm thu: Admin có thể đóng gói, chọn bưu cục, nhập tiền thu hộ COD và xuất lệnh in phiếu giao hàng trực tiếp trên trình duyệt mà không bị vỡ bố cục.

### Nhiệm vụ 16: [3 SP] [WAR-03] Migration V9 & Nghiệp Vụ Tiếp Nhận Sửa Chữa Bảo Hành Theo IMEI
- Người phụ trách: Vũ Đăng Nguyên (@dangnguyenvu)
- Điểm Story Points: 3 SP
- Phân hệ: WAR (Epic: Warranty & After-Sales, Priority: Must-Have, BE (Core), Sprint 3)
- Mục tiêu & Nghiệp vụ: Viết migration V9 tạo bảng warranty_claim và warranty_claim_history; xây dựng service tiếp nhận yêu cầu sửa chữa bảo hành theo IMEI, phân loại lỗi phần cứng (màn hình, nguồn, pin) và tính phí sửa chữa nếu hết hạn bảo hành.
- Đường dẫn file tác động:
  - GreenPhone-Backend/src/main/resources/db/migration/V9__create_warranty_claims.sql
  - GreenPhone-Backend/src/main/java/com/re/greenphone/entity/WarrantyClaim.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/entity/WarrantyClaimHistory.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/service/WarrantyClaimService.java
- Tiêu chuẩn nghiệm thu: Tạo phiếu tiếp nhận bảo hành thành công kèm mã tiếp nhận ngẫu nhiên (RMA-XXXX); kiểm tra đối chiếu thời hạn bảo hành từ bảng warranty theo số IMEI chính xác.

### Nhiệm vụ 17: [3 SP] [WAR-04] Nghiệp Vụ Đổi Trả Sản Phẩm Lỗi Trong 30 Ngày & Hoàn Tiền (Refund)
- Người phụ trách: Nguyễn Lê Vũ (@vunguynle1)
- Điểm Story Points: 3 SP
- Phân hệ: WAR (Epic: Warranty & After-Sales, Priority: Must-Have, BE (Service), Sprint 3)
- Mục tiêu & Nghiệp vụ: Xây dựng quy tắc nghiệp vụ đổi trả theo chính sách 1 đổi 1 trong 30 ngày đối với lỗi do nhà sản xuất; kích hoạt tạo đơn hàng đổi máy mới tương đương (giảm tồn kho) hoặc chuyển luồng duyệt hoàn tiền.
- Đường dẫn file tác động:
  - GreenPhone-Backend/src/main/java/com/re/greenphone/service/ReturnRequestService.java
  - GreenPhone-Backend/src/main/java/com/re/greenphone/controller/ReturnRequestController.java
- Tiêu chuẩn nghiệm thu: Tự động kiểm tra thời gian từ ngày nhận máy; từ chối tạo yêu cầu nếu đơn hàng đã quá 30 ngày; liên kết chặt chẽ với dịch vụ hoàn tiền RefundService.

### Nhiệm vụ 18: [3 SP] [FE1] Giao Diện Khách Hàng Gửi Yêu Cầu Đổi Trả & Theo Dõi Tiến Độ
- Người phụ trách: Nguyễn Lê Vũ (@vunguynle1)
- Điểm Story Points: 3 SP
- Phân hệ: WAR (FE (UI), Epic: Warranty & After-Sales, Priority: Must-Have, Sprint 3)
- Mục tiêu & Nghiệp vụ: Thiết kế form gửi yêu cầu đổi trả / bảo hành tích hợp trong trang chi tiết đơn hàng của khách hàng: chọn máy, lý do lỗi, tải lên ảnh chụp bằng chứng lỗi và theo dõi tiến trình thẩm định trực quan.
- Đường dẫn file tác động:
  - Frontend/src/pages/account/ReturnRequestPage.tsx
  - Frontend/src/components/warranty/ClaimProgressModal.tsx
  - Frontend/src/pages/account/AccountOrderDetailPage.tsx
- Tiêu chuẩn nghiệm thu: Khách hàng gửi yêu cầu đổi trả mượt mà, upload ảnh bằng chứng thành công lên Cloudflare R2, xem được timeline trạng thái thẩm định theo thời gian thực.

### Nhiệm vụ 19: [3 SP] [WAR-05] Giao Diện Admin Thẩm Định Kỹ Thuật, Xử Lý Đổi Máy & Duyệt Hoàn Tiền
- Người phụ trách: Nguyễn Lê Vũ (@vunguynle1)
- Điểm Story Points: 3 SP
- Phân hệ: WAR (Epic: Admin & Warranty, Priority: Must-Have, Sprint 3, FE (Admin))
- Mục tiêu & Nghiệp vụ: Xây dựng màn hình Back-office cho Admin và Kỹ thuật viên: duyệt danh sách yêu cầu đổi trả, xem ảnh chụp lỗi phóng to, thực hiện thẩm định (Duyệt đổi máy mới / Duyệt hoàn tiền / Từ chối kèm lý do).
- Đường dẫn file tác động:
  - Frontend/src/pages/admin/AdminWarrantyClaimsPage.tsx
  - Frontend/src/pages/admin/AdminReturnsPage.tsx
  - Frontend/src/components/admin/warranty/ReviewReturnModal.tsx
- Tiêu chuẩn nghiệm thu: Giao diện trực quan, đổi trạng thái phiếu ngay lập tức trên bảng; khi duyệt đổi máy mới tồn kho biến thể tự động trừ 1 máy mới.

---

## 8. CHIẾN LƯỢC KẾT NỐI BE - FE, KỊCH BẢN DEMO VÀ DEFINITION OF DONE

### 8.1. Kịch bản Demo thực nghiệm cuối Sprint 3
1. Kịch bản Giao vận & Xuất kho (dangnguyenvu & 38phucthinh):
   - Admin vào trang Quản lý đơn hàng -> Bấm nút 'Đóng gói xuất kho' -> Modal chọn đơn vị GHN và in phiếu vận đơn có mã vạch.
   - Khách hàng vào trang chi tiết đơn hàng -> Xem bản đồ OpenStreetMap hiển thị tiến trình vận chuyển theo thời gian thực.
   - Khi trạng thái chuyển sang DELIVERED -> Tự động chuyển đơn hàng sang COMPLETED và kích hoạt bảo hành điện tử 12 tháng.

2. Kịch bản Khiếu nại đổi trả và Thẩm định kỹ thuật (vunguynle1 & dangnguyenvu):
   - Khách hàng có đơn hàng đã giao thành công trong vòng 30 ngày -> Bấm nút 'Yêu cầu Đổi trả / Bảo hành' -> Chọn lỗi sọc màn hình, upload 2 ảnh bằng chứng lên Cloudflare R2.
   - Admin Kỹ thuật vào trang Quản lý Đổi trả -> Xem ảnh bằng chứng lỗi phóng to -> Bấm nút 'Duyệt Đổi Máy Mới' -> Tồn kho máy mới tự động giảm 1 và tạo kiện hàng đổi mới gửi đến khách hàng.

3. Kịch bản Nhập hàng PO tăng tồn kho (dangduongre):
   - Admin tạo đơn nhập hàng PO chọn nhà cung cấp Apple Vietnam LLC và nhập 20 chiếc iPhone 15 Pro Max -> Chuyển trạng thái sang RECEIVED -> Hệ thống tự động tăng tồn kho stock_quantity tương ứng.

### 8.2. Tiêu chuẩn hoàn thành (Definition of Done - DoD)
1. Toàn bộ 19 thẻ công việc đều có mã nguồn hoàn chỉnh, không có cảnh báo nghiêm trọng.
2. Backend: Lệnh ./gradlew test chạy thành công 100% test cases (Pass rate 100%).
3. Frontend: Lệnh npm run build biên dịch sạch sẽ không có lỗi TypeScript hay ESLint.
4. Tuyệt đối không sử dụng icon/emoji trong mã nguồn, thông báo giao diện và tài liệu báo cáo.
5. Toàn bộ các API đều bọc trong cấu trúc chuẩn ApiResponse<T>.

---

## 9. MA TRẬN QUẢN TRỊ RỦI RO & BIỆN PHÁP ỨNG PHÓ (RISK MANAGEMENT)

| Rủi Ro Nhận Diện | Mức Độ | Ảnh Hưởng | Biện Pháp Ứng Phó & Khắc Phục |
|---|:---:|---|---|
| Xung đột dữ liệu khi hoàn kho đổi máy và xuất kho đơn mới | Cao | Sai lệch tồn kho thực tế | Áp dụng khóa bi quan (@Lock Pessimistic Write) khi xử lý duyệt đổi máy mới hoặc nhập kho PO. |
| Lỗi mạng khi upload ảnh bằng chứng bảo hành lên Cloudflare R2 | Trung bình | Khách hàng không gửi được yêu cầu đổi trả | Thiết lập timeout hợp lý, nén ảnh phía client trước khi upload và hỗ trợ cơ chế retry tự động. |
| Bản đồ OpenStreetMap tải chậm trên mạng di động yếu | Thấp | Trải nghiệm theo dõi đơn hàng bị giật lag | Sử dụng tile server CDN tối ưu, lazy-load component bản đồ chỉ khi người dùng cuộn đến vị trí theo dõi. |
| Khách hàng gửi yêu cầu đổi trả vượt quá thời hạn 30 ngày | Thấp | Phát sinh tranh chấp bảo hành | Kiểm tra chặt chẽ điều kiện thời gian cả ở giao diện Frontend (ẩn nút) và validate nghiêm ngặt tại Backend API. |

---

## 10. KẾT LUẬN VÀ CAM KẾT ĐẦU SPRINT 3

Báo cáo kế hoạch Sprint 3 đã đồng bộ 100% với hiện trạng thực tế trên Trello Board của nhóm GreenPhone. Với 19 nhiệm vụ kỹ thuật trọng tâm phân bổ cân đối cho 06 thành viên (tổng 60 Story Points), nhóm cam kết tập trung tối đa nguồn lực, hoàn thành nghiệm thu đúng tiến độ và đảm bảo chất lượng hệ thống cao nhất.

ĐẠI DIỆN NHÓM PHÁT TRIỂN
Trưởng Nhóm Kỹ Thuật (Tech Lead)
Vũ Đăng Nguyên

XÁC NHẬN CỦA TECH LEAD MENTOR / HỘI ĐỒNG OJT
Rikkei Academy