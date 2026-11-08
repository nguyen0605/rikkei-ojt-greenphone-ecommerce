### 📌 THÔNG TIN PULL REQUEST (PR)

- Mã Thẻ Trello: [Cần bổ sung link thực tế]
- Người thực hiện: @nguyen0605
- Vai trò phụ trách: [x] FE1
- Nhánh tính năng: `feat/fe1-02-cart-sync` → Target Branch: `develop`

---

### 📝 1. Tóm tắt các thay đổi

- [x] **Tính năng 1: Đồng bộ giỏ hàng Redux với Backend API (`cartSlice.ts`)**
  - Mở rộng `CartState` với các trạng thái: `status: 'idle' | 'loading' | 'succeeded' | 'failed'` và `error: string | null`.
  - Triển khai các Redux Async Thunks: `fetchCart` (`loadCart`), `syncCart`, `addCartItem` (`addToCartAsync`), `updateCartItem` (`updateQuantityAsync`), `removeCartItem` (`removeItemAsync`), `clearCartRemote`.
  - Xử lý dọn dẹp state và xóa storage khi người dùng đăng xuất (`auth/logout`), ngăn chặn hoàn toàn rò rỉ dữ liệu giữa các tài khoản khác nhau.
  - Bổ sung `selectCartStatus`, `selectCartError`, `selectCartLoading` trong `cartSelectors.ts`.

- [x] **Tính năng 2: Merge giỏ hàng Guest khi đăng nhập & Xử lý tồn kho (`CartHydrator.tsx`, `CartPage.tsx`)**
  - Khách vãng lai thao tác giỏ hàng mượt mà qua Redux Store và lưu trữ an toàn trong `localStorage` (`greenphone.guestCart`), bảo toàn dữ liệu sau khi F5/refresh trang.
  - Khi người dùng đăng nhập, `CartHydrator` đọc danh sách sản phẩm guest và gửi `POST /api/cart/sync` (`CartSyncRequest`) tới Backend Spring Boot.
  - Chỉ xóa cache guest local sau khi Backend xác nhận thành công (HTTP 200 OK); nếu sync lỗi mạng/500, dữ liệu guest vẫn được giữ nguyên để retry.
  - Khử trùng lặp gọi sync khi component mount 2 lần dưới `React.StrictMode` bằng `syncedUserRef`.
  - Header cart badge (`selectCartTotalItems`), thanh tiến trình miễn phí vận chuyển và tổng tiền (`selectCartSummary`) cập nhật tức thì, realtime.
  - Bổ sung xử lý lỗi `try/catch` với Ant Design `message.error` khi cập nhật số lượng vượt tồn kho hoặc xóa sản phẩm thất bại.

- [x] **Danh sách file chính đã tạo/sửa:**
  - `Frontend/src/store/slices/cartSlice.ts`: Mở rộng CartState, thunks `fetchCart`, `syncCart`, `addCartItem`, `updateCartItem`, `removeCartItem`, `clearCartRemote`.
  - `Frontend/src/store/guestCartStorage.ts`: Khởi tạo giỏ hàng guest đồng nhất với CartState schema.
  - `Frontend/src/store/selectors/cartSelectors.ts`: Tối ưu Reselect selector, bổ sung status/error selectors.
  - `Frontend/src/components/common/CartHydrator.tsx`: Xử lý hợp nhất giỏ hàng đăng nhập và khử lặp StrictMode.
  - `Frontend/src/pages/cart/CartPage.tsx`: Thêm try/catch & toast message cho các thao tác giỏ hàng.
  - `Frontend/src/store/slices/__tests__/cartSyncIntegration.test.ts`: Bộ test tích hợp 20 test cases bao phủ toàn bộ kịch bản nghiệp vụ.
  - `docs/evidence/fe1-02-cart-sync/`: 5 ảnh chụp màn hình minh chứng kiểm thử thực tế trên trình duyệt.

---

### 🧪 2. Kịch bản & Bằng chứng đã kiểm thử

- [x] **Đã kiểm thử thành công tại máy local:**
  - **Vitest Unit & Integration:** `17/17 test files PASSED` (100%), `184/184 tests PASSED` (100%).
  - **TypeScript (`npx tsc -b`):** 0 errors.
  - **ESLint (`npx eslint`):** 0 errors, 0 warnings.
  - **Production Build (`npm run build`):** Built successfully in 5.02s.

- [ ] [Backend] Swagger/Postman theo chuẩn `ApiResponse<T>` nếu áp dụng (N/A - Task Frontend)
- [x] **[Frontend] Đã kiểm thử trên trình duyệt, responsive và không lỗi console nghiêm trọng:**

| Kịch bản | Mô tả | Ảnh minh chứng |
|---|---|---|
| **01 - Guest Cart** | Khách chưa đăng nhập thêm sản phẩm vào giỏ hàng, badge hiển thị (1) | `docs/evidence/fe1-02-cart-sync/01-guest-cart.png` |
| **02 - Guest Refresh** | Refresh trang (F5), giỏ hàng khách vãng lai giữ nguyên từ LocalStorage | `docs/evidence/fe1-02-cart-sync/02-guest-refresh.png` |
| **03 - Login Merge** | Đăng nhập tài khoản, tự động gọi `/api/cart/sync`, hợp nhất với giỏ hàng trên server | `docs/evidence/fe1-02-cart-sync/03-login-merge.png` |
| **04 - Realtime Quantity** | Cập nhật số lượng realtime, Header badge và tổng tiền tính toán chính xác | `docs/evidence/fe1-02-cart-sync/04-realtime-quantity-update.png` |
| **05 - Out of Stock** | Cập nhật số lượng vượt tồn kho, hiển thị thông báo lỗi từ server, không làm sai lệch UI | `docs/evidence/fe1-02-cart-sync/05-out-of-stock-limit.png` |

---

### 🛡️ 3. Checklist Tuân Thủ Quy Chuẩn

- [x] Đã cập nhật `develop` mới nhất và giải quyết conflict.
- [x] Không commit `.env`, mật khẩu hoặc API keys.
- [x] Không sửa Flyway migrations cũ.
- [x] [Backend] MapStruct DTO nếu áp dụng (N/A - Task Frontend).
- [x] [Backend] Pessimistic Lock nếu can thiệp kho (N/A - Task Frontend).
- [x] [Frontend] Validation khi áp dụng, không có console.log rác.

---

### 👥 Người Review

- Tech Lead: @nguyen0605
- Peer reviewer: @reviewer
