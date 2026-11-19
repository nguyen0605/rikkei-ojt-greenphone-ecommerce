# DANH MỤC QUẢN TRỊ VÀ TRA CỨU TASK TRELLO GREENPHONE

- Bảng Trello chính thức: https://trello.com/b/LBnO1w9t/greenphone-smartphone-e-commerce
- Nguyên tắc định danh: `[<Số SP> SP] [<Mã Module>-<Số TT>] [<Phạm Vi>] <Tên Nghiệp Vụ Chi Tiết>`
- Cấu trúc các cột trên Trello (từ phải sang trái): Done Sprint 1 -> Done Sprint 2 -> Done Sprint 3 -> Done Sprint 4 -> Code Review / Testing -> In Progress -> Sprint Backlog (Sprint 4) -> Product Backlog.
- Tổng số thẻ: 90 thẻ nhiệm vụ chuẩn hóa.

---

## 1. BẢNG TỔNG HỢP THEO 7 PHÂN HỆ NGHIỆP VỤ

| Mã Module | Tên Phân Hệ | Dải Mã Đã Đánh Số | Số Lượng Thẻ | Phạm Vi Nghiệp Vụ |
|---|---|:---:|:---:|---|
| **CAT** | Catalog & Products | `CAT-01` đến `CAT-29` | 29 thẻ | Sản phẩm, biến thể, lọc động, so sánh máy, đánh giá kèm ảnh R2, Chatbot AI |
| **ORD** | Order & Checkout | `ORD-01` đến `ORD-36` | 36 thẻ | Đơn hàng, giỏ hàng, thanh toán VietQR, hóa đơn VAT, giao vận, thống kê COGS |
| **USR** | User & Identity | `USR-01` đến `USR-17` | 17 thẻ | Tài khoản, bảo mật JWT, OTP Redis, sổ địa chỉ, phân quyền RBAC, thiết bị |
| **INF** | Infrastructure & DevOps | `INF-01` đến `INF-12` | 12 thẻ | Kiến trúc base, Redis, Docker, Nginx SSL, Cloudflare R2, Lighthouse > 90 |
| **INV** | Inventory & Stock | `INV-01` đến `INV-04` | 4 thẻ | Kho hàng đa điểm, nhà cung cấp, đơn đặt mua PO, kiểm toán tồn kho |
| **MKT** | Marketing & Promotion | `MKT-01` đến `MKT-04` | 4 thẻ | Voucher engine, banner chiến dịch, pop-up thông báo mã giảm sâu |
| **WAR** | Warranty & After-Sales | `WAR-01` đến `WAR-08` | 8 thẻ | Kích hoạt IMEI, tiếp nhận sửa chữa, thẩm định kỹ thuật, đổi trả & hoàn tiền |
| **Tổng cộng** | | | **110 lượt thẻ** | |

---

## 2. CHI TIẾT DANH MỤC CÁC CỘT TRÊN TRELLO

