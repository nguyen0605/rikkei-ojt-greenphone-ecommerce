# 📱 GREENPHONE - TÀI LIỆU BACKLOG KỸ THUẬT & QUY TRÌNH PHÁT TRIỂN TOÀN DIỆN

> **Dự án:** GreenPhone - Hệ Thống Thương Mại Điện Tử Bán Điện Thoại Thông Minh (Smartphones & Phụ Kiện)  
> **Đơn vị:** Đồ án On-the-Job Training (OJT) - Rikkei Academy  
> **Quy mô:** 6 Thành viên (BE1: dangnguyen vu, BE2: 38.Phucthinh, BE3: Đạt Phan Văn, FE1: Toàn Nguyễn Văn, FE2: vũ Nguyễn Lê, FE3: Đăng Dương)  
> **Chu kỳ:** 4 Sprint (1 tuần / Sprint = 1 tháng hoàn thành)

---

## 📌 PHẦN 1: ĐỊNH HƯỚNG KIẾN TRÚC & CÔNG NGHỆ TỐI ƯU NHẤT CHO GREENPHONE

Dựa trên việc khảo sát toàn bộ mã nguồn hiện tại của GreenPhone, để dự án đạt chuẩn Doanh nghiệp và gây ấn tượng mạnh nhất với Hội đồng bảo vệ đồ án OJT, đây là **Bộ tiêu chuẩn công nghệ tốt nhất** cần áp dụng:

### 1. Kiến Trúc Backend (Spring Boot 3 / 4 & Java 17 LTS):
- **Core Framework:** Spring Boot WebMVC, Spring Data JPA, Spring Security (Stateless).
- **Database:** MySQL 8 InnoDB (sử dụng charset `utf8mb4_unicode_ci`).
- **Data Migration:** Chuẩn hóa toàn bộ schema bằng **Flyway Migration** (`V1__init_schema.sql`, `V2__seed_initial_data.sql`) thay cho việc chạy script SQL thủ công.
- **DTO Mapping:** Sử dụng **MapStruct** (`GenericMapper`, `PhoneMapper`, `OrderMapper`) thay vì Reflection để tối ưu hiệu năng và compile-time validation.
- **Tích hợp Lưu trữ Ảnh:** **Cloudinary CDN** với cơ chế tự động tối ưu định dạng `.webp` và kích thước ảnh.
- **Cổng thanh toán tự động:** **SePay VietQR Webhook** (Tự động xác nhận giao dịch chuyển khoản ngân hàng qua quét mã QR động) kết hợp thanh toán COD và hoàn trả kho tự động qua `@Scheduled` (`OrderTimeoutScheduler`).
- **Xử lý đồng thời (Concurrency Control):** Áp dụng **Khóa bi quan (`@Lock(LockModeType.PESSIMISTIC_WRITE)`)** trên biến thể điện thoại (`PhoneVariant`) để triệt tiêu lỗi bán âm kho (Overselling) khi Flash Sale các mẫu iPhone/Samsung hot.

### 2. Kiến Trúc Frontend (React 19 + Vite + TypeScript):
- **Giao diện & UI Library:** Ant Design (`antd`) kết hợp Tailwind CSS v4, Lucide Icons.
- **Quản lý State:** Redux Toolkit (`@reduxjs/toolkit`) kết hợp Redux Persist và Redux Saga cho các luồng async phức tạp.
- **Client Cache & Data Fetching:** TanStack React Query (`@tanstack/react-query`) giúp tự động cache dữ liệu sản phẩm và re-validate ngầm.
- **Form Validation:** React Hook Form kết hợp Zod Schema (`@hookform/resolvers/zod`).
- **Thanh toán:** Hiển thị mã VietQR động sinh theo mã đơn hàng, tự động lắng nghe Webhook xác nhận thành công.

### 3. Hạ Tầng DevOps & Triển Khai Thực Chiến:
- **Máy chủ VPS Production:** Ubuntu 24.04 (4GB RAM, 2GB Swap, UFW Firewall mở port 22, 80, 443).
- **Containerization:** Docker & Docker Compose chạy độc lập Backend container và Frontend Nginx container.
- **Nginx Reverse Proxy & SSL:** Cấu hình tên miền tĩnh, tự động cấp phát SSL miễn phí qua Certbot Let's Encrypt.
- **Quality Gate CI/CD:** GitHub Actions workflow tự động chạy kiểm thử đơn vị, đo độ bao phủ Jacoco và kiểm tra bảo mật npm audit mỗi khi tạo PR.

---

## 📌 PHẦN 2: QUY TẮC PHÁT TRIỂN BẮT BUỘC (ANTI-PATTERNS & RULES)

1. **Chuẩn đặt tên nhánh Git:**
   - Backend: `feat/be<x>-<tên-chức-năng>` (VD: `feat/be1-jwt-auth`, `feat/be2-phone-spec`, `feat/be3-sepay-qr`)
   - Frontend: `feat/fe<x>-<tên-chức-năng>` (VD: `feat/fe1-auth-pdp`, `feat/fe2-filter-sidebar`, `feat/fe3-checkout-qr`)
   - Sửa lỗi: `fix/<tên-lỗi>` (VD: `fix/stock-oversell-variant`)
