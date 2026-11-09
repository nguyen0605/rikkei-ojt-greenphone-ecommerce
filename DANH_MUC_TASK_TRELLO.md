# DANH MỤC QUẢN TRỊ VÀ TRA CỨU TASK TRELLO GREENPHONE

- Bảng Trello chính thức: https://trello.com/b/LBnO1w9t/greenphone-smartphone-e-commerce
- Nguyên tắc định danh: `[<Số SP> SP] [<Mã Module>-<Số TT>] <Tên Nghiệp Vụ Chi Tiết>`
- Đánh số tự tăng: Đi theo chiều thời gian từ phải sang trái (Done Sprint 1 -> Done Sprint 2 -> Code Review -> In Progress -> Sprint Backlog 2 -> Sprint Backlog 3 -> Product Backlog).
- Tổng số thẻ: 87 thẻ nhiệm vụ độc lập hoàn toàn với vai trò cá nhân.

---

## 1. BẢNG TỔNG HỢP THEO 7 PHÂN HỆ NGHIỆP VỤ

| Mã Module | Tên Phân Hệ | Dải Mã Đã Đánh Số | Số Lượng Thẻ | Phạm Vi Nghiệp Vụ |
|---|---|:---:|:---:|---|
| **CAT** | Catalog & Products | `CAT-01` đến `CAT-27` | 27 thẻ | Sản phẩm, biến thể, lọc, so sánh máy, đánh giá |
| **ORD** | Order & Checkout | `ORD-01` đến `ORD-28` | 28 thẻ | Đơn hàng, giỏ hàng, thanh toán VietQR, hủy đơn, hoàn tiền |
| **USR** | User & Identity | `USR-01` đến `USR-09` | 9 thẻ | Tài khoản, bảo mật JWT, OTP Redis, sổ địa chỉ, hồ sơ |
| **INF** | Infrastructure & DevOps | `INF-01` đến `INF-12` | 12 thẻ | Kiến trúc base, Redis, Docker, Nginx SSL, CI/CD, E2E |
| **INV** | Inventory & Stock | `INV-01` đến `INV-04` | 4 thẻ | Kho hàng, chi nhánh đa điểm, nhà cung cấp, đơn PO, audit kho |
| **MKT** | Marketing & Promotion | `MKT-01` đến `MKT-05` | 5 thẻ | Voucher engine, banner quảng cáo, SEO/OpenGraph |
| **WAR** | Warranty & After-Sales | `WAR-01` đến `WAR-02` | 2 thẻ | Kích hoạt và tra cứu bảo hành điện tử theo IMEI |
| **Tổng cộng** | | | **87 thẻ** | |

---

## 2. CHI TIẾT DANH MỤC 87 THẺ THEO CÁC CỘT (TỪ PHẢI SANG TRÁI)

### CỘT 1: DONE SPRINT 1 (17 thẻ)
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

