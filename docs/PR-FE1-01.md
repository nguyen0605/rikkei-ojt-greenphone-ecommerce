# [FE1-01] Tái Thiết Kế Bộ Chọn Biến Thể Độc Lập

## 📌 THÔNG TIN PULL REQUEST (PR)

- **Mã Thẻ Trello:** https://trello.com/c/greenphone-fe1-01
- **Người thực hiện:** @developer
- **Vai trò phụ trách:** [x] FE1
- **Nhánh tính năng:** `feat/fe1-01-variant-selector` → **Target Branch:** `develop`

---

### 📝 1. Tóm tắt các thay đổi (Chức năng vừa làm)

- [x] **Tính năng 1:** Tách Dung lượng và Màu sắc thành hai nhóm độc lập:
  - Nhóm 1: Dung lượng dạng Card lựa chọn (128GB, 256GB, 512GB, 1TB) hiển thị giá khởi điểm.
  - Nhóm 2: ColorSwatch hiển thị chấm màu tròn chuẩn mã HEX, tên màu tiếng Việt và huy hiệu `(Hết hàng)`.
- [x] **Tính năng 2:** Matrix Availability & Đồng bộ toàn diện:
  - Tự động phát hiện và làm mờ (`opacity-60`), kẻ gạch chéo SVG cho các biến thể hết hàng (`stockQuantity <= 0`) hoặc không có tổ hợp tương thích.
  - Khóa tương tác `disabled` và `aria-disabled="true"`, không kích hoạt callback khi bấm vào biến thể hết hàng.
  - Tự động đồng bộ giá bán, giá gốc gạch ngang và huy hiệu % tiết kiệm.
  - Tự động đồng bộ ảnh Gallery theo màu sắc được chọn.
  - Tự động vô hiệu hóa nút "Thêm vào giỏ hàng" và "Mua ngay" khi biến thể hết hàng hoặc toàn bộ sản phẩm hết hàng.

**Danh sách file chính:**
- `Frontend/src/components/product-detail/colorUtils.ts` (Tạo mới: Từ điển bảng màu HEX + hàm chuẩn hóa fallback an toàn)
- `Frontend/src/components/product-detail/ColorSwatch.tsx` (Tạo mới: Component hiển thị swatch màu sắc độc lập, A11y, SVG gạch chéo)
- `Frontend/src/components/product-detail/VariantSelector.tsx` (Tạo mới: Bộ chọn biến thể 2 nhóm độc lập, ma trận tồn kho, cảnh báo hết hàng)
- `Frontend/src/components/product-detail/index.ts` (Tạo mới: Barrel export cho module `product-detail`)
- `Frontend/src/pages/ProductDetailPage.tsx` (Cập nhật: Tích hợp VariantSelector, đồng bộ Gallery thông minh theo từ khóa/thứ tự màu, bổ sung nút Mua ngay)
- `Frontend/src/components/product-detail/__tests__/ColorSwatch.test.tsx` (Tạo mới: 7 unit test cases cho ColorSwatch)
- `Frontend/src/components/product-detail/__tests__/VariantSelector.test.tsx` (Tạo mới: 11 unit test cases cho VariantSelector)
- `scripts/capture-variant-evidence.cjs` (Tạo mới: Script Playwright chụp ảnh minh chứng tự động)
- `docs/evidence/fe1-01-variant-selector/` (Thư mục 5 ảnh chụp thực tế màn hình)

---

### 🧪 2. Kịch bản & Bằng chứng đã kiểm thử (Testing Evidence)

- [x] Đã kiểm thử chạy thành công tại máy local.
- [ ] **[Backend]** Đã test Swagger/Postman: *N/A (Task thuần Frontend UI/UX, không can thiệp Backend)*.
- [x] **[Frontend]** Đã test trên trình duyệt, responsive và không có lỗi console nghiêm trọng.

**Bảng kết quả kiểm thử:**

| Hạng mục | Kết quả | Ghi chú |
|---|---|---|
| **Unit Tests** | **149 tests PASS (13 test files)** | Đạt 100% test cases dự án, không có lỗi suy thoái (regression) |
| **TypeScript** | **PASS (`tsc -b`)** | 0 error, typing chặt chẽ với `PhoneVariantDTO`, `PhoneDetailDTO` |
| **ESLint** | **PASS** | 0 error, 0 warning trên toàn bộ tập tin FE1-01 |
| **Build** | **PASS (`vite build`)** | Hoàn tất trong ~5.00s, không lỗi bundling |
| **Desktop / Mobile** | **PASS** | Kiểm thử trực tiếp 1440px và 375px bằng Playwright |
| **API Integration** | **PASS** | Khớp 100% cấu trúc schema Spring Boot API |

**Ảnh chụp minh chứng:**

1. **Giao diện Desktop (1440px) 2 nhóm độc lập:**
   `docs/evidence/fe1-01-variant-selector/01-variant-selector-desktop.png`
2. **Chuyển đổi Dung lượng & Cập nhật giá (512GB):**
   `docs/evidence/fe1-01-variant-selector/02-storage-selection.png`
3. **Chọn ColorSwatch & Đồng bộ Gallery (Titan Xanh):**
   `docs/evidence/fe1-01-variant-selector/03-color-swatch-selection.png`
4. **Biến thể hết hàng (gạch chéo, disabled, cảnh báo hết hàng):**
   `docs/evidence/fe1-01-variant-selector/04-out-of-stock-variant.png`
5. **Giao diện Responsive Mobile (375px):**
   `docs/evidence/fe1-01-variant-selector/05-variant-selector-mobile.png`

---

### 🛡️ 3. Checklist Tuân Thủ Quy Chuẩn

- [x] Đã cập nhật `develop` mới nhất vào feature branch và giải quyết conflict (HEAD đồng bộ với `origin/develop`).
- [x] Không commit `.env`, mật khẩu hoặc API keys.
- [x] Không sửa Flyway migrations cũ.
- [ ] **[Backend]** MapStruct DTO, không trả JPA Entity trực tiếp: *N/A (Không sửa Backend)*.
- [ ] **[Backend]** Khóa tồn kho bi quan: *N/A (Không sửa Backend)*.
- [x] **[Frontend]** Form có validation phù hợp khi áp dụng và không có `console.log` rác.

---

### 👥 Người Review (Reviewers)

- **Tech Lead:** @nguyen0605
- **Thành viên chéo (Peer reviewer):** @GreenPhoneTeam