2. **Quy chuẩn Response API:** Bắt buộc bọc qua `ApiResponse<T>`:
   ```json
   {
     "success": true,
     "message": "Thành công",
     "data": { ... },
     "timestamp": "2026-10-28T15:00:00Z"
   }
   ```
3. **5 Điều CẤM KỴ Kỹ thuật:**
   - **CẤM** gọi Repository trực tiếp trong Controller.
   - **CẤM** trả Entity JPA trực tiếp ra ngoài API. Bắt buộc map qua DTO bằng MapStruct.
   - **CẤM** lưu mật khẩu người dùng dạng thô. Phải băm bằng `BCryptPasswordEncoder`.
   - **CẤM** trừ tồn kho điện thoại ở bộ nhớ RAM mà không khóa dòng dữ liệu (`SELECT ... FOR UPDATE`).
   - **CẤM** để lộ khóa bí mật JWT, SePay API Key, Cloudinary Secret trong code git.

---

# 🚀 SPRINT 1: NỀN TẢNG KIẾN TRÚC, AUTHENTICATION, DANH MỤC ĐIỆN THOẠI & BASE FRONTEND

---

### 👤 BE 1: dangnguyen vu (`@dangnguyenvu`)

#### 🎯 Task BE1-01: Base Architecture, Exception Handling & API Response Standard
- **Mục tiêu:** Xây dựng khung chuẩn hệ thống Backend Spring Boot: Cấu trúc DTO chuẩn `ApiResponse<T>`, bộ mã lỗi định danh `ErrorCode`, bắt lỗi tập trung `GlobalExceptionHandler`, cấu hình CORS và Swagger OpenAPI 3.
- **Đường dẫn file:**
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/common/dto/ApiResponse.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/common/exception/GlobalExceptionHandler.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/common/exception/AppException.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/config/CorsConfig.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/config/LoggingAspect.java`
- **Cần gì:** Spring AOP, `@RestControllerAdvice`, MapStruct GenericMapper.
- **Làm gì:** Bắt các exception `ResourceNotFoundException`, `BadRequestException`, `MethodArgumentNotValidException`, ghi log thực thi service qua AOP.
- **CẤM ĐIỀU GÌ:** Cấm in stacktrace ra console `e.printStackTrace()`. Cấm trả về 200 OK khi có lỗi.
- **Tiêu chuẩn nghiệm thu:** Mọi lỗi nhập liệu hoặc lỗi hệ thống đều trả về JSON đúng format `ApiResponse` kèm HTTP Status chuẩn.

#### 🎯 Task BE1-02: Authentication Service (JWT Bearer & User Security)
- **Mục tiêu:** Hệ thống đăng ký tài khoản khách hàng, đăng nhập sinh chuỗi mã hóa JWT Bearer Token, kiểm tra tài khoản kích hoạt và phân quyền Role `ROLE_CUSTOMER` vs `ROLE_ADMIN`.
- **Đường dẫn file:**
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/security/JwtTokenProvider.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/security/JwtAuthenticationFilter.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/config/SecurityConfig.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/service/AuthService.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/AuthController.java`
- **Cần gì:** Thư viện `jjwt-api:0.12.6`, `BCryptPasswordEncoder`.
- **Làm gì:** API `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, mã hóa password, trích xuất Claims từ JWT Header.
- **CẤM ĐIỀU GÌ:** Cấm lưu secret key trong code Java. Cấm lưu mật khẩu thô.
- **Tiêu chuẩn nghiệm thu:** Test Swagger đăng ký tài khoản mới $\rightarrow$ đăng nhập nhận JWT $\rightarrow$ gửi JWT vào header gọi được API lấy thông tin profile cá nhân.

#### 🎯 Task BE1-03: User Profile & Sổ Địa Chỉ Giao Hàng (User Address Management)
- **Mục tiêu:** Cho phép khách hàng quản lý thông tin hồ sơ (Họ tên, SĐT, Email, Avatar) và cập nhật địa chỉ giao hàng nhận máy.
- **Đường dẫn file:**
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/entity/User.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/service/UserService.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/UserController.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/dto/request/UserProfileRequest.java`
- **Cần gì:** Bảng `USERS`, quan hệ Role, Spring Validation `@Valid`.
- **Làm gì:** API `GET /api/v1/users/profile`, `PUT /api/v1/users/profile`, `PUT /api/v1/users/change-password`.
- **CẤM ĐIỀU GÌ:** Cấm user này cập nhật đè thông tin tài khoản của user khác.
- **Tiêu chuẩn nghiệm thu:** Cập nhật thông tin profile và đổi mật khẩu thành công, kiểm tra mật khẩu cũ chính xác mới cho đổi.

---

### 👤 BE 2: 38.Phucthinh (`@38phucthinh`)

