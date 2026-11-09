<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **GreenPhone-** (1663 symbols, 3784 relationships, 135 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/GreenPhone-/context` | Codebase overview, check index freshness |
| `gitnexus://repo/GreenPhone-/clusters` | All functional areas |
| `gitnexus://repo/GreenPhone-/processes` | All execution flows |
| `gitnexus://repo/GreenPhone-/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

---

# NHẬT KÝ THỰC THI & NÂNG CẤP HẠ TẦNG (SYSTEM EXECUTION & CHANGELOG)

Phần này ghi nhận toàn bộ các công việc nâng cấp kiến trúc, di chuyển dữ liệu và tích hợp hạ tầng đám mây đã được thực thi trên dự án GreenPhone.

## 1. Bối Cảnh & Mục Tiêu Nâng Cấp
- Đối chiếu toàn diện giữa hai hệ sinh thái cơ sở dữ liệu: PinkPhone (mô hình UUID v7, cấu trúc dữ liệu phẳng) và GreenPhone (mô hình BIGINT AUTO_INCREMENT, cấu trúc biến thể chuẩn hóa đa cấp theo option_item).
- Đồng bộ toàn bộ danh mục sản phẩm từ PinkPhone sang GreenPhone: nâng từ 6 sản phẩm cơ bản lên 50 dòng điện thoại thế hệ mới cùng 150 biến thể chi tiết và thông số kỹ thuật thực tế.
- Chuyển đổi toàn bộ giải pháp lưu trữ hình ảnh sang Cloudflare R2 (tương thích AWS S3, miễn phí chi phí băng thông tải ra - Zero Egress Fees, tốc độ phân phối CDN toàn cầu), thay thế hoàn toàn các liên kết CDN không ổn định hoặc quá hạn.
- Đảm bảo tính toàn vẹn dữ liệu: không xóa bảng, không drop database, không làm gián đoạn các bảng đơn hàng, giỏ hàng hiện hữu trên GreenPhone.

## 2. Các Hạng Mục Kỹ Thuật Đã Hoàn Thành

### 2.1. Tích Hợp Cloudflare R2 Vào Backend (Spring Boot)
- Thư viện: Bổ sung AWS SDK S3 v2 (software.amazon.awssdk:s3:2.25.16) vào file GreenPhone-Backend/build.gradle.
- Cấu hình môi trường:
  - Cập nhật file .env với các biến: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL.
  - Cập nhật GreenPhone-Backend/src/main/resources/application.yml với tiền tố cấu hình cloudflare.r2.
- Mã nguồn triển khai:
  - com.re.greenphone.config.R2Config: Khởi tạo S3Client kết nối trực tiếp đến endpoint https://<account_id>.r2.cloudflarestorage.com với Region.of("auto").
  - com.re.greenphone.service.R2StorageService: Xây dựng service chịu trách nhiệm kiểm tra định dạng ảnh (JPEG, PNG, WEBP, GIF), giới hạn kích thước tối đa (10MB), sinh khóa định danh ngẫu nhiên (UUID) và thực hiện PutObject / DeleteObject.
  - com.re.greenphone.service.admin.AdminPhoneService: Tích hợp R2StorageService làm kênh lưu trữ ưu tiên hàng đầu cho các thao tác upload ảnh sản phẩm từ Admin, duy trì Cloudinary làm phương án dự phòng và hỗ trợ xóa ảnh đồng thời trên cả hai nền tảng.
- Kiểm thử biên dịch: Thực thi lệnh ./gradlew compileJava thành công không có lỗi (Exit code 0).

### 2.2. Di Chuyển Toàn Bộ Hình Ảnh Lên Bucket Cloudflare R2
- Đã thực hiện quét, tải và chuẩn hóa toàn bộ 142 tệp hình ảnh tài nguyên:
  - 117 hình ảnh biến thể điện thoại chất lượng cao từ PinkPhone (Apple, Samsung, Xiaomi, OPPO, Google Pixel, ASUS ROG Phone, OnePlus, Sony Xperia, Vivo, Realme).
  - Toàn bộ ảnh banner quảng cáo và logo các thương hiệu lớn.
- Đã upload thành công 142/142 tệp lên Cloudflare R2 Bucket: greenphone-media.
- Tên miền phân phối công khai: https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev.
- Trạng thái kiểm tra kết nối thực nghiệm: Lệnh upload và tải công khai trả về mã trạng thái HTTP 200 OK.

### 2.3. Tạo Bản Di Chuyển Cơ Sở Dữ Liệu Chuẩn Hóa (Flyway Migration V4.1)
- Vị trí tệp: GreenPhone-Backend/src/main/resources/db/migration/V4.1__import_50_phones_with_r2_images.sql.
- Dung lượng tệp: Khoảng 281 KB, được thiết kế theo nguyên tắc an toàn dữ liệu tuyệt đối (Idempotent và Data Preservation).
- Chi tiết nội dung nạp dữ liệu:
  - Bổ sung 6 thương hiệu mới: Google Pixel, ASUS, OnePlus, Sony, Realme, Vivo.
  - Bổ sung đầy đủ các tùy chọn cấu hình trong option_item: RAM (12GB, 16GB, 24GB), ROM (512GB, 1TB) và 68 màu sắc đặc trưng của các dòng máy flagship.
  - Cập nhật toàn bộ URL của banner, logo thương hiệu và các sản phẩm cũ sang tên miền Cloudflare R2.
  - Chèn mới 50 dòng điện thoại với đầy đủ thông số kỹ thuật chi tiết: công nghệ màn hình, vi xử lý CPU, cụm camera, dung lượng pin, công suất sạc và phiên bản hệ điều hành.
  - Chèn 150 biến thể sản phẩm (phone_variant) với dải ID từ 500 trở lên, tự động liên kết chính xác đến các khóa ngoại ram_item_id, storage_item_id, color_item_id thông qua các truy vấn con an toàn.
  - Chèn 150 bản ghi hình ảnh sản phẩm (phone_image) trỏ trực tiếp đến kho ảnh Cloudflare R2.

### 2.4. Phân Tích Khoảng Cách Nghiệp Vụ & Thiết Kế Backlog Sprint 3
- Đã xuất tài liệu phân tích kỹ thuật: SO_SANH_PINKPHONE_VA_GREENPHONE_BACKLOG_TASKS.md.
- Phân rã chi tiết các User Story kèm Story Points cho phân hệ Quản trị Kho & Chuỗi cung ứng:
  - Task V5: Quản lý kho đa điểm, cơ chế giữ hàng trong giỏ (reserved_quantity) và phòng chống bán vượt tồn kho (Overselling).
  - Task V6: Quản lý danh mục nhà cung cấp, lập đơn đặt hàng nhập kho (Purchase Orders) và theo dõi công nợ.
  - Task V7: Quản lý vòng đời thiết bị theo mã định danh duy nhất (IMEI/Serial), kích hoạt bảo hành điện tử và tiếp nhận bảo hành dịch vụ.

### 2.5. Triển Khai Chiến Lược Nâng Cấp Database (Giai Đoạn 1: V5, V6, V7)
Đã hoàn tất tạo và nạp thành công 3 tệp migration lũy tiến không gây gián đoạn (Non-breaking Migrations):
- V5 (db/migration/V5__enhance_inventory_and_stock_reservation.sql):
  - Bổ sung trường reserved_quantity vào phone_variant (mặc định 0).
  - Tạo bảng warehouse quản trị kho đa điểm (mã kho, tên, địa chỉ, trạng thái).
  - Tạo bảng stock_reservation lưu trữ trạng thái giữ chỗ tồn kho trong 15 phút (ACTIVE, CONSUMED, RELEASED) kèm khóa ngoại an toàn.
  - Khởi tạo 2 kho mặc định: WH-HN-MAIN (Kho Tổng Hà Nội) và WH-HCM-Q1 (Kho Chi Nhánh TP.HCM).
- V6 (db/migration/V6__create_suppliers_and_purchase_orders.sql):
  - Tạo bảng supplier quản lý danh mục Nhà cung cấp chính hãng (mã, tên, email, hotline, địa chỉ).
  - Tạo bảng purchase_order (PO) quản lý đơn đặt mua hàng nhập kho và tiến độ nhập hàng (DRAFT, ORDERED, RECEIVED, CANCELLED).
  - Tạo bảng purchase_order_item lưu chi tiết từng biến thể, số lượng đặt, số lượng thực nhận và đơn giá nhập.
  - Khởi tạo 3 nhà cung cấp chính hãng: Apple Vietnam LLC, FPT Synnex Distribution, Digiworld Corporation.
- V7 (db/migration/V7__create_warranties_and_units.sql):
  - Tạo bảng warranty quản lý bảo hành điện tử theo số IMEI và số điện thoại khách hàng, tự động xác định ngày bắt đầu/kết thúc bảo hành 12 tháng.
  - Tạo bảng wishlist quản lý danh sách sản phẩm yêu thích gắn với từng tài khoản khách hàng.
- Đồng bộ Entity: Đã cập nhật thuộc tính reservedQuantity trong entity PhoneVariant.java.
- Kiểm thử thực nghiệm:
  - Frontend: Lệnh npm run build hoàn thành thành công trong 6.50 giây với 0 lỗi (Exit code 0).
  - Database: Đã áp dụng trực tiếp 7 bảng mới và dữ liệu mẫu vào cơ sở dữ liệu MySQL greenphone mà không làm gián đoạn các bảng hiện hữu.

## 3. Quy Trình Vận Hành & Nghiệm Thu Tiếp Theo
Khi khởi động hệ thống để nghiệm thu dữ liệu mới:
1. Chạy dịch vụ MySQL cục bộ và khởi động Backend GreenPhone:
   ```bash
   cd GreenPhone-Backend
   ./gradlew bootRun
   ```
   Flyway sẽ tự động nhận diện và thực thi tệp V4.1__import_50_phones_with_r2_images.sql để hoàn tất nạp dữ liệu.
2. Kiểm tra giao diện người dùng trên Frontend:
   ```bash
   cd Frontend
   npm run dev
   ```
   Truy cập danh mục sản phẩm, bộ lọc tìm kiếm và trang chi tiết điện thoại để xác nhận hình ảnh hiển thị mượt mà từ Cloudflare R2.