### CỘT 2: DONE SPRINT 2 (24 thẻ)
18. `[3 SP] [USR-04] Email Service & Gửi Mã Xác Thực OTP / Quên Mật Khẩu`
19. `[5 SP] [ORD-03] Tích hợp Cổng Thanh Toán Tự Động SePay (VietQR Webhook)`
20. `[3 SP] [INF-04] Tinh Chỉnh HikariCP Pool & ThreadPoolTaskExecutor Cho Async Tasks`
21. `[3 SP] [USR-05] Tái Cấu Trúc OTP Xác Thực: Lưu Trữ Redis Có TTL & Chống Brute-Force`
22. `[5 SP] [INF-05] Tích Hợp Redis Cache Cho Catalog, Promotion & System Settings`
23. `[5 SP] [INF-06] Tên Miền, Tự Động Hóa SSL HTTPS & Bảo Mật Nginx Production`
24. `[5 SP] [ORD-04] Order Service & Khóa Tồn Kho Chống Bán Âm (Pessimistic Concurrency Lock)`
25. `[3 SP] [ORD-05] Scheduler Tự Động Hủy Đơn Quá Hạn & Hoàn Tồn Kho (OrderTimeoutScheduler)`
26. `[3 SP] [MKT-02] Giao Diện Admin: Quản Lý Banner Quảng Cáo & Mã Khuyến Mãi (Vouchers)`
27. `[3 SP] [ORD-06] API Cho Phép Khách Hàng Tự Hủy Đơn Hàng & Hoàn Voucher`
28. `[5 SP] [ORD-07] Đồng Bộ Giỏ Hàng Với Database & Quản Lý Cart Items (Cart API Sync)`
29. `[3 SP] [INV-01] Giao Diện Cảnh Báo Tồn Kho Thấp & Lịch Sử Biến Động Kho Phía Admin`
30. `[5 SP] [ORD-08] Giao Diện Đặt Hàng & Thanh Toán Đa Bước (Multi-Step Checkout Flow)`
31. `[2 SP] [ORD-09] Màn Hình Thanh Toán VietQR Động (Dynamic VietQR Payment Page)`
32. `[3 SP] [CAT-09] Module Đánh Giá Sản Phẩm (Reviews & Ratings Service)`
33. `[5 SP] [ORD-10] Thiết Lập Máy Trạng Thái Đơn Hàng Nghiêm Ngặt (Order State Machine)`
34. `[5 SP] [USR-06] Cơ Chế Refresh Token & Token Blacklist Khi Đăng Xuất (JWT Revocation)`
35. `[3 SP] [CAT-10] API Chi Tiết Điện Thoại & Truy Vấn Biến Thể Tồn Kho`
36. `[3 SP] [CAT-11] Giao Diện Admin: Quản Lý Hãng (Brand) & Thuộc Tính Thông Số (Options)`
37. `[3 SP] [ORD-11] Giao Diện Xem Chi Tiết Đơn Hàng Phía Admin (Admin Order Detail Drawer)`
38. `[2 SP] [ORD-12] Ràng Buộc State Machine Trạng Thái Đơn Hàng Trên Giao Diện Admin`
39. `[3 SP] [ORD-13] Giao Diện Admin: Quản Lý Đơn Hàng & Duyệt Đơn (Admin Order Management)`
40. `[5 SP] [CAT-12] API Danh Mục Điện Thoại & Bộ Lọc Đa Tiêu Chí Động`
41. `[2 SP] [USR-07] Giao Diện Hồ Sơ Khách Hàng & Sổ Địa Chỉ (Customer Profile & Address)`

### CỘT 3: CODE REVIEW / TESTING (8 thẻ)
42. `[3 SP] [ORD-14] Đồng Bộ Giỏ Hàng Redux Với Backend API & Merge Giỏ Hàng Khi Đăng Nhập`
43. `[3 SP] [ORD-15] Idempotency Key & Chống Trùng Đơn Hàng / Giao Dịch`
44. `[3 SP] [CAT-13] Tìm Kiếm Toàn Văn (MySQL Full-Text Search) & Cấu Hình Dynamic CORS`
45. `[5 SP] [INV-02] Cảnh Báo Tồn Kho Thấp & Nhật Ký Biến Động Kho (Inventory Audit Log)`
46. `[2 SP] [ORD-16] Giao Diện Tra Cứu & Lịch Sử Mua Hàng (Order History & Tracking)`
47. `[3 SP] [CAT-14] Tái Thiết Kế Bộ Chọn Biến Thể Độc Lập (Dung Lượng + Màu Sắc Swatch)`
48. `[2 SP] [CAT-15] Khu Vực Đánh Giá & Nhận Xét Trực Quan Trên PDP`
49. `[3 SP] [ORD-17] Giao Diện Khách Hàng Tự Hủy Đơn Hàng & Timeline Trạng Thái`

### CỘT 4: IN PROGRESS (1 thẻ)
50. `[2 SP] [CAT-16] Trình Chiếu Ảnh Phóng To (Image Zoom / Lightbox) & Skeleton Loading`

### CỘT 5: SPRINT BACKLOG (SPRINT 2) (2 thẻ)
51. `[3 SP] [ORD-18] Admin Order Management API (Xử Lý & Cập Nhật Tiến Độ Giao Hàng)`
52. `[3 SP] [CAT-17] Đánh Giá Kèm Hình Ảnh Thực Tế & Bộ Lọc Đơn Hàng Nâng Cao Cho Admin`