#### 🎯 Task BE2-01: Tích Hợp Upload Đa Phương Tiện (Cloudinary Image Service)
- **Mục tiêu:** Service upload ảnh điện thoại các góc cạnh, ảnh banner quảng cáo và ảnh avatar người dùng lên Cloudinary CDN với độ trễ thấp và tự động tối ưu hóa.
- **Đường dẫn file:**
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/config/CloudinaryConfig.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/service/CloudinaryService.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/admin/AdminPhoneController.java` (upload endpoints)
- **Cần gì:** Thư viện `cloudinary-http44:1.38.0`, thông số môi trường `.env`.
- **Làm gì:** Viết hàm nhận `MultipartFile`, kiểm tra định dạng (.jpg, .png, .webp), dung lượng <= 10MB, upload lên folder `greenphone/phones` và trả về secure HTTPS URL.
- **CẤM ĐIỀU GÌ:** Cấm lưu trữ ảnh trực tiếp trong thư mục ổ cứng server. Cấm upload file không lọc đuôi extension.
- **Tiêu chuẩn nghiệm thu:** Upload thử 1 ảnh điện thoại trả về link CDN `https://res.cloudinary.com/...` hiển thị ảnh rõ nét.

#### 🎯 Task BE2-02: Quản Lý Hãng Sản Xuất (Brand) & Banner Khuyến Mãi
- **Mục tiêu:** Cung cấp API quản lý các thương hiệu smartphone hàng đầu (Apple, Samsung, Xiaomi, OPPO, Vivo) và các banner chiến dịch quảng cáo trang chủ.
- **Đường dẫn file:**
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/entity/Brand.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/entity/Banner.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/service/BrandService.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/service/BannerService.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/BrandController.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/BannerController.java`
- **Cần gì:** Bảng `BRAND`, `BANNER`, MapStruct `BrandMapper`, `BannerMapper`.
- **Làm gì:** API Public lấy danh sách Hãng và Banner đang hoạt động (`is_active = true`); API Admin để thêm/sửa/xóa.
- **CẤM ĐIỀU GÌ:** Cấm xóa Hãng nếu đang có dòng điện thoại thuộc hãng đó trong hệ thống.
- **Tiêu chuẩn nghiệm thu:** Gọi `GET /api/v1/brands` trả về đầy đủ logo và tên các hãng Apple, Samsung, Xiaomi.

#### 🎯 Task BE2-03: Cây Thuộc Tính & Thông Số Kỹ Thuật (Option & OptionItem Tree)
- **Mục tiêu:** Xây dựng hệ thống cấu hình thông số kỹ thuật linh hoạt cho smartphone: RAM (8GB, 12GB, 16GB), Dung lượng ROM (128GB, 256GB, 512GB, 1TB), Màu sắc, Chipset, Dung lượng Pin.
- **Đường dẫn file:**
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/entity/Option.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/entity/OptionItem.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/service/OptionService.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/OptionController.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/dto/response/OptionTreeDTO.java`
- **Cần gì:** Quan hệ 1-N giữa `Option` (loại thông số) và `OptionItem` (giá trị cụ thể).
- **Làm gì:** API trả về cây thuộc tính dạng tree để Frontend render dropdown chọn cấu hình điện thoại và bộ lọc.
- **Tiêu chuẩn nghiệm thu:** API trả về nhóm RAM gồm các giá trị [8GB, 12GB], nhóm Dung lượng gồm [128GB, 256GB, 512GB].

---

### 👤 BE 3: Đạt Phan Văn (`@dtphanvan3`)

#### 🎯 Task BE3-01: Module Quản Lý Mã Giảm Giá & Voucher Engine (Promotion Service)
- **Mục tiêu:** Xây dựng nghiệp vụ voucher khuyến mãi giảm giá theo % hoặc tiền cố định, kiểm tra điều kiện áp dụng (ngày hiệu lực, đơn hàng tối thiểu, lượt dùng còn lại).
- **Đường dẫn file:**
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/entity/Promotion.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/entity/UserPromotion.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/service/PromotionService.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/PromotionController.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/dto/request/ApplyPromotionRequest.java`
- **Cần gì:** Bảng `PROMOTION`, Enum `DiscountType` (PERCENT, FIXED_AMOUNT).
- **Làm gì:** Viết hàm validate voucher: kiểm tra thời hạn, số lượt sử dụng tối đa, giá trị đơn hàng tối thiểu, tính số tiền chiết khấu thực tế.
- **CẤM ĐIỀU GÌ:** Cấm tiền giảm giá lớn hơn tổng tiền đơn hàng. Cấm dùng voucher đã hết lượt.
- **Tiêu chuẩn nghiệm thu:** Áp dụng mã `GREENPHONE500K` vào đơn 10 triệu thành công trừ đúng 500k; thử áp mã hết hạn báo lỗi rõ ràng.

#### 🎯 Task BE3-02: Giỏ Hàng & Quản Lý Cart Items (Shopping Cart Service)
- **Mục tiêu:** Quản lý giỏ hàng mua sắm của khách hàng: thêm máy theo biến thể màu/dung lượng, tăng giảm số lượng, tính tổng tiền tạm tính realtime.
- **Đường dẫn file:**
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/entity/Cart.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/entity/CartItem.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/service/CartService.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/CartController.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/dto/request/CartItemRequest.java`
- **Cần gì:** Bảng `CART`, `CART_ITEM` liên kết với `PHONE_VARIANT`.
- **Làm gì:** API `GET /api/v1/cart`, `POST /api/v1/cart/items`, `PUT /api/v1/cart/items/{id}`, `DELETE /api/v1/cart/items/{id}`.
- **CẤM ĐIỀU GÌ:** Cấm thêm sản phẩm vào giỏ khi số lượng trong kho đã hết (`stock == 0`).
- **Tiêu chuẩn nghiệm thu:** Thêm 1 chiếc iPhone 15 Pro Max 256GB vào giỏ, kiểm tra giỏ hàng thấy đúng tên máy, màu sắc, giá và số lượng.