### CỘT: DONE SPRINT 1 (17 thẻ)
1. `[3 SP] [INF-01] Base Architecture, Exception Handling & API Response Standard`
2. `[5 SP] [USR-01] Authentication Service (JWT Bearer & User Security)`
3. `[3 SP] [USR-02] User Profile & Sổ Địa Chỉ Giao Hàng (User Address Management)`
4. `[3 SP] [CAT-01] Quản Lý Hãng Sản Xuất (Brand) & Banner Khuyến Mãi`
5. `[5 SP] [CAT-02] Cây Thuộc Tính & Thông Số Kỹ Thuật (Option & OptionItem Tree)`
6. `[5 SP] [MKT-01] Module Quản Lý Mã Giảm Giá & Voucher Engine (Promotion Service)`
7. `[3 SP] [ORD-01] Giỏ Hàng & Quản Lý Cart Items (Shopping Cart Service)`
8. `[3 SP] [USR-03] Giao Diện Đăng Ký, Đăng Nhập & Quên Mật Khẩu (Auth Pages)`
9. `[5 SP] [CAT-03] Giao Diện Trang Chi Tiết Điện Thoại (Product Detail Page - PDP)`
10. `[3 SP] [CAT-04] Thiết Kế Header, Navigation Bar & Footer Thương Hiệu`
11. `[3 SP] [CAT-05] Giao Diện Trang Chủ (Homepage) & Banner Chiến Dịch`
12. `[5 SP] [CAT-06] Giao Diện Trang Danh Sách Sản Phẩm & Sidebar Bộ Lọc Động`
13. `[3 SP] [ORD-02] Trang Giỏ Hàng Chi Tiết (/cart) & Áp Dụng Mã Giảm Giá`
14. `[5 SP] [CAT-07] Giao Diện Quản Trị: Quản Lý Sản Phẩm & Biến Thể Kho Máy (Admin Product CRUD)`
15. `[5 SP] [INF-02] Khởi Tạo Dự Án Frontend & Cấu Hình Kiến Trúc Base (React 19 + Vite)`
16. `[3 SP] [INF-03] Tích Hợp Upload Đa Phương Tiện (Cloudinary Image Service)`
17. `[3 SP] [CAT-08] Kiểm Tra Tồn Kho Biến Thể Thời Gian Thực & Validate Variant`

