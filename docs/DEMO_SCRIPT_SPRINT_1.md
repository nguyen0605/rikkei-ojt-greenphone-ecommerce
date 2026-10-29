# 🎯 GREENPHONE - KỊCH BẢN DEMO NGHIỆM THU SPRINT 1 (DÀNH CHO 6 THÀNH VIÊN)

> **Dự án:** GreenPhone - Thương Mại Điện Tử Smartphone & Phụ Kiện Chính Hãng  
> **Mục đích:** Hướng dẫn chi tiết từng bước thao tác thực tế (Test Scenarios) để từng thành viên trong nhóm tự tin trình bày và demo trước Hội đồng / Mentor Rikkei trong buổi nghiệm thu Sprint 1.

---

## 👥 PHÂN CHIA NHIỆM VỤ DEMO TRONG BUỔI BÁO CÁO

---

### 👤 1. BE 1: dangnguyen vu (`@dangnguyenvu`) - Tech Lead & Auth

#### 🧪 Kịch bản Test 1: Base Architecture, Chuẩn hóa Response & Bắt lỗi tập trung
- **File phụ trách:**
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/common/dto/ApiResponse.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/common/exception/GlobalExceptionHandler.java`
- **Các bước Demo trên Swagger / Postman:**
  1. Mở trình duyệt truy cập Swagger UI: `http://localhost:8080/swagger-ui/index.html`.
  2. Gọi thử một API bất kỳ (ví dụ: `GET /api/v1/phones/999999` với ID không tồn tại).
  3. **Kết quả mong đợi:** Response trả về HTTP 404 với định dạng chuẩn `ApiResponse<T>`:
     ```json
     {
       "success": false,
       "message": "Không tìm thấy điện thoại với ID: 999999",
       "timestamp": "2026-10-29T..."
     }
     ```
  4. Trình bày với Mentor: Toàn bộ hệ thống không bị crash hoặc lộ Java stacktrace, 100% API đều bọc qua chuẩn `ApiResponse`.

#### 🧪 Kịch bản Test 2: Luồng Xác Thực Khách Hàng (JWT Authentication & Security)
- **File phụ trách:**
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/AuthController.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/security/JwtTokenProvider.java`
- **Các bước Demo:**
  1. Demo API Đăng ký: Gọi `POST /api/v1/auth/register` với email mới `testuser2026@gmail.com`, mật khẩu `Abc@12345`.
  2. Mở MySQL kiểm tra bảng `users`: Mật khẩu được băm an toàn bằng `BCryptPasswordEncoder` (dạng `$2a$10$...`), role tự động gán `ROLE_CUSTOMER`.
  3. Demo API Đăng nhập: Gọi `POST /api/v1/auth/login` với tài khoản vừa tạo $\rightarrow$ Nhận chuỗi `token` JWT Bearer có thời hạn.
  4. Copy token dán vào nút **Authorize** trên Swagger $\rightarrow$ Gọi API bảo vệ `GET /api/v1/users/profile` thành công 200 OK.

#### 🧪 Kịch bản Test 3: Sổ Địa Chỉ & Cập Nhật Hồ Sơ Người Dùng
- **File phụ trách:** `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/UserController.java`
- **Các bước Demo:**
  1. Đăng nhập tài khoản khách hàng, gọi `PUT /api/v1/users/profile` cập nhật số điện thoại `0988776655` và địa chỉ `123 Đường Cầu Giấy, Hà Nội`.
  2. Gọi lại `GET /api/v1/users/profile` $\rightarrow$ Thông tin mới hiển thị ngay lập tức.

---

### 👤 2. BE 2: 38.Phucthinh (`@38phucthinh`) - Catalog & Media

#### 🧪 Kịch bản Test 4: Upload Ảnh Lên Cloudinary CDN & Tự Động Nén WebP
- **File phụ trách:** `GreenPhone-Backend/src/main/java/com/re/greenphone/service/CloudinaryService.java`
- **Các bước Demo:**
  1. Trên Swagger hoặc giao diện Admin, chọn 1 ảnh điện thoại đuôi `.png` hoặc `.jpg` dung lượng 3MB.
  2. Bấm Upload $\rightarrow$ Nhận về HTTPS URL: `https://res.cloudinary.com/.../greenphone/phones/...webp`.
  3. Mở link trên tab mới: Ảnh hiển thị sắc nét, dung lượng tự động nén giảm còn ~150KB.