#### 🎯 Task BE3-03: Kiểm Tra Tồn Kho Biến Thể Thời Gian Thực & Validate Variant
- **Mục tiêu:** Service kiểm tra số lượng tồn kho từng SKU biến thể điện thoại (kết hợp Màu + Dung lượng ROM) để báo trạng thái còn hàng/hết hàng cho client.
- **Đường dẫn file:**
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/entity/PhoneVariant.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/repository/PhoneVariantRepository.java`
  - `GreenPhone-Backend/src/main/java/com/re/greenphone/service/PhoneService.java`
- **Cần gì:** Bảng `PHONE_VARIANT` (`sku`, `price`, `stock_quantity`, `phone_id`).
- **Làm gì:** Viết query kiểm tra nhanh số lượng tồn kho theo variant ID trước khi cho phép thêm vào giỏ hoặc đặt hàng.
- **Tiêu chuẩn nghiệm thu:** Biến thể có tồn kho = 0 trả về trạng thái `OUT_OF_STOCK`.

---

### 👤 FE 1: Toàn Nguyễn Văn (`@toannguynvan12`)

#### 🎯 Task FE1-01: Khởi Tạo Dự Án Frontend & Cấu Hình Kiến Trúc Base (React 19 + Vite)
- **Mục tiêu:** Dựng khung chuẩn Frontend: Cấu hình Vite, Tailwind CSS, Ant Design Theme (màu chủ đạo: Xanh lá Green lá mạ công nghệ `#10B981` & Đen sang trọng), Axios Client tự động đính kèm JWT Bearer.
- **Đường dẫn file:**
  - `Frontend/src/services/api.ts` (Axios Client)
  - `Frontend/src/store/index.ts` (Redux Toolkit store)
  - `Frontend/src/layouts/RootLayout.tsx`
  - `Frontend/src/routes/index.tsx`
- **Cần gì:** Thư viện `axios`, `@reduxjs/toolkit`, `react-router-dom:v7`, `antd`.
- **Làm gì:** Cấu hình Interceptors gắn `Authorization: Bearer <token>` vào mọi request bảo vệ; xử lý bắt lỗi 401 tự động xóa token và chuyển về trang Login.
- **Tiêu chuẩn nghiệm thu:** Dự án build không lỗi qua `npm run build`, layout hiển thị đúng theme màu sắc của GreenPhone.

#### 🎯 Task FE1-02: Giao Diện Đăng Ký, Đăng Nhập & Quên Mật Khẩu (Auth Pages)
- **Mục tiêu:** Giao diện trang Login và Register chuyên nghiệp, kiểm tra tính hợp lệ của form bằng React Hook Form + Zod, hỗ trợ thông báo lỗi trực quan.
- **Đường dẫn file:**
  - `Frontend/src/pages/auth/LoginPage.tsx`
  - `Frontend/src/pages/auth/RegisterPage.tsx`
  - `Frontend/src/pages/auth/ForgotPasswordPage.tsx`
  - `Frontend/src/services/authService.ts`
- **Cần gì:** `react-hook-form`, `zod`, Ant Design Input & Button components.
- **Làm gì:** Validate email đúng định dạng, mật khẩu tối thiểu 8 ký tự; submit form gọi API backend, lưu token vào Redux store và redirect về trang chủ.
- **CẤM ĐIỀU GÌ:** Cấm gửi request khi form validate còn lỗi.
- **Tiêu chuẩn nghiệm thu:** Nhập đúng tài khoản đăng nhập thành công, Header tự động hiển thị tên người dùng và avatar.

#### 🎯 Task FE1-03: Giao Diện Trang Chi Tiết Điện Thoại (Product Detail Page - PDP)
- **Mục tiêu:** Màn hình xem chi tiết điện thoại: Slider ảnh sản phẩm phóng to, bảng chọn dung lượng (128GB, 256GB, 512GB) và màu sắc (Titan Tự nhiên, Titan Đen, Titan Xanh), giá bán tự động đổi theo cấu hình chọn, nút "Thêm vào giỏ" và "Mua ngay".
- **Đường dẫn file:**
  - `Frontend/src/pages/product/ProductDetailPage.tsx`
  - `Frontend/src/components/product/ProductGallery.tsx`
  - `Frontend/src/components/product/VariantSelector.tsx`
  - `Frontend/src/components/product/TechnicalSpecsTable.tsx`
- **Cần gì:** Swiper slider ảnh, bảng thông số kỹ thuật (Màn hình, Chip, RAM, Pin, Camera).
- **Làm gì:** Đổi cấu hình ROM/Màu thì cập nhật giá bán và trạng thái còn hàng/hết hàng realtime.
- **Tiêu chuẩn nghiệm thu:** Bấm chọn iPhone 15 Pro Max bản 512GB giá tự động nhảy từ 29tr lên 35tr đúng với dữ liệu backend.

