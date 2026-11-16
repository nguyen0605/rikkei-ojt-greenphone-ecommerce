# BÁO CÁO KẾ HOẠCH SPRINT VÀ PHÂN BỔ NHIỆM VỤ SPRINT 4

Dự án: GREENPHONE - Hệ Thống Thương Mại Điện Tử Bán Điện Thoại Thông Minh
Đơn vị: Đồ án On-the-Job Training (OJT) - Rikkei Academy
Mã lớp: HCM-KS24-CNTT1
Thời lượng Sprint: 01 tuần (Từ ngày 16/11/2026 đến hết ngày 22/11/2026 - Sprint Nước Rút Về Đích)
Quy mô: 06 Thành viên Kỹ thuật (Fullstack & DevOps)
Nguồn dữ liệu đồng bộ: Cột Sprint Backlog (Sprint 4) trên Trello Board chính thức (https://trello.com/b/LBnO1w9t/greenphone-smartphone-e-commerce)
Ngày lập kế hoạch: 15 tháng 11 năm 2026

---

## 1. THÔNG TIN CHUNG VÀ BỐI CẢNH ĐẦU SPRINT 4

### 1.1. Bối cảnh dự án
GreenPhone là hệ thống thương mại điện tử chuyên sâu thiết bị di động chính hãng, kết hợp công nghệ hiện đại Spring Boot 3 (Java 21) ở tầng Backend và React 19 (TypeScript, Vite, Tailwind CSS) ở tầng Frontend.

Trải qua 3 Sprint đầu tiên:
- Sprint 1: Thiết lập kiến trúc đa tầng, xác thực JWT Bearer, quản trị danh mục smartphone, ma trận biến thể đa cấp và luồng mua sắm cơ bản, nghiệm thu 17 thẻ.
- Sprint 2: Nâng cấp thanh toán tự động VietQR SePay Webhook, cơ chế khóa bi quan (@Lock Pessimistic Write) chống bán âm kho biến thể, đồng bộ giỏ hàng, máy trạng thái đơn hàng (Order State Machine), hạ tầng OTP Redis và Nginx SSL Let's Encrypt production, nghiệm thu 24 thẻ.
- Sprint 3: Bứt phá toàn diện chuỗi cung ứng và hậu mãi với 34 thẻ hoàn thành vào cột Done Sprint 3. Điểm nhấn: Quản trị kho đa điểm, lập đơn đặt mua hàng PO tăng tồn kho, tự động kích hoạt và tra cứu bảo hành điện tử theo mã IMEI, quy trình thẩm định kỹ thuật đổi trả và hoàn tiền đơn hàng, bản đồ theo dõi giao vận thời gian thực OpenStreetMap, và đồng bộ danh sách sản phẩm yêu thích (Wishlist).

### 1.2. Tính chất quyết định của Sprint 4
Sprint 4 là Sprint cuối cùng của chu kỳ thực tập OJT, có tính chất quyết định đến toàn bộ kết quả bảo vệ đồ án trước Hội đồng Chuyên môn Rikkei Academy. Trọng tâm của Sprint này tập trung vào 4 trụ cột then chốt:
1. Đột phá công nghệ: Tích hợp trợ lý tư vấn mua sắm thông minh Google Gemini AI Chatbot và upload đa phương tiện ảnh đánh giá sản phẩm lên Cloudflare R2.
2. Hoàn thiện nghiệp vụ bán lẻ thực tế: Tính toán giá vốn hàng bán COGS, báo cáo lợi nhuận gộp, xuất hóa đơn bán lẻ kiêm phiếu xuất kho và tiếp nhận thông tin hóa đơn giá trị gia tăng (VAT).
3. Tối ưu trải nghiệm khách hàng (CRO & UX): Pop-up thông báo mã giảm giá sâu khi đăng nhập, khắc phục triệt để các lỗi đồng bộ bộ lọc, rò rỉ trạng thái yêu thích, và chuẩn hóa responsive trên toàn bộ thiết bị di động.
4. Tối ưu hiệu năng & Đóng gói sản phẩm: Đạt điểm số Google Lighthouse trên 90 điểm, hoàn thiện hồ sơ kỹ thuật theo chuẩn mẫu SEC-14 và tổng duyệt kịch bản demo bảo vệ.

---

## 2. MỤC TIÊU SPRINT 4 (SPRINT GOAL)

Tuyên ngôn mục tiêu Sprint 4:
> "Hoàn thiện bức tranh giải pháp thương mại điện tử toàn diện bằng việc tích hợp trợ lý ảo tư vấn mua sắm Google Gemini AI, nâng cấp hệ thống đánh giá sản phẩm có hình ảnh thực tế lưu trữ Cloudflare R2; khép kín bài toán tài chính kế toán với giá vốn COGS và in hóa đơn bán lẻ VAT; tối ưu hóa triệt để trải nghiệm di động (Mobile-First) và tốc độ tải trang đạt chuẩn Google Lighthouse > 90 điểm, sẵn sàng 100% cho buổi lễ nghiệm thu và bảo vệ tốt nghiệp OJT."

---

## 3. BẢNG THỐNG KÊ CÔNG VIỆC, SỐ TASK VÀ ĐIỂM THEO TỪNG THÀNH VIÊN

*(Bảng tổng hợp năng lực và khối lượng giao việc chi tiết cho 06 thành viên kỹ thuật trong Sprint 4, xuất hiện trực tiếp ngay sau Tuyên ngôn Mục tiêu Sprint theo đúng quy chuẩn dự án)*

| Họ và tên | Username Trello | Vai trò phân công Sprint 4 | Phân hệ kỹ thuật chủ quản | Số task | Tổng điểm (SP) | Tỷ trọng cam kết |
|---|---|---|---|:---:|:---:|:---:|
| **Vũ Đăng Nguyên** | `dangnguyenvu` | Lead Tech & AI Integration / Performance | Gemini AI Assistant Service, Giao diện Chatbot tương tác & Tối ưu Lighthouse > 90 điểm | 3 task | 13 SP | 20.6% |
| **Dương Phúc Thịnh** | `38phucthinh` | Fullstack Lead (Media & Device Sessions) | Backend quản lý phiên thiết bị, API upload ảnh đánh giá R2 & Giao diện Lightbox PDP | 3 task | 11 SP | 17.5% |
| **Nguyễn Trọng Đăng Dương** | `dangduongre` | Backend & Operations Lead (Finance & COGS) | API báo cáo tài chính giá vốn COGS, phân quyền thống kê & Giao diện Dashboard trực quan | 2 task | 10 SP | 15.9% |
| **Nguyễn Lê Vũ** | `vunguynle1` | Frontend & Security Lead (Reports & Sync) | Xuất báo cáo Excel đa sheet/PDF, Giao diện quản lý thiết bị từ xa & Đồng bộ trạng thái đơn hàng | 3 task | 10 SP | 15.9% |
| **Phan Văn Đạt** | `dtphanvan3` | Fullstack Commerce Specialist (Invoices & Marketing) | In hóa đơn bán lẻ kiêm phiếu xuất kho VAT, Pop-up thông báo mã giảm sâu & Bảng so sánh cấu hình | 2 task | 10 SP | 15.9% |
| **Nguyễn Văn Toàn** | `toannguynvan12` | Frontend Core & UX Specialist (Mobile & State Fixes) | Đồng bộ bộ lọc sản phẩm, Khắc phục rò rỉ yêu thích khách vãng lai & Tối ưu Mobile Responsive toàn diện | 3 task | 9 SP | 14.3% |
| **TỔNG CỘNG** | **06 thành viên** | **Fullstack & DevOps Team** | **Toàn diện 5 phân hệ Sprint 4 GreenPhone** | **16 task** | **63 SP** | **100.0%** |

*(Ghi chú: Thành viên Phan Văn Đạt đồng thời phụ trách nghiệm thu đóng gói thẻ chuyển tiếp đang thực thi tại cột In Progress là `[8 SP] [CAT-23] [FS] Tính Năng Và Giao Diện Bảng So Sánh Thông Số Cấu Hình Điện Thoại`, nâng tổng khối lượng thực tế của cá nhân lên 18 SP và toàn đội lên 71 SP).*

---

## 4. CHỈ SỐ CAM KẾT VÀ NĂNG LỰC SPRINT 4 (CAPACITY & VELOCITY)

### 4.1. Phân tích năng lực thực tế
- Thời lượng: 07 ngày làm việc liên tục (từ thứ Hai ngày 16/11 đến Chủ Nhật ngày 22/11/2026).
- Tổng nhân sự: 06 kỹ sư phần mềm (100% nguồn lực tập trung cho đồ án).
- Vận tốc hoàn thành thực tế qua các Sprint (Velocity History):
  - Sprint 1: 62 SP (Trung bình 10.3 SP / thành viên).
  - Sprint 2: 67 SP (Trung bình 11.2 SP / thành viên).
  - Sprint 3: 74 SP nghiệm thu dứt điểm (Trung bình 12.3 SP / thành viên).
- Năng lực cam kết Sprint 4: **63 Story Points** (Trung bình 10.5 SP / thành viên cho 16 thẻ chính trong Sprint Backlog). Mức cam kết này hoàn toàn nằm trong dải vận tốc an toàn của nhóm, đảm bảo vừa hoàn thiện tính năng mới vừa có đủ thời gian kiểm thử tự động, chuẩn bị slide và báo cáo Word mẫu SEC-14.

### 4.2. Bảng phân bổ Story Points theo 5 phân hệ nghiệp vụ

| Mã Module | Tên Phân Hệ Nghiệp Vụ | Số Lượng Thẻ | Điểm Cam Kết (SP) | Tỷ Trọng Điểm Số |
|---|---|:---:|:---:|:---:|
| **CAT** | Catalog, Reviews & AI Assistant | 6 thẻ | 20 SP | 31.7% |
| **ORD** | Order, Finance COGS & Invoices | 4 thẻ | 15 SP | 23.8% |
| **USR** | User Identity, State & Device Management | 4 thẻ | 15 SP | 23.8% |
| **MKT** | Marketing, Pop-up Promo & CRO | 1 thẻ | 5 SP | 7.9% |
| **INF** | Performance, Lighthouse & Optimization | 1 thẻ | 5 SP | 7.9% |
| **TỔNG CỘNG** | **Toàn bộ 5 phân hệ Sprint 4** | **16 thẻ** | **63 SP** | **100.0%** |

---

## 5. TOP HẠNG MỤC CÔNG VIỆC TRỌNG TÂM BỨT PHÁ TRONG SPRINT 4

1. **[CAT-27 & CAT-28] Trợ lý ảo tư vấn mua sắm Google Gemini AI (Tổng 8 SP - Vũ Đăng Nguyên phụ trách):**
   - Tích hợp mô hình ngôn ngữ lớn Google Gemini API để phân tích nhu cầu khách hàng (tầm giá, nhu cầu chụp ảnh, chơi game, dung lượng pin), tự động trích xuất ngữ cảnh và trả về danh sách gợi ý kèm thẻ sản phẩm tương tác trực tiếp ngay trong khung chat nổi.
2. **[ORD-32 & ORD-33] Báo cáo tài chính, giá vốn COGS & Dashboard quản trị (Tổng 10 SP - Nguyễn Trọng Đăng Dương phụ trách):**
   - Kết nối trực tiếp giá nhập kho từ các đơn nhập hàng PO (`PurchaseOrder`) với doanh thu thực tế để tính ra tỷ suất lợi nhuận gộp, doanh thu thuần và cơ cấu doanh thu đa chiều, trực quan hóa trên giao diện Dashboard.
3. **[ORD-36] In hóa đơn bán lẻ kiêm phiếu xuất kho và VAT (5 SP - Phan Văn Đạt phụ trách):**
   - Bổ sung form tiếp nhận thông tin hóa đơn giá trị gia tăng (Tên công ty, Mã số thuế, Địa chỉ công ty) tại bước thanh toán và nút in phiếu xuất kho bán lẻ chuẩn hóa theo mẫu in ấn nhiệt.
4. **[MKT-04] Pop-up thông báo mã giảm giá sâu cho người dùng đăng nhập lần đầu (5 SP - Phan Văn Đạt phụ trách):**
   - Nhận diện mã khuyến mãi có mức giảm cao nhất, tự động hiển thị modal chào mừng khi người dùng đăng nhập lần đầu kèm nút lưu một chạm vào ví cá nhân và cơ chế kiểm soát tần suất LocalStorage.
5. **[CAT-29] Tối ưu hóa trải nghiệm Mobile & Responsive toàn diện (3 SP - Nguyễn Văn Toàn phụ trách):**
   - Xây dựng thanh điều hướng trượt MobileNavDrawer, nút Hamburger trên Header, chuyển đổi giỏ hàng sang dạng thẻ dọc và thanh Sticky Bar mua hàng chân trang PDP.
6. **[INF-12] Tối ưu tốc độ tải trang & Google Lighthouse > 90 điểm (5 SP - Vũ Đăng Nguyên phụ trách):**
   - Tách vendor chunk trong Vite, nén ảnh định dạng WebP, trì hoãn tải tài nguyên không thiết yếu để đạt điểm số hiệu năng tối đa cho tài liệu nghiệm thu.

---

## 6. DANH MỤC TOÀN BỘ 16 THẺ NHIỆM VỤ SPRINT 4 CHI TIẾT

| STT | Mã Task & Tiêu Đề Chi Tiết | SP | Phạm Vi | Người Phụ Trách | Nhãn Độ Ưu Tiên | Mô Tả Tóm Tắt Nhiệm Vụ |
|:---:|---|:---:|:---:|---|---|---|
| 1 | `[5 SP] [ORD-32] [BE] Nâng Cấp API Báo Cáo Tài Chính Đa Chiều, Giá Vốn COGS & Phân Quyền RBAC Thống Kê` | 5 | BE | Nguyễn Trọng Đăng Dương | Priority: Must-Have | Truy vấn giá vốn trung bình từ bảng PurchaseOrder, tính lợi nhuận gộp theo từng dòng máy và mở rộng phân quyền RBAC. |
| 2 | `[5 SP] [ORD-33] [FE] Giao Diện Thống Kê Dashboard Trực Quan & Phân Tầng Dữ Liệu Theo Quyền Hạn` | 5 | FE | Nguyễn Trọng Đăng Dương | Priority: Must-Have | Tích hợp biểu đồ trực quan, hiển thị các chỉ số tài chính, doanh thu, giá vốn và phân tầng thông tin theo vai trò đăng nhập. |
| 3 | `[3 SP] [ORD-34] [FE] Nâng Cấp Xuất Báo Cáo Excel Đa Sheet & PDF Chuẩn Hóa Theo Phân Quyền` | 3 | FE | Nguyễn Lê Vũ | Priority: Should-Have | Tinh chỉnh tính năng xuất file Excel đa sheet (Sheet tổng quan, Sheet chi tiết sản phẩm) và xuất PDF báo cáo doanh thu chuẩn form A4. |
| 4 | `[5 SP] [USR-16] [FE] Giao Diện Quản Lý Thiết Bị Đăng Nhập & Đăng Xuất Từ Xa` | 5 | FE | Nguyễn Lê Vũ | Priority: Should-Have | Xây dựng màn hình danh sách thiết bị đang hoạt động (trình duyệt, hệ điều hành, địa chỉ IP) kèm nút đăng xuất từ xa từng thiết bị. |
| 5 | `[2 SP] [ORD-35] [FE] Đồng Bộ Trang Thái Đơn Hàng Giữa Danh Sách Đơn Mua Và Chi Tiết Đơn` | 2 | FE | Nguyễn Lê Vũ | Priority: Must-Have | Sửa lỗi lệch cache React Query giữa trang danh sách đơn hàng và trang chi tiết đơn, tự động làm mới trạng thái giao hàng tức thì. |
| 6 | `[5 SP] [USR-15] [BE] Trang quan lí thiết bị đăng nhập phía người dùng` | 5 | BE | Dương Phúc Thịnh | Priority: Should-Have | Bóc tách User-Agent, lưu vết địa chỉ IP vào bảng phiên đăng nhập và cung cấp API thu hồi token từ xa qua cơ chế Token Blacklist. |
| 7 | `[3 SP] [CAT-26] [FE] Giao Diện Tải Ảnh Đánh Giá & Đồng Bộ Trình Chiếu Lightbox Trên PDP` | 3 | FE | Dương Phúc Thịnh | Priority: Should-Have | Xây dựng component upload nhiều ảnh khi viết đánh giá và trình chiếu ảnh thực tế dạng pop-up phóng to (Lightbox) tại trang PDP. |
| 8 | `[3 SP] [CAT-25] [BE] API Quản Lý Hình Ảnh Đánh Giá Sản Phẩm & Tích Hợp Lưu Trữ Cloudflare R2` | 3 | BE | Dương Phúc Thịnh | Priority: Should-Have | Bổ sung quan hệ lưu trữ ảnh cho bảng Review, tích hợp R2StorageService kiểm tra định dạng và upload ảnh lên bucket Cloudflare R2. |
| 9 | `[3 SP] [CAT-24] [FE] Khắc Phục Lỗi Đồng Bộ Trạng Thái Bộ Lọc Danh Sách Sản Phẩm Khi Điều Hướng` | 3 | FE | Nguyễn Văn Toàn | Priority: Must-Have | Khắc phục lỗi mất query params bộ lọc khi người dùng chuyển trang hoặc bấm nút quay lại trình duyệt trên trang danh mục sản phẩm. |
| 10 | `[3 SP] [USR-17] [FE] Khắc Phục Rò Rỉ Trạng Thái Sản Phẩm Yêu Thích Khi Chưa Đăng Nhập` | 3 | FE | Nguyễn Văn Toàn | Priority: Must-Have | Dọn dẹp Redux persist và LocalStorage khi đăng xuất, đảm bảo khách vãng lai không nhìn thấy danh sách yêu thích của tài khoản trước. |
| 11 | `[3 SP] [CAT-29] [FE] Tối Ưu Hóa Trải Nghiệm Mobile & Responsive Toàn Diện` | 3 | FE | Nguyễn Văn Toàn | Priority: Must-Have | Xây dựng MobileNavDrawer, nút Hamburger trên Header, chuyển đổi giỏ hàng sang dạng thẻ dọc và thanh Sticky Bar mua hàng chân trang PDP. |
| 12 | `[5 SP] [ORD-36] [FS] In Hóa Đơn Bán Lẻ Kiêm Phiếu Xuất Kho Và Tiếp Nhận Thông Tin Hóa Đơn VAT` | 5 | FS | Phan Văn Đạt | Priority: Must-Have | Lưu thông tin xuất hóa đơn đỏ (VAT) khi đặt hàng và cung cấp giao diện in phiếu xuất kho bán lẻ chuẩn hóa kèm mã QR tra cứu. |
| 13 | `[5 SP] [MKT-04] [FS] Pop-up Thông Báo Mã Khuyến Mãi Sâu Cho Người Dùng Đăng Nhập Lần Đầu` | 5 | FS | Phan Văn Đạt | Priority: Should-Have | API lấy mã giảm sâu nhất, Modal pop-up chào mừng đẹp mắt khi đăng nhập và cơ chế lưu cờ LocalStorage chống hiển thị lặp phiền toái. |
| 14 | `[5 SP] [CAT-27] [BE] Tích Hợp Gemini AI Engine & API Tư Vấn Sản Phẩm (AI Shopping Assistant Service)` | 5 | BE | Vũ Đăng Nguyên | Priority: Should-Have | Tích hợp Google Gemini REST API, thiết kế Prompt công thái học chuyên ngành smartphone và trích xuất gợi ý sản phẩm theo ID. |
| 15 | `[3 SP] [CAT-28] [FE] Khung Chatbot AI Nổi & Thẻ Sản Phẩm Đính Kèm Tương Tác Trực Tiếp` | 3 | FE | Vũ Đăng Nguyên | Priority: Should-Have | Giao diện nút chat nổi góc màn hình, cửa sổ hội thoại mượt mà, render tin nhắn dạng Markdown và đính kèm thẻ điện thoại bấm xem ngay. |
| 16 | `[5 SP] [INF-12] [FE] Tối Ưu Tốc Độ Tải Trang & Google Lighthouse > 90 Điểm` | 5 | FE | Vũ Đăng Nguyên | Priority: Should-Have | Tối ưu hóa bundle Vite, cấu hình chia nhỏ vendor chunks, nén ảnh WebP, preconnect CDN R2 và chạy kiểm thử đo đạc Lighthouse trên 90. |

---

## 7. QUY TRÌNH KIỂM SOÁT TIẾN ĐỘ VÀ TIÊU CHUẨN NGHIỆM THU (DEFINITION OF DONE)

### 7.1. Lịch trình sinh hoạt đội ngũ trong Sprint 4
- **Daily Scrum (Họp nhanh đầu ngày):** 08h30 - 08h45 mỗi sáng qua Google Meet. Mỗi thành viên trả lời 3 câu hỏi:
  1. Hôm qua đã hoàn thành những gì? (Mã thẻ, PR nào đã lên).
  2. Hôm nay sẽ cam kết thực hiện task nào?
  3. Có gặp khó khăn hoặc rào cản kỹ thuật (Blocker) nào cần cả nhóm hỗ trợ không?
- **Review & Merging Window:** 17h00 - 18h00 mỗi ngày. Tech Lead cùng Reviewer tiến hành đối chiếu checklist Trello, chạy kiểm thử tự động trên local trước khi duyệt merge PR vào nhánh `develop`.
- **Sprint Review & Final Dry Run:** 14h00 Chủ Nhật (22/11/2026). Toàn nhóm thực hiện demo thông luồng toàn hệ thống, chạy thử nghiệm kịch bản bảo vệ trước Mentor.

### 7.2. Tiêu chuẩn nghiệm thu sản phẩm (Definition of Done - DoD)
Một thẻ task chỉ được phép kéo từ `Code Review / Testing` sang cột `Done Sprint 4` khi thỏa mãn đồng thời 6 điều kiện nghiêm ngặt:
1. 100% mã nguồn tuân thủ kiến trúc phân tầng (DTO/MapStruct, `ApiResponse<T>`, Zod validation, không leak Entity hoặc secret ra ngoài).
2. Kiểm thử tự động trên Frontend (`npm test -- --run`) đạt 100% test suite pass (tối thiểu 470+ unit & regression tests).
3. Biên dịch Backend (`./gradlew test` hoặc `./gradlew compileJava`) và Frontend (`npm run build`) thành công không lỗi (Exit code 0).
4. Pull Request trên GitHub được gắn đúng mã thẻ Trello, có mô tả chi tiết theo template nghiệm thu chuẩn hóa của dự án.
5. Đã merge code mới nhất từ nhánh `develop` và giải quyết dứt điểm toàn bộ xung đột (merge conflicts).
6. Toàn bộ các tiêu chí trong `Checklist Triển Khai & Nghiệm Thu` trên thẻ Trello đã được Reviewer kiểm tra thực nghiệm và tick chọn đầy đủ.