#### 🧪 Kịch bản Test 5: API Quản Lý Thương Hiệu (Brand) & Banner Trang Chủ
- **File phụ trách:**
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/BrandController.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/BannerController.java`
- **Các bước Demo:**
  1. Gọi `GET /api/v1/brands` $\rightarrow$ Trả về danh sách 7 hãng lớn: Apple, Samsung, Xiaomi, OPPO, Realme, Vivo, Iqoo kèm logo SVG.
  2. Gọi `GET /api/v1/banners` $\rightarrow$ Trả về 3 banner khuyến mãi mở bán iPhone 15 Series và Galaxy S24 Ultra.

#### 🧪 Kịch bản Test 6: Cây Thông Số Kỹ Thuật Đa Tầng (Option & OptionItem Tree)
- **File phụ trách:** `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/OptionController.java`
- **Các bước Demo:**
  1. Gọi `GET /api/v1/options/tree` $\rightarrow$ Trả về cấu trúc cây phân cấp:
     - Nhóm RAM: 4GB, 6GB, 8GB, 12GB, 16GB.
     - Nhóm Bộ nhớ trong (Storage): 64GB, 128GB, 256GB, 512GB, 1TB.
     - Nhóm Tính năng: 5G, Sạc nhanh, Camera AI, Kháng nước.
  2. Trình bày với Mentor: Cấu trúc cây động này giúp hệ thống dễ dàng mở rộng thêm thông số cho tablet, laptop sau này mà không cần sửa cấu trúc Database.

---

### 👤 3. BE 3: Đạt Phan Văn (`@dtphanvan3`) - Cart & Stock Inventory

#### 🧪 Kịch bản Test 7: Module Voucher & Thẩm Định Mã Giảm Giá
- **File phụ trách:** `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/PromotionController.java`
- **Các bước Demo:**
  1. Gọi `POST /api/v1/promotions/apply` với mã `SALEHATHANH` cho đơn giá trị 15.000.000đ.
  2. **Kết quả mong đợi:** Hệ thống kiểm tra hợp lệ, chiết khấu giảm 500.000đ, số tiền thanh toán còn 14.500.000đ.
  3. Thử áp dụng mã đã hết hạn $\rightarrow$ Báo lỗi `Voucher đã hết hạn sử dụng` rõ ràng.

#### 🧪 Kịch bản Test 8: Giỏ Hàng Mua Sắm (Shopping Cart Service)
- **File phụ trách:** `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/CartController.java`
- **Các bước Demo:**
  1. Gửi request thêm biến thể máy `iPhone 15 Pro Max 256GB Titan Tự Nhiên` vào giỏ hàng (`POST /api/v1/cart/items`).
  2. Gọi `GET /api/v1/cart` $\rightarrow$ Trả về chi tiết giỏ hàng: số lượng 1, đơn giá 29.990.000đ, tổng tiền tính tự động.
  3. Tăng số lượng lên 2 $\rightarrow$ Tổng tiền cập nhật thành 59.980.000đ.

#### 🧪 Kịch bản Test 9: Kiểm Tra Tồn Kho Biến Thể & Validate Variant
- **File phụ trách:** `GreenPhone-Backend/src/main/java/com/re/greenphone/repository/PhoneVariantRepository.java`
- **Các bước Demo:**
  1. Kiểm tra biến thể có số lượng tồn kho `stock_quantity = 0`.
  2. Khi thêm vào giỏ hoặc đặt hàng, hệ thống chặn lại và báo lỗi `Sản phẩm phiên bản này tạm thời hết hàng`.

---

### 👤 4. FE 1: Toàn Nguyễn Văn (`@toannguynvan12`) - Core UI, Auth & PDP

#### 🧪 Kịch bản Test 10: Khởi Tạo Dự Án React 19 Vite & Axios Interceptor
- **File phụ trách:** `Frontend/src/services/api.ts`, `Frontend/src/store/index.ts`
- **Các bước Demo:**
  1. Mở giao diện web tại `http://localhost:3000`.
  2. Mở Network tab trên DevTools (F12) $\rightarrow$ Xem các request gửi đi đều tự động đính kèm `Authorization: Bearer <token>` từ Redux store.
  3. Thử xóa token trong cookie/localStorage và gọi API bảo vệ $\rightarrow$ Hệ thống tự động bắt lỗi 401 và redirect người dùng về trang `/login`.