### CỘT: DONE SPRINT 2 (34 thẻ)
18. `[3 SP] [USR-04] Email Service & Gửi Mã Xác Thực OTP / Quên Mật Khẩu` (dangnguyenvu)
19. `[5 SP] [ORD-03] Tích hợp Cổng Thanh Toán Tự Động SePay (VietQR Webhook)` (dangnguyenvu)
20. `[3 SP] [INF-04] Tinh Chỉnh HikariCP Pool & ThreadPoolTaskExecutor Cho Async Tasks` (dangnguyenvu)
21. `[3 SP] [USR-05] Tái Cấu Trúc OTP Xác Thực: Lưu Trữ Redis Có TTL & Chống Brute-Force` (dangnguyenvu)
22. `[5 SP] [INF-05] Tích Hợp Redis Cache Cho Catalog, Promotion & System Settings` (dangnguyenvu)
23. `[5 SP] [INF-06] Tên Miền, Tự Động Hóa SSL HTTPS & Bảo Mật Nginx Production` (dangnguyenvu)
24. `[5 SP] [ORD-04] Order Service & Khóa Tồn Kho Chống Bán Âm (Pessimistic Concurrency Lock)` (vunguynle1)
25. `[3 SP] [ORD-05] Scheduler Tự Động Hủy Đơn Quá Hạn & Hoàn Tồn Kho (OrderTimeoutScheduler)` (vunguynle1)
26. `[3 SP] [MKT-02] Giao Diện Admin: Quản Lý Banner Quảng Cáo & Mã Khuyến Mãi (Vouchers)` (vunguynle1)
27. `[3 SP] [ORD-06] API Cho Phép Khách Hàng Tự Hủy Đơn Hàng & Hoàn Voucher` (vunguynle1)
28. `[5 SP] [INV-02] Cảnh Báo Tồn Kho Thấp & Nhật Ký Biến Động Kho (Inventory Audit Log)` (vunguynle1)
29. `[3 SP] [CAT-13] Tìm Kiếm Toàn Văn (MySQL Full-Text Search) & Cấu Hình Dynamic CORS` (vunguynle1)
30. `[5 SP] [ORD-07] Đồng Bộ Giỏ Hàng Với Database & Quản Lý Cart Items (Cart API Sync)` (dangduongre)
31. `[3 SP] [INV-01] Giao Diện Cảnh Báo Tồn Kho Thấp & Lịch Sử Biến Động Kho Phía Admin` (dangduongre)
32. `[5 SP] [ORD-08] Giao Diện Đặt Hàng & Thanh Toán Đa Bước (Multi-Step Checkout Flow)` (dangduongre)
33. `[2 SP] [ORD-09] Màn Hình Thanh Toán VietQR Động (Dynamic VietQR Payment Page)` (dangduongre)
34. `[3 SP] [ORD-18] Admin Order Management API (Xử Lý & Cập Nhật Tiến Độ Giao Hàng)` (dangduongre)
35. `[3 SP] [CAT-09] Module Đánh Giá Sản Phẩm (Reviews & Ratings Service)` (toannguynvan12)
36. `[5 SP] [ORD-10] Thiết Lập Máy Trạng Thái Đơn Hàng Nghiêm Ngặt (Order State Machine)` (toannguynvan12)
37. `[5 SP] [USR-06] Cơ Chế Refresh Token & Token Blacklist Khi Đăng Xuất (JWT Revocation)` (toannguynvan12)
38. `[3 SP] [CAT-10] API Chi Tiết Điện Thoại & Truy Vấn Biến Thể Tồn Kho` (toannguynvan12)
39. `[3 SP] [CAT-11] Giao Diện Admin: Quản Lý Hãng (Brand) & Thuộc Tính Thông Số (Options)` (toannguynvan12)
40. `[3 SP] [ORD-15] Idempotency Key & Chống Trùng Đơn Hàng / Giao Dịch` (toannguynvan12)
41. `[3 SP] [ORD-11] Giao Diện Xem Chi Tiết Đơn Hàng Phía Admin (Admin Order Detail Drawer)` (dtphanvan3)
42. `[2 SP] [ORD-12] Ràng Buộc State Machine Trạng Thái Đơn Hàng Trên Giao Diện Admin` (dtphanvan3)
43. `[3 SP] [ORD-13] Giao Diện Admin: Quản Lý Đơn Hàng & Duyệt Đơn (Admin Order Management)` (dtphanvan3)
44. `[5 SP] [CAT-12] API Danh Mục Điện Thoại & Bộ Lọc Đa Tiêu Chí Động` (dtphanvan3)
45. `[3 SP] [ORD-17] Giao Diện Khách Hàng Tự Hủy Đơn Hàng & Timeline Trạng Thái` (dtphanvan3)
46. `[2 SP] [CAT-16] Trình Chiếu Ảnh Phóng To (Image Zoom / Lightbox) & Skeleton Loading` (38phucthinh)
47. `[2 SP] [USR-07] Giao Diện Hồ Sơ Khách Hàng & Sổ Địa Chỉ (Customer Profile & Address)` (38phucthinh)
48. `[3 SP] [ORD-14] Đồng Bộ Giỏ Hàng Redux Với Backend API & Merge Giỏ Hàng Khi Đăng Nhập` (38phucthinh)
49. `[2 SP] [ORD-16] Giao Diện Tra Cứu & Lịch Sử Mua Hàng (Order History & Tracking)` (38phucthinh)
50. `[3 SP] [CAT-14] Tái Thiết Kế Bộ Chọn Biến Thể Độc Lập (Dung Lượng + Màu Sắc Swatch)` (38phucthinh)
51. `[2 SP] [CAT-15] Khu Vực Đánh Giá & Nhận Xét Trực Quan Trên PDP` (38phucthinh)