---

### 👤 FE 2: vũ Nguyễn Lê (`@vunguynle1`)

#### 🎯 Task FE2-01: Thiết Kế Header, Navigation Bar & Footer Thương Hiệu
- **Mục tiêu:** Xây dựng Header chuẩn e-commerce công nghệ: Logo GreenPhone, ô tìm kiếm thông minh có gợi ý, danh mục hãng (Apple, Samsung, Xiaomi), icon giỏ hàng kèm badge số lượng, menu tài khoản người dùng và Footer chính sách bảo hành.
- **Đường dẫn file:**
  - `Frontend/src/components/layout/Header.tsx`
  - `Frontend/src/components/layout/Navbar.tsx`
  - `Frontend/src/components/layout/Footer.tsx`
  - `Frontend/src/components/layout/SearchBar.tsx`
- **Cần gì:** Lucide icons (`Smartphone`, `ShoppingCart`, `User`, `Search`, `ShieldCheck`).
- **Làm gì:** Header cố định khi cuộn trang (Sticky), hiển thị số lượng sản phẩm trong giỏ lấy từ Redux cart state.
- **Tiêu chuẩn nghiệm thu:** Giao diện co giãn chuẩn trên cả Desktop và màn hình điện thoại di động (Responsive).

#### 🎯 Task FE2-02: Giao Diện Trang Chủ (Homepage) & Banner Chiến Dịch
- **Mục tiêu:** Trang chủ bắt mắt: Slider banner quảng cáo chiến dịch mở bán, danh mục chọn nhanh theo hãng, danh sách "Điện thoại hot nhất", "Flash Sale giá sốc", và cam kết chính hãng 100% đổi mới 30 ngày.
- **Đường dẫn file:**
  - `Frontend/src/pages/home/HomePage.tsx`
  - `Frontend/src/components/home/HeroBannerSlider.tsx`
  - `Frontend/src/components/home/BrandQuickSelect.tsx`
  - `Frontend/src/components/home/ProductCard.tsx`
- **Cần gì:** Thư viện `swiper` tạo hiệu ứng chuyển banner mượt mà.
- **Làm gì:** Hiển thị thẻ card điện thoại gồm ảnh đại diện, tên máy, nhãn giảm giá %, giá bán và giá niêm yết gạch ngang, thông số tóm tắt (RAM/ROM).
- **Tiêu chuẩn nghiệm thu:** Bấm vào thẻ điện thoại chuyển hướng mượt mà sang trang chi tiết đúng slug của máy.

#### 🎯 Task FE2-03: Giao Diện Trang Danh Sách Sản Phẩm & Sidebar Bộ Lọc Động
- **Mục tiêu:** Trang `/products` có Sidebar lọc đa tiêu chí: Lọc theo Hãng (Apple, Samsung, Xiaomi), Lọc theo Mức giá (Dưới 5 triệu, 5-10 triệu, 10-20 triệu, Trên 20 triệu), Lọc theo RAM, Bộ nhớ trong ROM; đồng bộ URL query parameters.
- **Đường dẫn file:**
  - `Frontend/src/pages/product/ProductsPage.tsx`
  - `Frontend/src/components/product/FilterSidebar.tsx`
  - `Frontend/src/components/product/SortSelector.tsx`
  - `Frontend/src/components/product/ActiveFilters.tsx`
- **Cần gì:** `useSearchParams` từ React Router để đồng bộ bộ lọc lên thanh địa chỉ URL.
- **Làm gì:** Khi tick chọn "Apple" và "Trên 20 triệu", danh sách lập tức lọc lại các dòng iPhone cao cấp mà không cần tải lại toàn bộ trang.
- **Tiêu chuẩn nghiệm thu:** Copy link URL có chứa query param gửi sang tab khác vẫn giữ nguyên trạng thái các bộ lọc đang chọn.

---

### 👤 FE 3: Đăng Dương (`@dangduongre`)

#### 🎯 Task FE3-01: Mini-Cart Slide-Over Drawer (Quản Lý Giỏ Hàng Nhanh)
- **Mục tiêu:** Ngăn kéo giỏ hàng trượt từ bên phải màn hình ra khi người dùng bấm icon giỏ hàng hoặc vừa bấm "Thêm vào giỏ", hiển thị danh sách máy đã chọn, tăng giảm số lượng tức thì.
- **Đường dẫn file:**
  - `Frontend/src/components/cart/CartDrawer.tsx`
  - `Frontend/src/store/slices/cartSlice.ts`
  - `Frontend/src/services/cartService.ts`
- **Cần gì:** Redux Toolkit cart slice, Ant Design Drawer component.
- **Làm gì:** Tính tổng tiền tự động, có nút "Xem giỏ hàng chi tiết" và "Thanh toán ngay".
- **Tiêu chuẩn nghiệm thu:** Thêm điện thoại vào giỏ thì drawer tự động mở, số lượng trên icon giỏ hàng ở Header tự động tăng.