#### 🧪 Kịch bản Test 11: Demo Form Đăng Nhập & Đăng Ký Chuẩn Validation
- **File phụ trách:** `Frontend/src/pages/auth/LoginPage.tsx`, `RegisterPage.tsx`
- **Các bước Demo:**
  1. Vào trang `/register`: Thử nhập email sai định dạng (vd: `abc@`) hoặc mật khẩu dưới 8 ký tự $\rightarrow$ Thông báo lỗi đỏ hiển thị ngay dưới ô input theo chuẩn Zod schema.
  2. Nhập thông tin chuẩn: Đăng ký thành công, tự động chuyển về trang `/login`.
  3. Đăng nhập thành công: Hiện Toast thông báo xanh "Đăng nhập thành công!", Header lập tức đổi trạng thái sang Avatar người dùng.

#### 🧪 Kịch bản Test 12: Trang Chi Tiết Điện Thoại (Product Detail Page - PDP)
- **File phụ trách:** `Frontend/src/pages/product/ProductDetailPage.tsx`
- **Các bước Demo:**
  1. Truy cập vào trang chi tiết iPhone 15 Pro Max:
     - Thư viện ảnh slider Swiper: Bấm đổi thumbnail ảnh góc cạnh máy mượt mà.
     - Bảng chọn Dung lượng (128GB vs 256GB vs 512GB): Khi bấm chọn bản 512GB, giá bán tự động đổi từ 29.990.000đ thành 35.990.000đ.
     - Bảng thông số kỹ thuật (Màn hình Super Retina XDR, Chip A17 Pro, Pin 4422 mAh) hiển thị rõ ràng.
  2. Bấm nút **"Thêm Vào Giỏ Hàng"** $\rightarrow$ Icon giỏ hàng trên thanh Header lập tức nhảy số hiển thị huy hiệu (Badge count tăng lên 1) kèm thông báo Toast xanh.

---

### 👤 5. FE 2: vũ Nguyễn Lê (`@vunguynle1`) - Layout, Homepage & Catalog Filter

#### 🧪 Kịch bản Test 13: Header Cố Định, Mega Navbar & Footer Thương Hiệu
- **File phụ trách:** `Frontend/src/components/layout/Header.tsx`, `Navbar.tsx`, `Footer.tsx`
- **Các bước Demo:**
  1. Cuộn trang web: Header cố định trên cùng (Sticky Header), thanh tìm kiếm nhanh có gợi ý.
  2. Badge số lượng trên icon Giỏ hàng tự động hiển thị số lượng máy hiện có trong giỏ.
  3. Thu nhỏ trình duyệt về kích thước điện thoại (iPhone 14 / Samsung): Giao diện tự động chuyển thành Mobile Hamburger Drawer Menu mượt mà.

#### 🧪 Kịch bản Test 14: Trang Chủ (Homepage) Chuyển Động & Banner Slider
- **File phụ trách:** `Frontend/src/pages/home/HomePage.tsx`
- **Các bước Demo:**
  1. Trình diễn Hero Banner tự động chuyển slide các chiến dịch mở bán.
  2. Thanh chọn nhanh theo Hãng: Bấm vào logo Apple $\rightarrow$ Chuyển thẳng sang danh sách lọc riêng điện thoại iPhone.
  3. Danh mục "Điện thoại hot nhất" hiển thị đầy đủ thẻ sản phẩm, nhãn giảm giá đỏ và giá niêm yết gạch ngang.

#### 🧪 Kịch bản Test 15: Trang Danh Sách Sản Phẩm & Sidebar Bộ Lọc Đa Tiêu Chí
- **File phụ trách:** `Frontend/src/pages/product/ProductsPage.tsx`, `components/product/FilterSidebar.tsx`
- **Các bước Demo:**
  1. Vào trang `/products`.
  2. Trên Sidebar lọc:
     - Tick chọn Hãng: **Apple** và **Samsung**.
     - Chọn Khoảng giá: **Từ 15 triệu - 25 triệu**.
     - Chọn RAM: **8GB**.
  3. Quan sát: Danh sách máy lập tức lọc lại theo đúng tiêu chí mà **không cần reload trang**.
  4. Quan sát URL trình duyệt: Tự động đồng bộ thành `/products?brand=1,2&price=15-25&ram=8GB`. Copy link mở tab ẩn danh vẫn giữ nguyên bộ lọc!