### CỘT: DONE SPRINT 3 (34 thẻ)
52. `[3 SP] [CAT-18] [FS] Khắc Phục Lỗi Hiển Thị Ảnh Sản Phẩm & Mở Rộng Dữ Liệu` (dangnguyenvu)
53. `[3 SP] [WAR-08] [BE] Migration V13 & Nghiệp Vụ Tiếp Nhận Sửa Chữa Bảo Hành Theo IMEI` (dangnguyenvu)
54. `[5 SP] [WAR-07] Tự Động Kích Hoạt Và API Tra Cứu Bảo Hành Điện Tử Theo Mã IMEI` (dangnguyenvu)
55. `[5 SP] [USR-10] [BE] Cấu Hình Đa Vai Trò & Bảo Vệ Toàn Diện API Admin Endpoints` (dangnguyenvu)
56. `[3 SP] [USR-11] [BE] API Quản Lý Danh Sách Nhân Viên & Điều Chỉnh Vai Trò Nghiệp Vụ` (dangnguyenvu)
57. `[3 SP] [ORD-21] [BE] API Tiếp Nhận & Xử Lý Yêu Cầu Hoàn Tiền Đơn Hàng (Refund Service)` (vunguynle1)
58. `[3 SP] [WAR-06] [FE] Giao Diện Khách Hàng Gửi Yêu Cầu Đổi Trả & Hoàn Tiền` (vunguynle1)
59. `[3 SP] [WAR-05] [FE] Giao Diện Thẩm Định Kỹ Thuật Đổi Máy & Hoàn Tiền Phía Admin` (vunguynle1)
60. `[3 SP] [WAR-04] [BE] Nghiệp Vụ Thẩm Định Kỹ Thuật, Đổi Máy Mới & Duyệt Hoàn Tiền` (vunguynle1)
61. `[3 SP] [CAT-19] [BE] API Quản Lý Danh Sách Sản Phẩm Yêu Thích (Wishlist Service)` (toannguynvan12)
62. `[2 SP] [CAT-20] [FE] Đồng Bộ Danh Sách Yêu Thích Với Redux Và API (Wishlist State)` (toannguynvan12)
63. `[3 SP] [CAT-21] [FE] Giao Diện Trang Danh Mục Yêu Thích & Nút Thả Tim Tương Tác` (toannguynvan12)
64. `[5 SP] [MKT-03] Quản Lý Vòng Đời Voucher, Kiểm Tra Hạn Mức & Đồng Bộ Hoàn Trả` (dtphanvan3)
65. `[3 SP] [ORD-22] [BE] API Quản Trị Chi Tiết Đơn Hàng & Cập Nhật Trạng Thái Vận Chuyển` (dtphanvan3)
66. `[3 SP] [INV-03] [BE] Quản Lý Danh Mục Kho Hàng Và Chi Nhánh Đa Điểm` (dangduongre)
67. `[5 SP] [INV-04] [FS] Quản Lý Nhà Cung Cấp Và Lập Đơn Nhập Hàng Tăng Tồn Kho (PO)` (dangduongre)
68. `[5 SP] [WAR-01] [FS] Tự Động Kích Hoạt Và Giao Diện Tra Cứu Bảo Hành Điện Tử` (dangduongre)
69. `[3 SP] [ORD-19] [FE] Tích Hợp Bản Đồ OpenStreetMap & Mô Phỏng Tiến Trình Giao Hàng` (38phucthinh)
70. `[2 SP] [ORD-20] [FE] Điều Hướng Nhanh Đến Trang Chi Tiết Sản Phẩm Từ Chi Tiết Đơn Hàng` (38phucthinh)
71. `[2 SP] [ORD-30] [FE] Giao Diện Admin Điều Phối Giao Hàng & In Phiếu Giao Vận` (38phucthinh)
72. `[3 SP] [INF-07] Cấu Hình & Triển Khai Dịch Vụ Redis Server Lên VPS Production` (dangnguyenvu)
73. `[INF-09] Thiết Lập Nginx Reverse Proxy & Chứng Chỉ SSL Cho VPS GreenPhone`
74. `[CAT-23] Tìm Kiếm Tự Động Hoàn Thành (Search Autocomplete & Suggestions)`
75. `[INF-10] Quản Lý Cài Đặt Hệ Thống (System Settings API)`
76. `[CAT-25] Phân Tích Top Smartphone Bán Chạy Nhất & Cơ Cấu Hãng`
(Cùng 9 thẻ chuyển đổi kiểm thử và hoàn thiện quy trình giao vận tại Sprint 3).