#### 🎯 Task FE3-02: Trang Giỏ Hàng Chi Tiết (/cart) & Áp Dụng Mã Giảm Giá
- **Mục tiêu:** Trang xem lại toàn bộ giỏ hàng trước khi thanh toán: danh sách máy, phân loại cấu hình (Màu sắc, Dung lượng), ô nhập mã Voucher giảm giá, bảng tính chi tiết tiền hàng và tiền chiết khấu.
- **Đường dẫn file:**
  - `Frontend/src/pages/cart/CartPage.tsx`
  - `Frontend/src/components/cart/CouponInput.tsx`
  - `Frontend/src/components/cart/CartSummary.tsx`
- **Cần gì:** Tích hợp API kiểm tra voucher của BE3.
- **Làm gì:** Nhập mã giảm giá hợp lệ thì hiển thị số tiền được giảm màu xanh lá cây và trừ trực tiếp vào tổng tiền cần thanh toán.
- **Tiêu chuẩn nghiệm thu:** Xóa sản phẩm khỏi giỏ có hộp thoại xác nhận; giỏ hàng rỗng hiển thị thông báo "Chưa có sản phẩm nào".

#### 🎯 Task FE3-03: Giao Diện Quản Trị: Quản Lý Sản Phẩm & Biến Thể Kho Máy (Admin Product CRUD)
- **Mục tiêu:** Giao diện dành cho Admin để thêm mới mẫu điện thoại, upload ảnh lên Cloudinary, tạo ma trận biến thể cấu hình (Dung lượng 128/256/512GB + Màu Đen/Trắng/Xanh) kèm số lượng tồn kho từng loại.
- **Đường dẫn file:**
  - `Frontend/src/pages/admin/AdminProductsPage.tsx`
  - `Frontend/src/components/admin/ProductFormModal.tsx`
  - `Frontend/src/components/admin/VariantStockTable.tsx`
  - `Frontend/src/services/adminProductService.ts`
- **Cần gì:** Ant Design Table, Modal, Upload, Form components.
- **Làm gì:** Bảng danh sách điện thoại có tìm kiếm theo tên, lọc theo hãng, nút Xem/Sửa/Xóa. Form thêm mới hỗ trợ kéo thả nhiều ảnh.
- **Tiêu chuẩn nghiệm thu:** Admin thêm thành công 1 mẫu điện thoại mới kèm 3 biến thể dung lượng, ra ngoài trang chủ thấy hiển thị ngay.

---

# 🚀 SPRINT 2: ĐẶT HÀNG, THANH TOÁN VIETQR SEPAY, BỘ LỌC ĐA TIÊU CHÍ & ADMIN QUẢN TRỊ

---

### 👤 BE 1: dangnguyen vu (`@dangnguyenvu`)
1. **`[BE1] Tích hợp Cổng Thanh Toán Tự Động SePay (VietQR Webhook)`**
   - File: `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/SepayWebhookController.java`, `service/SepayService.java`
   - Nhận Webhook từ SePay khi khách hàng chuyển khoản quét mã QR ngân hàng, kiểm tra API Key bảo mật, tự động khớp mã đơn hàng trong nội dung chuyển khoản và chuyển trạng thái đơn hàng sang `PAID`.
2. **`[BE1] Email Service & Gửi Mã Xác Thực OTP / Quên Mật Khẩu`**
   - File: `GreenPhone-Backend/src/main/java/com/re/greenphone/service/EmailService.java`, `config/MailConfig.java`
   - Gửi email xác nhận đơn hàng thành công kèm chi tiết máy, gửi email mã OTP 6 số để đổi mật khẩu với thời hạn sống 5 phút.
3. **`[BE1] Đóng Gói Docker Compose & Tối Ưu Triển Khai VPS Ubuntu`**
   - File: `docker-compose.yml`, `scripts/init-vps.sh`, `scripts/backup-db.sh`
   - Cấu hình chạy production trên VPS `103.77.208.221`, thiết lập cronjob tự động sao lưu dữ liệu MySQL lúc 02:00 sáng.

### 👤 BE 2: 38.Phucthinh (`@38phucthinh`)
4. **`[BE2] API Danh Mục Điện Thoại & Bộ Lọc Đa Tiêu Chí Động`**
   - File: `GreenPhone-Backend/src/main/java/com/re/greenphone/service/PhoneService.java`, `repository/PhoneRepository.java`
   - Viết câu truy vấn lọc linh hoạt kết hợp Hãng, Khoảng giá, RAM, ROM, Hỗ trợ 5G, Sắp xếp theo giá tăng/giảm hoặc hàng mới về.
5. **`[BE2] API Chi Tiết Điện Thoại & Truy Vấn Biến Thể Tồn Kho`**
   - File: `GreenPhone-Backend/src/main/java/com/re/greenphone/controller/PhoneController.java`
   - Endpoint `GET /api/v1/phones/{slug}` trả về toàn bộ thông số chi tiết của máy, danh sách ảnh HD và ma trận biến thể.
6. **`[BE2] Module Đánh Giá Sản Phẩm (Reviews & Ratings Service)`**
   - File: `GreenPhone-Backend/src/main/java/com/re/greenphone/service/ReviewService.java`, `controller/ReviewController.java`
   - Khách hàng sau khi mua máy được đánh giá 1-5 sao, nhận xét về độ mượt, camera, pin; Admin có quyền kiểm duyệt/ẩn đánh giá xấu.