### CỘT 6: SPRINT BACKLOG (SPRINT 3) (12 thẻ)
53. `[3 SP] [CAT-18] Khắc Phục Lỗi Hiển Thị Ảnh Danh Mục Sản Phẩm & Mở Rộng Dữ Liệu Catalog`
54. `[3 SP] [ORD-19] Tích Hợp Bản Đồ OpenStreetMap & Mô Phỏng Tiến Trình Giao Hàng Thời Gian Thực`
55. `[2 SP] [ORD-20] Điều Hướng Nhanh Đến Trang Chi Tiết Sản Phẩm Từ Chi Tiết Đơn Hàng`
56. `[3 SP] [ORD-21] API Tiếp Nhận & Xử Lý Yêu Cầu Hoàn Tiền Đơn Hàng (Refund Service)`
57. `[3 SP] [ORD-22] API Quản Trị Chi Tiết Đơn Hàng & Cập Nhật Trạng Thái Vận Chuyển Toàn Diện`
58. `[5 SP] [MKT-03] Quản Lý Vòng Đời Voucher, Kiểm Tra Hạn Mức & Đồng Bộ Hoàn Trả`
59. `[3 SP] [CAT-19] API Quản Lý Danh Sách Sản Phẩm Yêu Thích (Wishlist Service & Controller)`
60. `[2 SP] [CAT-20] Đồng Bộ Danh Sách Yêu Thích Với Redux Và API (Wishlist State & Service)`
61. `[3 SP] [CAT-21] Giao Diện Trang Danh Mục Yêu Thích & Nút Thả Tim Tương Tác`
62. `[3 SP] [INV-03] Quản Lý Danh Mục Kho Hàng Và Chi Nhánh Đa Điểm`
63. `[5 SP] [INV-04] Quản Lý Nhà Cung Cấp Và Lập Đơn Nhập Hàng Tăng Tồn Kho (Purchase Orders)`
64. `[5 SP] [WAR-01] Tự Động Kích Hoạt Và API Tra Cứu Bảo Hành Điện Tử Theo Mã IMEI`

### CỘT 7: PRODUCT BACKLOG (23 thẻ)
65. `[3 SP] [ORD-23] Engine Mô Phỏng Quy Trình Giao Hàng & Tự Động Chuyển Trạng Thái Đơn Hàng`
66. `[3 SP] [INF-07] Cấu Hình & Triển Khai Dịch Vụ Redis Server Lên VPS Production`
67. `[3 SP] [USR-08] API CRUD Sổ Địa Chỉ Giao Hàng (Address Management API)`
68. `[INF-08] Bảo Mật Nâng Cao: Rate Limiting & Chống Spam Request`
69. `[3 SP] [ORD-24] Giao Diện Trang Thanh Toán (One-Page Checkout Flow)`
70. `[3 SP] [CAT-22] Tối Ưu Hóa Trải Nghiệm Mobile & Responsive Toàn Diện`
71. `[INF-09] Thiết Lập Nginx Reverse Proxy & Chứng Chỉ SSL Cho VPS GreenPhone`
72. `[ORD-25] Tích Hợp Thêm Cổng Thanh Toán VNPay Sandbox`
73. `[CAT-23] Tìm Kiếm Tự Động Hoàn Thành (Search Autocomplete & Suggestions)`
74. `[CAT-24] So Sánh Thông Số Kỹ Thuật Giữa 2 Mẫu Điện Thoại`
75. `[INF-10] Quản Lý Cài Đặt Hệ Thống (System Settings API)`
76. `[ORD-26] Admin Statistics Service: Báo Cáo Doanh Thu & Số Liệu Tài Chính`
77. `[CAT-25] Phân Tích Top Smartphone Bán Chạy Nhất & Cơ Cấu Hãng`
78. `[CAT-26] Tự Động Gửi Email Khảo Sát & Chăm Sóc Khách Hàng Sau Khi Nhận Máy`
79. `[CAT-27] Giao Diện So Sánh 2 Điện Thoại (Phone Comparison Page)`
80. `[WAR-02] Trang Thành Công & Hướng Dẫn Kích Hoạt Bảo Hành Điện Tử`
81. `[MKT-04] Tối Ưu SEO Meta Tags & Thẻ OpenGraph Chia Sẻ Mạng Xã Hội`
82. `[MKT-05] Trang Danh Sách Mã Khuyến Mãi (Vouchers Center Page)`
83. `[INF-11] Kiểm Thử Giao Diện Tự Động End-to-End Bằng Playwright`
84. `[INF-12] Tối Ưu Tốc Độ Tải Trang & Google Lighthouse > 90 Điểm`
85. `[ORD-27] Admin Dashboard: Biểu Đồ Doanh Thu & Thống Kê Trực Quan`
86. `[USR-09] Giao Diện Admin: Quản Lý Người Dùng & Phân Quyền (Admin User Management)`
87. `[ORD-28] Xuất Báo Cáo Doanh Thu & Đơn Hàng Ra File Excel (.xlsx)`