---

### 👤 6. FE 3: Đăng Dương (`@dangduongre`) - Checkout, Cart & Admin Management

#### 🧪 Kịch bản Test 16: Giao Diện Đặt Hàng & Thanh Toán Đa Bước (Multi-Step Checkout Flow)
- **File phụ trách:** `Frontend/src/pages/CheckoutPage.tsx`
- **Các bước Demo:**
  1. Từ trang Giỏ hàng `/cart`, bấm nút **"Tiến hành đặt hàng"** $\rightarrow$ Hệ thống chuyển sang trang `/checkout`.
  2. **Bước 1 - Thông tin giao hàng:** Điền Họ tên `Nguyễn Văn A`, SĐT `0912345678`, Địa chỉ `123 Đường Cầu Giấy, Hà Nội`. Bấm "Tiếp tục".
  3. **Bước 2 - Phương thức thanh toán:** Chọn phương thức "Thanh toán khi nhận hàng (COD)" hoặc "Chuyển khoản ngân hàng".
  4. **Bước 3 - Xác nhận & Đặt hàng:** Kiểm tra bảng tóm tắt đơn hàng hiển thị đúng giá tiền và voucher đã áp dụng.
  5. Bấm nút **"Đặt hàng ngay"** $\rightarrow$ Hệ thống điều hướng sang trang `/checkout/success`, hiển thị thông báo "Đặt hàng thành công!" và giỏ hàng tự động reset về 0.

#### 🧪 Kịch bản Test 17: Trang Giỏ Hàng Chi Tiết (/cart) & Áp Dụng Mã Giảm Giá
- **File phụ trách:** `Frontend/src/pages/cart/CartPage.tsx`
- **Các bước Demo:**
  1. Vào trang `/cart`: Bảng hiển thị đầy đủ danh sách máy cần mua.
  2. Ô nhập Voucher: Nhập mã `GREENPHONE500K` và bấm "Áp dụng".
  3. Bảng tổng kết chi phí: Tiền tạm tính 30.000.000đ, Giảm giá: -500.000đ (chữ xanh lá), Tổng thanh toán: 29.500.000đ.
  4. Bấm "Tiến hành đặt hàng" dẫn sang trang Checkout.

#### 🧪 Kịch bản Test 18: Giao Diện Quản Trị Admin Quản Lý Kho & Sản Phẩm (CRUD)
- **File phụ trách:** `Frontend/src/pages/admin/AdminProductsPage.tsx`
- **Các bước Demo:**
  1. Đăng nhập với tài khoản Admin $\rightarrow$ Truy cập `/admin/products`.
  2. Màn hình hiển thị danh sách toàn bộ điện thoại có tìm kiếm theo tên, phân trang và nút sửa/xóa.
  3. Bấm nút **"Thêm Mới Điện Thoại"**:
     - Nhập thông tin máy: Tên máy, Hãng sản xuất, Mô tả.
     - Upload ảnh sản phẩm lên Cloudinary.
     - Thiết lập ma trận biến thể: Chọn RAM, ROM, Màu sắc, Giá bán và Số lượng nhập kho.
  4. Bấm Lưu $\rightarrow$ Mẫu máy mới xuất hiện ngay trên bảng Admin và ngoài trang chủ người dùng.

---

## 🏁 KẾT LUẬN & SẴN SÀNG CHO BUỔI NGHIỆM THU SPRINT 1
- **100% (18/18 tasks)** của Sprint 1 đã hoàn thiện và kiểm thử thành công trên cả Backend lẫn Frontend.
- Tất cả các thẻ trên Trello đã được chuyển sang cột **`Done`** kèm kịch bản test chi tiết từng bước.
- Cả 6 thành viên trong nhóm chỉ cần mở kịch bản này ra là có thể tự tin thao tác demo mượt mà trước Mentor!