### 👤 BE 3: Đạt Phan Văn (`@dtphanvan3`)
7. **`[BE3] Order Service & Khóa Tồn Kho Chống Bán Âm (Pessimistic Concurrency Lock)`**
   - File: `GreenPhone-Backend/src/main/java/com/re/greenphone/service/OrderService.java`, `repository/PhoneVariantRepository.java`
   - Dùng `@Lock(LockModeType.PESSIMISTIC_WRITE)` khi trừ tồn kho máy trong giao dịch `@Transactional`, ngăn chặn triệt để race condition khi có nhiều người cùng mua 1 chiếc máy cuối cùng.
8. **`[BE3] Scheduler Tự Động Hủy Đơn Quá Hạn & Hoàn Tồn Kho (OrderTimeoutScheduler)`**
   - File: `GreenPhone-Backend/src/main/java/com/re/greenphone/service/OrderTimeoutScheduler.java`
   - Chạy ngầm định kỳ mỗi 5 phút quét các đơn hàng chọn hình thức chuyển khoản quét mã VietQR mà sau 15 phút chưa thanh toán $\rightarrow$ Tự động hủy đơn và cộng trả lại số lượng máy vào kho.
9. **`[BE3] Admin Order Management API (Xử Lý & Cập Nhật Tiến Độ Giao Hàng)`**
   - File: `GreenPhone-Backend/src/main/java/com/re/greenphone/service/admin/AdminOrderService.java`
   - Cho phép Admin chuyển trạng thái đơn hàng: Chờ xác nhận $\rightarrow$ Đang đóng gói $\rightarrow$ Đang giao hàng $\rightarrow$ Đã giao $\rightarrow$ Hoàn thành.

### 👤 FE 1: Toàn Nguyễn Văn (`@toannguynvan12`)
10. **`[FE1] Giao Diện Trang Thanh Toán (One-Page Checkout Flow)`**
    - File: `Frontend/src/pages/checkout/CheckoutPage.tsx`, `components/checkout/AddressSelector.tsx`
    - Nhập thông tin người nhận hàng, chọn hình thức thanh toán (COD nhận hàng thanh toán hoặc Chuyển khoản quét mã VietQR).
11. **`[FE1] Màn Hình Thanh Toán VietQR Động (Dynamic VietQR Payment Page)`**
    - File: `Frontend/src/pages/checkout/PaymentPage.tsx`
    - Hiển thị mã QR ngân hàng có sẵn số tiền và nội dung chuyển khoản tự động, đồng hồ đếm ngược 15 phút, tự động chuyển trang khi nhận được tiền thành công.
12. **`[FE1] Giao Diện Hồ Sơ Khách Hàng & Sổ Địa Chỉ (Customer Profile & Address)`**
    - File: `Frontend/src/pages/account/AccountProfilePage.tsx`, `AccountPasswordPage.tsx`
    - Quản lý thông tin cá nhân, danh sách địa chỉ nhận hàng, đổi mật khẩu.

### 👤 FE 2: vũ Nguyễn Lê (`@vunguynle1`)
13. **`[FE2] Khu Vực Đánh Giá & Nhận Xét Trực Quan Trên PDP`**
    - File: `Frontend/src/pages/product/ProductDetailPage.tsx` (phần Reviews)
    - Hiển thị số sao trung bình, biểu đồ tỷ lệ đánh giá 5 sao, danh sách nhận xét thực tế của người mua kèm ảnh chụp máy trên tay.
14. **`[FE2] Giao Diện Tra Cứu & Lịch Sử Mua Hàng (Order History & Tracking)`**
    - File: `Frontend/src/pages/account/AccountOrdersPage.tsx`, `AccountOrderDetailPage.tsx`
    - Khách hàng xem lại các đơn hàng đã đặt, xem tiến độ giao hàng và chi tiết các dòng máy trong đơn.
15. **`[FE2] Tối Ưu Hóa Trải Nghiệm Mobile & Responsive Toàn Diện`**
    - Tối ưu giao diện thanh điều hướng dưới đáy (Mobile Bottom Navigation Bar), menu ngăn kéo trượt, thao tác vuốt ảnh xem điện thoại mượt mà trên smartphone.

### 👤 FE 3: Đăng Dương (`@dangduongre`)
16. **`[FE3] Giao Diện Admin: Quản Lý Đơn Hàng & Duyệt Đơn (Admin Order Management)`**
    - File: `Frontend/src/pages/admin/AdminOrdersPage.tsx`
    - Bảng danh sách đơn hàng lọc theo trạng thái, xem chi tiết máy khách đặt, nút bấm duyệt đơn và cập nhật tiến độ giao hàng.
17. **`[FE3] Giao Diện Admin: Quản Lý Hãng (Brand) & Thuộc Tính Thông Số (Options)`**
    - File: `Frontend/src/pages/admin/AdminBrandsPage.tsx`, `AdminOptionsPage.tsx`
    - Thêm sửa xóa các hãng sản xuất và quản lý cây thông số kỹ thuật (RAM, ROM, Màn hình, Chip).