### CỘT: IN PROGRESS (1 thẻ)
77. `[8 SP] [CAT-23] [FS] Tính Năng Và Giao Diện Bảng So Sánh Thông Số Cấu Hình Điện Thoại` (dtphanvan3)

### CỘT: SPRINT BACKLOG (SPRINT 4) (16 thẻ chính thức)
78. `[5 SP] [ORD-32] [BE] Nâng Cấp API Báo Cáo Tài Chính Đa Chiều, Giá Vốn COGS & Phân Quyền RBAC Thống Kê` (dangduongre)
79. `[5 SP] [ORD-33] [FE] Giao Diện Thống Kê Dashboard Trực Quan & Phân Tầng Dữ Liệu Theo Quyền Hạn` (dangduongre)
80. `[3 SP] [ORD-34] [FE] Nâng Cấp Xuất Báo Cáo Excel Đa Sheet & PDF Chuẩn Hóa Theo Phân Quyền` (vunguynle1)
81. `[5 SP] [USR-16] [FE] Giao Diện Quản Lý Thiết Bị Đăng Nhập & Đăng Xuất Từ Xa` (vunguynle1)
82. `[2 SP] [ORD-35] [FE] Đồng Bộ Trang Thái Đơn Hàng Giữa Danh Sách Đơn Mua Và Chi Tiết Đơn` (vunguynle1)
83. `[5 SP] [USR-15] [BE] Trang quan lí thiết bị đăng nhập phía người dùng` (38phucthinh)
84. `[3 SP] [CAT-26] [FE] Giao Diện Tải Ảnh Đánh Giá & Đồng Bộ Trình Chiếu Lightbox Trên PDP` (38phucthinh)
85. `[3 SP] [CAT-25] [BE] API Quản Lý Hình Ảnh Đánh Giá Sản Phẩm & Tích Hợp Lưu Trữ Cloudflare R2` (38phucthinh)
86. `[3 SP] [CAT-24] [FE] Khắc Phục Lỗi Đồng Bộ Trạng Thái Bộ Lọc Danh Sách Sản Phẩm Khi Điều Hướng` (toannguynvan12)
87. `[3 SP] [USR-17] [FE] Khắc Phục Rò Rỉ Trạng Thái Sản Phẩm Yêu Thích Khi Chưa Đăng Nhập` (toannguynvan12)
88. `[3 SP] [CAT-29] [FE] Tối Ưu Hóa Trải Nghiệm Mobile & Responsive Toàn Diện` (toannguynvan12)
89. `[5 SP] [ORD-36] [FS] In Hóa Đơn Bán Lẻ Kiêm Phiếu Xuất Kho Và Tiếp Nhận Thông Tin Hóa Đơn VAT` (dtphanvan3)
90. `[5 SP] [MKT-04] [FS] Pop-up Thông Báo Mã Khuyến Mãi Sâu Cho Người Dùng Đăng Nhập Lần Đầu` (dtphanvan3)
91. `[5 SP] [CAT-27] [BE] Tích Hợp Gemini AI Engine & API Tư Vấn Sản Phẩm (AI Shopping Assistant Service)` (dangnguyenvu)
92. `[3 SP] [CAT-28] [FE] Khung Chatbot AI Nổi & Thẻ Sản Phẩm Đính Kèm Tương Tác Trực Tiếp` (dangnguyenvu)
93. `[5 SP] [INF-12] [FE] Tối Ưu Tốc Độ Tải Trang & Google Lighthouse > 90 Điểm` (dangnguyenvu)

### CỘT: PRODUCT BACKLOG (1 thẻ tham chiếu)
94. `[QUY TẮC DỰ ÁN] Chuẩn Git Branch, ApiResponse & Tiêu Chuẩn Kỹ Thuật GreenPhone`
