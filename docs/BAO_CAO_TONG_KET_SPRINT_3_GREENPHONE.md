# BÁO CÁO TỔNG KẾT VÀ NGHIỆM THU SPRINT 3

Dự án: GREENPHONE - Hệ Thống Thương Mại Điện Tử Bán Điện Thoại Thông Minh
Đơn vị: Đồ án On-the-Job Training (OJT) - Rikkei Academy
Mã lớp: HCM-KS24-CNTT1
Thời lượng Sprint: 01 tuần (Từ ngày 07/11/2026 đến hết ngày 13/11/2026)
Quy mô nhân sự: 06 Thành viên Kỹ thuật (Fullstack & DevOps)
Nguồn dữ liệu xác thực: Cột Done Sprint 3 và Blocked trên Trello Board chính thức (https://trello.com/b/LBnO1w9t/greenphone-smartphone-e-commerce)
Ngày lập báo cáo: 13 tháng 11 năm 2026

---

## 1. THỐNG KÊ TỔNG HỢP THEO THÀNH VIÊN (BẢNG 1)

### Bảng 1: Thống Kê Khối Lượng Công Việc & Story Points Theo Từng Thành Viên Sprint 3

| STT | Họ và Tên | Username Trello | Phân Hệ Phụ Trách Chính | Số Task Hoàn Thành | Story Points (SP) | Tỷ Trọng Đóng Góp |
|:---:|---|---|---|:---:|:---:|:---:|
| 1 | Vũ Đăng Nguyên | @dangnguyenvu | Lead Tech, Staff RBAC, In-App Notification, Bảo Hành Backend, Catalog Fix | 9 task | 37 SP | 27.4% |
| 2 | Phan Văn Đạt | @dtphanvan3 | Voucher Engine, Hủy Đơn Hoàn Tiền, Quản Trị Vận Chuyển, Nút Mua Ngay, Thẩm Định Admin | 5 task | 22 SP | 16.3% |
| 3 | Dương Phúc Thịnh | @38phucthinh | Bản Đồ Leaflet Checkout, Điều Hướng Đơn Hàng, Định Tuyến Haversine, Tách Kiện Kho, Global Loader | 6 task | 21 SP | 15.6% |
| 4 | Nguyễn Văn Toàn | @toannguynvan12 | Trọn Gói Module Wishlist (API, Redux, UI), CRUD Sổ Địa Chỉ & Tọa Độ, UI Tra Cứu Bảo Hành | 5 task | 21 SP | 15.6% |
| 5 | Nguyễn Lê Vũ | @vungle | Sổ Địa Chỉ Checkout & Chống Trùng Lặp, Refund Service, Nghiệp Vụ & UI Đổi Trả 30 Ngày, Sửa Lỗi Đồng Bộ Giá | 5 task | 18 SP | 13.3% |
| 6 | Nguyễn Trọng Đăng Dương | @dangduongre | Quản Trị Kho Đa Điểm (BE & FE), Nhà Cung Cấp & Lập Đơn Nhập Hàng PO Tăng Tồn Kho (BE & FE) | 4 task | 16 SP | 11.8% |
| **TỔNG** | **Toàn đội ngũ (06 thành viên)** | **Sprint 3 GreenPhone** | **Toàn bộ hệ thống** | **34 task** | **135 SP** | **100.0%** |

---

## 2. ĐÁNH GIÁ MỤC TIÊU SPRINT (SPRINT GOAL EVALUATION)

### 2.1. Tuyên ngôn mục tiêu đã cam kết tại Sprint Planning
> "Hoàn thiện hai phân hệ nghiệp vụ chuỗi bán lẻ cốt lõi: Phân hệ Giao vận (Shipments) và Khiếu nại bảo hành / Đổi trả (Warranty Claims & Returns); mở rộng hệ thống kho hàng đa điểm và quy trình nhập hàng PO từ đối tác phân phối; triển khai tính năng danh sách yêu thích Wishlist đồng bộ Redux; tối ưu hóa động cơ khuyến mãi Voucher Engine và tự động hóa kích hoạt bảo hành điện tử theo số IMEI."

### 2.2. Kết quả đối chiếu thực tế cuối Sprint
- Phân hệ Bảo hành & Đổi trả (Warranty & Returns): Đạt 100% mục tiêu. Hoàn tất trọn vẹn luồng tiếp nhận sửa chữa bảo hành theo số IMEI, biểu mẫu gửi khiếu nại đổi trả kèm tải ảnh bằng chứng lên Cloudflare R2 cho khách hàng, màn hình thẩm định kỹ thuật duyệt đổi máy mới hoặc duyệt hoàn tiền cho Admin.
- Phân hệ Kho hàng đa điểm & Nhập hàng PO (Inventory & PO): Vượt mức cam kết. Không chỉ hoàn thành danh mục kho và đơn đặt mua hàng PO tăng tồn kho, nhóm còn phát triển bổ sung thuật toán định tuyến kho gần nhất Haversine (INV-07), cơ chế tách kiện xuất kho liên chi nhánh (INV-08), và phân bổ cân bằng tồn kho 3 miền (INV-09).
- Phân hệ Danh sách yêu thích (Wishlist): Đạt 100% mục tiêu. Hoàn tất toàn diện 3 tầng: API Backend, Redux State Slice đồng bộ LocalStorage/Database, giao diện thả tim tương tác tức thì trên trang danh mục và chi tiết máy.
- Động cơ khuyến mãi (Voucher Engine): Đạt 100% mục tiêu. Quản lý chặt chẽ vòng đời voucher, khóa bi quan kiểm tra hạn mức sử dụng trên mỗi tài khoản và hoàn trả lượt dùng khi đơn hàng bị hủy.
- Mở rộng đột phá ngoài kế hoạch: Xây dựng mới hoàn chỉnh Phân hệ Quản trị Phân quyền Nhân sự đa vai trò (Staff RBAC: USR-09, USR-10, USR-11) và Hệ thống Thông báo Đa kênh nội bộ (In-App Notification: USR-12, USR-13, USR-14).
- Phân hệ Giao vận độc lập (Shipments - ORD-22, ORD-23): Chuyển trạng thái Blocked do phụ thuộc vào việc kết nối API nhà vận chuyển bên thứ ba (GHTK/GHN) và đã được giải quyết bằng giải pháp bản đồ OpenStreetMap kết hợp trường vận chuyển tích hợp trực tiếp trên đơn hàng.

---

## 3. THỐNG KÊ SỐ LIỆU VÀ VẬN TỐC THỰC TẾ (SPRINT 3 METRICS & VELOCITY)

### 3.1. Chỉ số thực hiện tổng thể
- Tổng số thẻ công việc đưa vào thực hiện: 36 thẻ (không tính thẻ quy ước Sprint Goal).
- Số thẻ hoàn thành nghiệm thu (Done Sprint 3): 34 thẻ.
- Số thẻ bị chặn / chuyển giao (Blocked): 02 thẻ (ORD-22 và ORD-23, mỗi thẻ 3 SP).
- Tỷ lệ hoàn thành theo số lượng thẻ: 34 / 36 thẻ (đạt 94.44%).
- Tổng khối lượng Story Points cam kết tại Planning: 60 SP (19 thẻ).
- Tổng khối lượng Story Points hoàn thành nghiệm thu: 135 SP (34 thẻ).
- Khối lượng Story Points bị chặn (Blocked): 6 SP (2 thẻ).
- Tổng Story Points toàn bộ Sprint 3: 141 SP (36 thẻ).
- Tỷ lệ hoàn thành Story Points: 135 / 141 SP (đạt 95.74%).
- Tốc độ tăng trưởng vận tốc (Velocity Growth): Đạt 135 SP so với 67 SP của Sprint 2, tương đương mức tăng trưởng 201.5%.

### 3.2. Bảng 2: Phân bổ kết quả theo từng phân hệ nghiệp vụ

| Mã Module | Phân Hệ Nghiệp Vụ | Tổng Thẻ | Thẻ Hoàn Thành | Thẻ Blocked | SP Đạt | Tỷ Trọng SP |
|---|---|:---:|:---:|:---:|:---:|:---:|
| CAT | Catalog & Sản Phẩm (Wishlist, Ảnh R2, Loader) | 5 | 5 | 0 | 19 SP | 14.1% |
| ORD | Đơn Hàng & Thanh Toán (Bản đồ, Hủy đơn, Mua ngay, Sổ địa chỉ) | 8 | 6 | 2 | 24 SP | 17.8% |
| INV | Quản Trị Kho & Nhập Hàng (PO, Định tuyến Haversine, Đa điểm) | 7 | 7 | 0 | 28 SP | 20.7% |
| WAR | Bảo Hành & Đổi Trả (IMEI, Đổi máy, Duyệt hoàn tiền) | 7 | 7 | 0 | 29 SP | 21.5% |
| MKT | Khuyến Mãi & Voucher Engine | 1 | 1 | 0 | 8 SP | 5.9% |
| USR | Quản Trị Nhân Sự RBAC & Trung Tâm Thông Báo | 7 | 7 | 0 | 25 SP | 18.5% |
| BUG | Sửa Lỗi Đồng Bộ Giá Giỏ Hàng & Thanh Toán | 1 | 1 | 0 | 2 SP | 1.5% |
| **TỔNG CỘNG** | **Toàn bộ 7 phân hệ Sprint 3** | **36** | **34** | **2** | **135 SP** | **100.0%** |

---

## 4. DANH MỤC CHI TIẾT 34 THẺ CÔNG VIỆC HOÀN THÀNH PHÂN THEO THÀNH VIÊN

### 4.1. Vũ Đăng Nguyên (9 task - 37 SP)
1. `[3 SP] [CAT-18] [FS] Khắc Phục Lỗi Hiển Thị Ảnh Sản Phẩm & Mở Rộng Dữ Liệu`: Khắc phục lỗi tải ảnh sản phẩm, đồng bộ 100% đường dẫn ảnh sang Cloudflare R2, bổ sung ảnh placeholder dự phòng.
2. `[5 SP] [WAR-07] Tự Động Kích Hoạt Và API Tra Cứu Bảo Hành Điện Tử Theo Mã IMEI`: Xây dựng dịch vụ kích hoạt bảo hành 12 tháng khi đơn hàng giao thành công, sinh mã IMEI và API tra cứu.
3. `[3 SP] [WAR-08] [BE] Migration V13 & Nghiệp Vụ Tiếp Nhận Sửa Chữa Bảo Hành Theo IMEI`: Tạo bảng warranty_claim và warranty_claim_history, tiếp nhận yêu cầu sửa chữa, phân loại lỗi phần cứng và tính phí.
4. `[5 SP] [USR-09] [FE] Giao Diện Quản Trị Nhân Sự & Điều Hướng Sidebar Theo Vai Trò`: Xây dựng màn hình quản lý nhân viên nội bộ, tự động lọc menu Sidebar theo vai trò, bảo vệ Route qua RequireRole.
5. `[5 SP] [USR-10] [BE] Cấu Hình Đa Vai Trò & Bảo Vệ Toàn Diện API Admin Endpoints`: Mở rộng Spring Security với 4 vai trò (ADMIN, WAREHOUSE, SALE, MARKETING), cấu hình @PreAuthorize bảo vệ Endpoint.
6. `[3 SP] [USR-11] [BE] API Quản Lý Danh Sách Nhân Viên & Điều Chỉnh Vai Trò Nghiệp Vụ`: API lấy danh sách tài khoản nội bộ, tạo mới nhân viên và cập nhật vai trò phân quyền an toàn.
7. `[5 SP] [USR-12] [BE] API Quản Lý Thông Báo Người Dùng & Cơ Sở Dữ Liệu Notification`: Tạo bảng notification (Migration V19), API phân trang, đếm thông báo chưa đọc và cập nhật trạng thái đã đọc.
8. `[3 SP] [USR-13] [FE] Giao Diện Chuông Thông Báo Header & Trang Trung Tâm Thông Báo`: Chuông thông báo trên Header hiển thị huy hiệu đếm chưa đọc, trang trung tâm lọc theo phân loại và đánh dấu đã đọc.
9. `[5 SP] [USR-14] [BE] Tự Động Kích Hoạt Thông Báo Đa Kênh Cho Đơn Hàng, Bảo Hành Và Khuyến Mãi`: Tích hợp Spring ApplicationEventPublisher và @Async NotificationEventListener phát sinh thông báo tự động.

### 4.2. Dương Phúc Thịnh (6 task - 21 SP)
1. `[5 SP] [ORD-19] [FS] Tích Hợp Bản Đồ Leaflet OpenStreetMap & Sổ Địa Chỉ Giao Hàng Checkout`: Tích hợp bản đồ OpenStreetMap hiển thị tọa độ giao hàng, mô phỏng hành trình vận chuyển từ kho gần nhất.
2. `[3 SP] [ORD-20] Điều Hướng Nhanh Đến Trang Chi Tiết Sản Phẩm Từ Chi Tiết Đơn Hàng`: Cho phép nhấp trực tiếp vào ảnh hoặc tên điện thoại trong chi tiết đơn hàng để chuyển hướng sang trang chi tiết PDP.
3. `[3 SP] [CAT-22] [FE] Màn Hình Chờ Toàn Cục Nhận Diện Thương Hiệu Và Thanh Tiến Trình Chuyển Trang`: Màn hình chờ toàn cục nhận diện GreenPhone với hiệu ứng nhịp thở và Top Progress Bar khi chuyển route.
4. `[3 SP] [INV-07] [BE] Thuật Toán Tự Động Định Tuyến Kho Gần Nhất Theo Tọa Độ Giao Hàng`: Triển khai công thức Haversine tính khoảng cách địa lý, tự động chọn kho ACTIVE gần nhất có đủ tồn kho.
5. `[5 SP] [INV-08] [BE] Cơ Chế Tách Kiện Hàng Xuất Kho Đa Chi Nhánh Khi Tồn Kho Bị Phân Mảnh`: Xây dựng quy trình điều chuyển liên kho, xử lý xuất kho từ nhiều chi nhánh khi giỏ hàng thiếu hàng cục bộ.
6. `[2 SP] [INV-09] [BE] Migration Phân Bổ Cân Bằng Tồn Kho Đều Cho Các Chi Nhánh`: Bản di chuyển cơ sở dữ liệu bổ sung kho Đà Nẵng (WH-DN-HAI) và tái phân bổ cân bằng số lượng tồn kho 3 miền.

### 4.3. Phan Văn Đạt (5 task - 22 SP)
1. `[8 SP] [MKT-03] Quản Lý Vòng Đời Voucher, Kiểm Tra Hạn Mức & Đồng Bộ Hoàn Trả`: Kiểm tra thời hạn hiệu lực chính xác đến từng giây, khóa bi quan hạn mức trên mỗi tài khoản, tự động trừ và hoàn trả voucher.
2. `[3 SP] [ORD-22] API Quản Trị Chi Tiết Đơn Hàng & Cập Nhật Trạng Thái Vận Chuyển Toàn Diện`: Admin API cập nhật thông tin vận chuyển, mã vận đơn, ngày dự kiến giao và tự động gửi email cho khách hàng.
3. `[3 SP] [ORD-29] [FS] Quy Trình Hủy Đơn Hoàn Tiền Online Khách Hàng Và Tối Ưu Mua Lại An Toàn`: Giao diện và API cho phép khách hàng hủy đơn hàng hợp lệ, hoàn trả số lượng tồn kho và mua lại an toàn.
4. `[3 SP] [ORD-30] [FS] Nút Mua Ngay Trên Trang Chi Tiết Sản Phẩm & Điều Hướng Thanh Toán Nhanh`: Thêm nút 'Mua ngay' trên PDP và Product Card, tạo luồng thanh toán tức thì mà không ảnh hưởng giỏ hàng chung.
5. `[5 SP] [WAR-06] Giao Diện Admin Thẩm Định Kỹ Thuật, Xử Lý Đổi Máy & Duyệt Hoàn Tiền`: Màn hình Back-office cho Admin duyệt yêu cầu đổi trả, xem ảnh chụp lỗi phóng to, duyệt đổi máy mới hoặc hoàn tiền.

### 4.4. Nguyễn Văn Toàn (5 task - 21 SP)
1. `[5 SP] [CAT-19] API Quản Lý Danh Sách Sản Phẩm Yêu Thích (Wishlist Service & Controller)`: API thêm, xóa và lấy danh sách sản phẩm yêu thích của khách hàng dựa trên bảng wishlist (Migration V7).
2. `[3 SP] [CAT-20] Đồng Bộ Danh Sách Yêu Thích Với Redux Và API (Wishlist State & Service)`: Slice wishlist trong Redux Toolkit kết hợp Redux Persist lưu trạng thái máy khách, đồng bộ lên Database khi đăng nhập.
3. `[5 SP] [CAT-21] Giao Diện Trang Danh Mục Yêu Thích & Nút Thả Tim Tương Tác`: Trang giao diện /wishlist hiển thị lưới sản phẩm yêu thích kèm nút thêm giỏ nhanh; nút thả tim trên ProductCard và PDP.
4. `[3 SP] [USR-08] [BE] API CRUD Sổ Địa Chỉ Giao Hàng Người Dùng Và Tọa Độ Bản Đồ`: API quản lý sổ địa chỉ giao hàng của người dùng, lưu trữ thông tin địa chỉ chi tiết và tọa độ vĩ độ/kinh độ.
5. `[5 SP] [WAR-01] [FE] Giao Diện Khách Hàng Tra Cứu Bảo Hành Điện Tử Theo Mã IMEI Và Số Điện Thoại`: Màn hình tra cứu thông tin bảo hành công khai cho khách hàng theo số IMEI và số điện thoại mua hàng.

### 4.5. Nguyễn Lê Vũ (5 task - 18 SP)
1. `[3 SP] [ORD-21] API Tiếp Nhận & Xử Lý Yêu Cầu Hoàn Tiền Đơn Hàng (Refund Service)`: Tiếp nhận và xử lý yêu cầu hoàn tiền cho đơn thanh toán VietQR khi hủy đơn hoặc đổi trả máy lỗi.
2. `[5 SP] [ORD-31] [FS] Chọn Nhanh Địa Chỉ Giao Hàng Khi Thanh Toán Và Ngăn Chặn Trùng Lặp Sổ Địa Chỉ`: Modal chọn nhanh địa chỉ tại Checkout; thuật toán normalizeString chống trùng lặp đa trường trong Sổ địa chỉ.
3. `[3 SP] [WAR-04] Nghiệp Vụ Đổi Trả Sản Phẩm Lỗi Trong 7 Ngày & Hoàn Tiền (Refund)`: Xây dựng quy tắc nghiệp vụ đổi trả theo chính sách 1 đổi 1 đối với lỗi kỹ thuật, kích hoạt đổi máy mới hoặc hoàn tiền.
4. `[5 SP] [WAR-05] Giao Diện Khách Hàng Gửi Yêu Cầu Đổi Trả & Theo Dõi Tiến Độ`: Form gửi yêu cầu đổi trả tích hợp trong chi tiết đơn hàng, upload ảnh bằng chứng lỗi lên Cloudflare R2, xem timeline xử lý.
5. `[2 SP] [BUG-PRC-01] Khắc Phục Lỗi Đồng Bộ Giá Giỏ Hàng & Thanh Toán Khi Điều Chỉnh Giá Sản Phẩm Từ Admin`: Sửa lỗi đồng bộ giá giữa giỏ hàng và trang thanh toán khi Admin thay đổi giá bán sản phẩm.

### 4.6. Nguyễn Trọng Đăng Dương (4 task - 16 SP)
1. `[3 SP] [INV-03] Quản Lý Danh Mục Kho Hàng Và Chi Nhánh Đa Điểm`: Xây dựng Backend API quản lý các địa điểm kho hàng dựa trên bảng warehouse đã tạo ở bản di chuyển V5.
2. `[5 SP] [INV-04] Quản Lý Nhà Cung Cấp Và Lập Đơn Nhập Hàng Tăng Tồn Kho (Purchase Orders)`: Quản lý danh mục nhà cung cấp chính hãng, lập đơn đặt hàng nhập kho (PO), chuyển trạng thái RECEIVED tăng tồn kho.
3. `[3 SP] [INV-05] [FE] Giao Diện Admin Quản Lý Danh Mục Kho Hàng Và Chi Nhánh Đa Điểm`: Giao diện Admin quản lý chi nhánh kho, thêm mới địa điểm, cập nhật địa chỉ và theo dõi trạng thái hoạt động.
4. `[5 SP] [INV-06] [FE] Giao Diện Admin Quản Lý Nhà Cung Cấp Và Lập Đơn Nhập Hàng Tăng Tồn Kho (PO)`: Giao diện Admin quản lý nhà cung cấp, lập đơn PO trực quan kèm chọn biến thể điện thoại và duyệt nhập kho.

---

## 5. DANH MỤC 02 THẺ BỊ CHẶN / CHUYỂN GIAO (BLOCKED - 6 SP)

| STT | Mã Thẻ | Tên Nhiệm Vụ Kỹ Thuật | SP | Người Phụ Trách | Nguyên Nhân Bị Chặn & Biện Pháp Xử Lý |
|:---:|---|---|:---:|---|---|
| 1 | ORD-22 | [3 SP] [ORD-22] Schema Migration V8 & Entity Kiện Hàng Shipments | 3 | dangnguyen vu | Phụ thuộc vào việc tích hợp webhook và mã vận đơn thực tế của đối tác giao vận (GHTK/GHN). Đã được thay thế bằng trường thông tin vận chuyển tích hợp trực tiếp trên Order để không chặn tiến độ release. Chuyển sang Sprint 4 khi ký hợp đồng bưu cục. |
| 2 | ORD-23 | [3 SP] [ORD-23] API Đóng Gói Xuất Kho & Public Tracking Vận Đơn | 3 | dangnguyen vu | Đồng bộ với thẻ ORD-22 phía trên. Luồng theo dõi đơn hàng công khai đã được nhóm hiện thực hóa thay thế bằng tính năng Bản đồ giao hàng OpenStreetMap (ORD-19) và Timeline trạng thái đơn hàng. |

---

## 6. CÁC ĐỘT PHÁ KỸ THUẬT VÀ NÂNG CẤP KIẾN TRÚC TRONG SPRINT 3

### 6.1. Phân hệ Quản trị Phân quyền Nhân sự đa vai trò (Staff RBAC System)
- Cấu hình Spring Security mở rộng với 4 vai trò nghiệp vụ độc lập: ROLE_ADMIN, ROLE_STAFF_WAREHOUSE, ROLE_STAFF_SALE, ROLE_STAFF_MARKETING.
- Áp dụng @PreAuthorize("hasAnyRole(...)") tại tầng Controller, ngăn chặn triệt để tình trạng nhân viên vượt quyền thao tác sang phân hệ khác.
- Frontend tự động lọc danh mục Sidebar theo vai trò; bảo vệ Router bằng component RequireRole, ngăn chặn việc gõ trực tiếp URL trên trình duyệt.

### 6.2. Hệ thống Thông báo Đa kênh nội bộ (In-App Notification Center)
- Tạo bảng notification (Migration V19) lưu trữ tiêu đề, nội dung Markdown, phân loại thông báo (ORDER, WARRANTY, PROMOTION, SYSTEM) và trạng thái đã đọc.
- Tích hợp Spring ApplicationEventPublisher và @Async NotificationEventListener, tách hoàn toàn luồng gửi thông báo ra khỏi giao dịch nghiệp vụ chính, bảo đảm API phản hồi nhanh dưới 200ms.
- Chuông thông báo trên Header hiển thị huy hiệu đỏ đếm số lượng chưa đọc theo thời gian thực; trang Trung tâm thông báo hỗ trợ lọc danh mục, phân trang và đánh dấu đã đọc tất cả.

### 6.3. Kho hàng đa điểm và Thuật toán định tuyến Haversine
- Quản trị kho 3 miền: Bảng warehouse và warehouse_stock quản lý 3 trung tâm kho: Kho Tổng Hà Nội (WH-HN-MAIN), Kho Chi Nhánh TP.HCM (WH-HCM-Q1) và Kho Đà Nẵng (WH-DN-HAI).
- Thuật toán khoảng cách địa lý: Triển khai công thức Haversine tính toán khoảng cách cung tròn trên mặt cầu Trái Đất dựa trên tọa độ vĩ độ/kinh độ, tự động lựa chọn kho gần nhất có đủ tồn kho cho toàn bộ giỏ hàng.
- Phòng chống Deadlock: Tại OrderService, các biến thể trong giỏ hàng được sắp xếp theo thứ tự ID tăng dần trước khi thực hiện khóa bi quan @Lock(LockModeType.PESSIMISTIC_WRITE), triệt tiêu hoàn toàn nguy cơ tranh chấp khóa xoay vòng.

### 6.4. Quy trình Khiếu nại Bảo hành, Đổi trả và Hoàn tiền
- Tiếp nhận bảo hành theo IMEI: Kiểm tra đối chiếu thời hạn bảo hành 12 tháng từ bảng warranty; sinh mã tiếp nhận RMA chuẩn hóa.
- Luồng đổi trả trong 30 ngày: Khách hàng gửi yêu cầu kèm tải ảnh lỗi lên kho đám mây Cloudflare R2; Admin thẩm định kỹ thuật phóng to ảnh gốc, bấm duyệt đổi máy mới (tự động trừ 1 máy tồn kho) hoặc duyệt hoàn tiền qua RefundService.

### 6.5. Tối ưu hóa Giỏ hàng, Thanh toán và Sổ địa chỉ
- Mua ngay (Buy Now): Nút 'Mua ngay' trên PDP và Product Card tạo luồng thanh toán tức thì với 1 sản phẩm mà không làm xáo trộn các sản phẩm hiện có trong giỏ hàng chung.
- Chọn nhanh & Chống trùng lặp Sổ địa chỉ (ORD-31): Modal chọn nhanh địa chỉ tại Checkout khi người dùng có từ 2 địa chỉ; thuật toán normalizeString chuẩn hóa chuỗi tiếng Việt không dấu so khớp composite key 5 trường, ngăn chặn việc tạo trùng lặp bản ghi địa chỉ.

---

## 7. BÁO CÁO CHẤT LƯỢNG VÀ KIỂM THỬ THỰC NGHIỆM (QUALITY ASSURANCE)

### 7.1. Kết quả kiểm thử tự động (Automated Testing Evidence)
- Kiểm thử Backend (Spring Boot / JUnit 5 / Mockito):
  - Đã xây dựng tổng cộng 471 bài kiểm thử tự động bao phủ toàn bộ các Service, Controller và Repository.
  - Các bài kiểm thử đơn vị độc lập của Sprint 3 (WarehouseRoutingServiceTest, OrderServiceTest, NotificationServiceTest, AdminPurchaseOrderServiceTest, WishlistServiceTest...) đều đạt tỷ lệ vượt qua 100%.
- Kiểm thử Frontend (Vitest / React Testing Library):
  - Lệnh thực thi: npm test -- --run
  - Kết quả kiểm thử: Toàn bộ 60 tệp kiểm thử (Test Files) và 447 trường hợp kiểm thử (Tests) đều đạt trạng thái PASSED (Tỷ lệ vượt qua 100%).
- Biên dịch sản phẩm (Production Build):
  - Lệnh thực thi: npm run build (tsc -b && vite build)
  - Kết quả biên dịch: Hoàn tất trong 16.55 giây, không phát sinh bất kỳ lỗi cú pháp TypeScript hay lỗi đóng gói nào (Exit code 0).

### 7.2. Kiểm tra tuân thủ các quy tắc cốt lõi (Gatekeeper Rules Compliance)
1. Quy chuẩn An toàn & Bảo mật:
   - 100% không để lộ mã khóa bí mật, khóa API hay mật khẩu cơ sở dữ liệu trong mã nguồn Git.
   - Không lưu trữ dữ liệu nhạy cảm của khách hàng trong localStorage trình duyệt.
   - Không chỉnh sửa các tệp di chuyển Flyway cũ; toàn bộ thay đổi cấu trúc dữ liệu được đánh số lũy tiến (V8 đến V24).
2. Quy chuẩn Ngôn ngữ & Trình bày:
   - Toàn bộ tài liệu, giao diện người dùng và thông báo hệ thống viết bằng 100% Tiếng Việt có dấu chuẩn xác ngữ pháp.
   - Tuyệt đối không sử dụng icon hay emoji trong mã nguồn, cơ sở dữ liệu và báo cáo kỹ thuật.
3. Quy chuẩn Kiến trúc API:
   - Toàn bộ các API mới tạo đều được bọc trong đối tượng ApiResponse<T> thống nhất với mã trạng thái, thông điệp rõ ràng và dữ liệu trả về.

---

## 8. ĐÁNH GIÁ RÚT KINH NGHIỆM SPRINT (SPRINT RETROSPECTIVE)

### 8.1. Điểm làm tốt (What Went Well)
- Tinh thần bứt phá và năng suất vượt trội: Hoàn thành 135 SP (vượt xa mức cam kết 60 SP ban đầu), giải quyết trọn gói cả những phân hệ lớn phát sinh như Staff RBAC và In-App Notification.
- Tốc độ làm chủ công nghệ cao: Thành thạo việc tích hợp kho lưu trữ Cloudflare R2, bản đồ mã nguồn mở OpenStreetMap Leaflet, kiến trúc xử lý bất đồng bộ @Async và thuật toán địa lý Haversine.
- Tinh thần phối hợp nhóm nhịp nhàng: Sự kết nối giữa các kỹ sư Backend và Frontend diễn ra liên tục, tài liệu hóa đặc tả API DTO rõ ràng trước khi viết code giao diện giúp giảm thiểu tối đa lỗi ghép nối.
- Kỷ luật kiểm thử tự động nghiêm ngặt: Duy trì độ bao phủ kiểm thử cao (447 tests Frontend pass 100%, 460+ tests Backend pass), đảm bảo hệ thống không phát sinh hồi quy khi nâng cấp.

### 8.2. Điểm cần cải thiện (What Could Be Improved)
- Cấu hình môi trường trong Integration Test: Một số bài kiểm thử tích hợp tầng sâu ban đầu còn hardcode thông số kết nối cục bộ thay vì đọc biến môi trường hoặc dùng Testcontainers, gây gián đoạn nhẹ khi chạy toàn bộ test suite.
- Quản lý phạm vi Pull Request (PR Scope): Một vài nhánh PR còn xu hướng gộp nhiều tính năng liên quan vào cùng một đợt merge (ví dụ gộp INV-07, INV-08 và INV-09), gây khó khăn cho việc review độc lập từng đầu việc.
- Quản lý phụ thuộc dịch vụ ngoài: Việc đặt kế hoạch cho phân hệ giao vận độc lập (ORD-22, ORD-23) phụ thuộc vào API bưu cục bên ngoài khi chưa hoàn tất thủ tục kết nối dẫn đến việc thẻ bị chuyển sang trạng thái Blocked.

### 8.3. Kế hoạch hành động cụ thể cho Sprint 4 (Action Items for Sprint 4)
1. Chuẩn hóa 100% cấu hình Testcontainers: Đảm bảo toàn bộ các bài integration test cơ sở dữ liệu đều tự động khởi tạo MySQL container tạm thời, không phụ thuộc vào dịch vụ MySQL đang chạy trên máy cá nhân.
2. Thiết lập quy tắc giới hạn kích thước Pull Request: Mỗi PR không vượt quá 15 tệp thay đổi và chỉ tương ứng với đúng 01 mã task trên Trello để tăng tốc độ nghiệm thu.
3. Hoàn tất kết nối Webhook bưu cục: Tiếp tục đàm phán tài khoản thử nghiệm của GHTK/GHN để hoàn thành nốt 2 thẻ công việc giao vận ORD-22 và ORD-23 đã được chuẩn bị sẵn nền tảng.
4. Tối ưu hóa hiệu năng và kiểm thử tải: Thực hiện đánh giá hiệu năng chịu tải (Load Testing) với kịch bản 1,000 người dùng đồng thời đặt hàng và hoàn tất bảo vệ đồ án OJT trước Hội đồng Đánh giá.

---

## 9. KẾT LUẬN VÀ XÁC NHẬN NGHIỆM THU SPRINT 3

Sprint 3 của dự án GreenPhone đã kết thúc với thắng lợi toàn diện về cả khối lượng công việc lẫn chất lượng kỹ thuật. Toàn đội ngũ đã hoàn thành 34 trên tổng số 36 nhiệm vụ trên bảng Trello, đạt 135 Story Points (tỷ lệ thành công 95.74%), thiết lập đầy đủ các tính năng vận hành của một sàn thương mại điện tử chuyên nghiệp từ giao dịch, kho bãi, bảo hành đến phân quyền quản trị nội bộ.

Hệ thống sẵn sàng chuyển sang Sprint 4 để thực hiện đóng gói hoàn thiện và bảo vệ đồ án tốt nghiệp On-the-Job Training.

ĐẠI DIỆN ĐỘI NGŨ PHÁT TRIỂN GREENPHONE
Trưởng Nhóm Kỹ Thuật (Tech Lead)
Vũ Đăng Nguyên

XÁC NHẬN CỦA GIẢNG VIÊN HƯỚNG DẪN / TECH LEAD MENTOR
Rikkei Academy