18. **`[FE3] Giao Diện Admin: Quản Lý Banner Quảng Cáo & Mã Khuyến Mãi (Vouchers)`**
    - File: `Frontend/src/pages/admin/AdminBannersPage.tsx`, `AdminPromotionsPage.tsx`
    - Quản lý danh sách voucher giảm giá, ngày hết hạn và banner hiển thị trang chủ.

---

# 🚀 SPRINT 3: BÁO CÁO DOANH THU ADMIN, BẢO MẬT NÂNG CAO & KIỂM THỬ TOÀN DIỆN (E2E)

---

### 👤 BE 1: dangnguyen vu (`@dangnguyenvu`)
1. **`[BE1] Bảo Mật Nâng Cao: Rate Limiting & Chống Spam Request`** (Giới hạn request trên API đăng nhập, tạo đơn hàng).
2. **`[BE1] Thiết Lập Nginx Reverse Proxy & Chứng Chỉ SSL Cho VPS GreenPhone`** (Cấu hình domain `greenphone.vn`, cấp SSL tự động).
3. **`[BE1] Tích Hợp Thêm Cổng Thanh Toán VNPay Sandbox`** (Bổ sung cổng thanh toán thẻ ATM / Visa qua VNPay).

### 👤 BE 2: 38.Phucthinh (`@38phucthinh`)
4. **`[BE2] Tìm Kiếm Tự Động Hoàn Thành (Search Autocomplete & Suggestions)`** (Gợi ý nhanh tên máy kèm ảnh khi gõ từ khóa trên Header).
5. **`[BE2] So Sánh Thông Số Kỹ Thuật Giữa 2 Mẫu Điện Thoại`** (API so sánh chi tiết chip, camera, pin giữa 2 máy).
6. **`[BE2] Quản Lý Cài Đặt Hệ Thống (System Settings API)`** (Hotline, email hỗ trợ, phí vận chuyển toàn quốc).

### 👤 BE 3: Đạt Phan Văn (`@dtphanvan3`)
7. **`[BE3] Admin Statistics Service: Báo Cáo Doanh Thu & Số Liệu Tài Chính`** (Doanh thu theo ngày/tháng, số đơn thành công).
8. **`[BE3] Phân Tích Top Smartphone Bán Chạy Nhất & Cơ Cấu Hãng`** (Thống kê số lượng bán theo Apple vs Samsung vs Xiaomi).
9. **`[BE3] Tự Động Gửi Email Khảo Sát & Chăm Sóc Khách Hàng Sau Khi Nhận Máy`** (Email tự động mời đánh giá sản phẩm sau 3 ngày giao thành công).

### 👤 FE 1: Toàn Nguyễn Văn (`@toannguynvan12`)
10. **`[FE1] Giao Diện So Sánh 2 Điện Thoại (Phone Comparison Page)`** (Bảng đối chiếu thông số 2 máy cạnh nhau).
11. **`[FE1] Trang Thành Công & Hướng Dẫn Kích Hoạt Bảo Hành Điện Tử`** (Trang `/checkout/success` kèm mã bảo hành IMEI).
12. **`[FE1] Tối Ưu SEO Meta Tags & Thẻ OpenGraph Chia Sẻ Mạng Xã Hội`** (Chia sẻ link điện thoại lên Facebook có ảnh và giá preview).

### 👤 FE 2: vũ Nguyễn Lê (`@vunguynle1`)
13. **`[FE2] Trang Danh Sách Mã Khuyến Mãi (Vouchers Center Page)`** (Trang `/vouchers` cho khách lưu mã giảm giá vào ví).
14. **`[FE2] Kiểm Thử Giao Diện Tự Động End-to-End Bằng Playwright`** (Chạy kịch bản tự động test luồng mua hàng).
15. **`[FE2] Tối Ưu Tốc Độ Tải Trang & Google Lighthouse > 90 Điểm`** (Lazy loading ảnh, tối ưu bundle JavaScript).

### 👤 FE 3: Đăng Dương (`@dangduongre`)
16. **`[FE3] Admin Dashboard: Biểu Đồ Doanh Thu & Thống Kê Trực Quan`** (Biểu đồ doanh thu dạng đường/cột, tỷ lệ thanh toán).
17. **`[FE3] Giao Diện Admin: Quản Lý Người Dùng & Phân Quyền (Admin User Management)`** (Khóa/mở tài khoản, cấp quyền nhân viên).
18. **`[FE3] Xuất Báo Cáo Doanh Thu & Đơn Hàng Ra File Excel (.xlsx)`** (Tải file báo cáo kế toán bán hàng).

---

# 🚀 SPRINT 4: TỔNG KẾT, BẢO TRÌ, DEPLOY VPS CHÍNH THỨC & BẢO VỆ ĐỒ ÁN
- Toàn đội tập trung hoàn thiện báo cáo đồ án, tổng duyệt kịch bản demo (Slide thuyết trình + Video demo + Hệ thống chạy trực tiếp trên VPS).
- Đóng gói tài liệu bàn giao, sơ đồ kiến trúc, tài liệu API Swagger và bộ test case hoàn chỉnh.

---
*Tài liệu này được đồng bộ 100% với Trello Board của nhóm GreenPhone.*
