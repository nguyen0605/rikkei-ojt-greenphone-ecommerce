# Báo Cáo Nghiệm Thu & Đánh Giá Kỹ Thuật (PR Review & Acceptance Report)

**Mã Thẻ Trello:** `[5 SP] [ORD-31] [FS] Chọn Nhanh Địa Chỉ Giao Hàng Khi Thanh Toán Và Ngăn Chặn Trùng Lặp Sổ Địa Chỉ`  
**Nhánh Tính Năng:** `feat/ord-31-quick-select-address-dedup` ➔ **Target Branch:** `develop`  
**Dự Án:** Hệ thống Thương mại Điện tử GreenPhone (Rikkei OJT)  
**Thời gian hoàn thành:** 12/11/2026  
**Người thực hiện:** Frontend Developer  
**Trạng thái Git:** Sẵn sàng tại local (Cam kết **KHÔNG PUSH GIT** theo yêu cầu)

---

## 📌 1. Tổng Quan Nghiệp Vụ & Mục Tiêu Của Task (ORD-31)

### 1.1. Hiện trạng trước khi triển khai
- **Trang Checkout:** Hệ thống tự động điền địa chỉ mặc định hoặc địa chỉ đầu tiên, chưa có giao diện cho phép khách hàng có từ 2 địa chỉ trở lên chọn nhanh giữa các địa chỉ đã lưu trong Sổ địa chỉ (`AddressBook`). Khách hàng muốn giao tới địa chỉ khác buộc phải gõ lại thủ công từng trường.
- **Sổ địa chỉ (`Address Book`):** Chưa có cơ chế chuẩn hóa chuỗi và đối soát trùng lặp (`deduplication validation`). Người dùng có thể vô tình thêm nhiều bản ghi trùng nhau hoàn toàn về địa chỉ và số điện thoại, gây rác dữ liệu localStorage/database và phân mảnh lịch sử giao dịch.

### 1.2. Mục tiêu kỹ thuật đã giải quyết
1. **Deduplication Validation (Tầng Service & Form UI):**
   - Xây dựng thuật toán chuẩn hóa chuỗi `normalizeString`: loại bỏ khoảng trắng thừa, đưa về chữ thường, loại bỏ toàn bộ dấu tiếng Việt (`diacritics removal`).
   - Hàm `checkDuplicateAddress` so sánh đối chiếu: `province`, `district`, `ward`, `streetAddress` và `receiverPhone`.
   - Bắt buộc hỗ trợ `excludeId` để cho phép cập nhật thông tin (như đổi tên người nhận, ghi chú, nhãn thẻ, tọa độ ghim) của chính bản ghi đó mà không bị báo trùng giả.
   - Chặn đứng hành vi thêm trùng ở cả 2 tầng: Tầng xử lý dữ liệu `userService.ts` (ném ngoại lệ `Error`) và tầng Form `AddressModal.tsx` (hiển thị Alert cảnh báo đỏ thân thiện).
2. **Component `AddressSelectModal.tsx`:**
   - Xây dựng modal Ant Design hiển thị toàn bộ danh sách địa chỉ đã lưu.
   - Thể hiện rõ badge nhãn (Nhà riêng, Văn phòng, Người thân, Khác), badge "Mặc định", badge trạng thái "Đã ghim tọa độ".
   - Highlight viền xanh ngọc emerald và radio chọn địa chỉ đang kích hoạt.
   - Tích hợp nút *"Giao đến địa chỉ này"* và nút *"Thêm địa chỉ mới"* trực tiếp trong modal.
3. **Tích hợp Quick Select vào `ShippingForm.tsx` (Trang Checkout):**
   - Khi tài khoản đăng nhập có từ 2 địa chỉ trở lên trong sổ địa chỉ: hiển thị nút *"Thay đổi / Chọn từ sổ địa chỉ (X địa chỉ)"*.
   - Khách hàng bấm chọn một địa chỉ từ modal: lập tức cập nhật toàn bộ form React Hook Form, đồng bộ tức thì vào Redux Store `checkoutSlice` (`updateShipping`), đồng thời tự động cập nhật ghim vị trí giao hàng trên OpenStreetMap (Leaflet).

---

## 📂 2. Danh Sách Các File Đã Triển Khai / Chỉnh Sửa

| STT | Đường dẫn file | Trạng thái | Chức năng chi tiết |
|:---:|:---|:---:|:---|
| 1 | `Frontend/src/services/userService.ts` | **Chỉnh sửa** | Thêm hàm `normalizeString`, `checkDuplicateAddress`, tích hợp kiểm tra trùng lặp trong `createAddress` và `updateAddress` (có `excludeId`). |
| 2 | `Frontend/src/components/checkout/AddressSelectModal.tsx` | **Tạo mới** | Modal hiển thị danh sách thẻ địa chỉ đã lưu, badge tag, highlight item đang chọn và nút *"Giao đến địa chỉ này"*. |
| 3 | `Frontend/src/components/account/AddressModal.tsx` | **Chỉnh sửa** | Tích hợp kiểm tra trùng lặp thời gian thực trước khi submit form, hiển thị thông báo lỗi Alert màu đỏ thân thiện. |
| 4 | `Frontend/src/components/checkout/ShippingForm.tsx` | **Chỉnh sửa** | Tích hợp nút chọn nhanh và modal `AddressSelectModal`, tự động dispatch Redux `updateShipping` và ghim map OpenStreetMap khi chọn địa chỉ. |
| 5 | `Frontend/src/services/__tests__/userService.test.ts` | **Cập nhật** | Bổ sung test case kiểm thử chặn trùng lặp khi thêm mới và sửa địa chỉ. |
| 6 | `Frontend/src/components/checkout/__tests__/ShippingForm.test.tsx` | **Cập nhật** | Kiểm thử tương tác mở modal chọn nhanh, tự động điền form và cập nhật Redux state. |

---

## ⚙️ 3. Chi Tiết Kỹ Thuật & Giải Thuật Triển Khai

### 3.1. Chuẩn hóa chuỗi & So khớp dấu Tiếng Việt (`userService.ts`)
```typescript
export function normalizeString(str?: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Loại bỏ toàn bộ dấu thanh tiếng Việt
    .replace(/\s+/g, ' ');           // Gom khoảng trắng dư thừa thành 1 khoảng trắng duy nhất
}
```
- Đảm bảo các chuỗi như `"TP. Hồ Chí Minh"`, `"tp. ho chi minh"`, `"  Tp.   Hồ   Chí   Minh  "` đều được quy về một dạng duy nhất: `"tp. ho chi minh"`.

### 3.2. Thuật toán Deduplication có kiểm tra `excludeId`
```typescript
export function checkDuplicateAddress(
  candidate: AddressRequest,
  existingList: AddressItem[],
  excludeId?: string | number
): boolean {
  const normPhone = normalizeString(candidate.receiverPhone).replace(/\D/g, '');
  const normProvince = normalizeString(candidate.province);
  const normDistrict = normalizeString(candidate.district);
  const normWard = normalizeString(candidate.ward);
  const normStreet = normalizeString(candidate.streetAddress);

  return existingList.some((item) => {
    // Loại trừ chính bản ghi đang chỉnh sửa
    if (excludeId !== undefined && String(item.id) === String(excludeId)) {
      return false;
    }

    const itemPhone = normalizeString(item.receiverPhone).replace(/\D/g, '');
    const itemProvince = normalizeString(item.province);
    const itemDistrict = normalizeString(item.district);
    const itemWard = normalizeString(item.ward);
    const itemStreet = normalizeString(item.streetAddress);

    return (
      normPhone === itemPhone &&
      normProvince === itemProvince &&
      normDistrict === itemDistrict &&
      normWard === itemWard &&
      normStreet === itemStreet
    );
  });
}
```

### 3.3. Xử lý đồng bộ Redux State và Bản đồ OpenStreetMap (`ShippingForm.tsx`)
Khi người dùng chọn địa chỉ `addr` từ modal:
1. Re-seed dữ liệu vào `useForm` thông qua `reset(...)`.
2. Dispatch action Redux `updateShipping`:
   ```typescript
   dispatch(updateShipping({
     fullName: addr.receiverName,
     phone: addr.receiverPhone,
     address: fullAddr,
     province: addr.province,
     district: addr.district || '',
     ward: addr.ward || '',
   }));
   ```
3. Cập nhật tọa độ ghim `selectedLocation` nếu địa chỉ đã có lưu `latitude`/`longitude`, hoặc kích hoạt bộ phân giải địa lý đa tầng `geocodeInitialAddress` để hiển thị vị trí chính xác trên OpenStreetMap.

---

## 🧪 4. Bằng Chứng Kiểm Thử Tự Động (Testing Evidence)

### 4.1. Kết quả kiểm thử Unit Tests (Vitest)
Hệ thống đã chạy toàn bộ các bộ test liên quan đến `userService`, `AddressModal` và `ShippingForm`:
- **Command:** `npx vitest run src/components/account/__tests__/AddressModal.test.tsx src/components/checkout/__tests__/ShippingForm.test.tsx src/services/__tests__/userService.test.ts`
- **Kết quả:**
  ```text
  ✓ src/services/__tests__/userService.test.ts (18 tests) - PASSED
  ✓ src/components/checkout/__tests__/ShippingForm.test.tsx (10 tests) - PASSED
  ✓ src/components/account/__tests__/AddressModal.test.tsx (5 tests) - PASSED

  Test Files: 3 passed (3)
  Tests:      33 passed (33)
  Duration:   11.59s
  Status:     100% Tests Passed
  ```

### 4.2. Kết quả Typecheck & Production Build
- **Command:** `npm run build` (`tsc -b && vite build`)
- **Kết quả:**
  - TypeScript compilation: **Thành công 100%, không phát sinh bất kỳ lỗi cú pháp hay type error nào**.
  - Vite build: **Exit code 0** (Thời gian build: 7.93s).

---

## 🛡️ 5. Checklist Tuân Thủ Quy Chuẩn

| Tiêu chí | Trạng thái | Ghi chú |
|---|:---:|---|
| **Không push Git** | ✅ ĐẠT | Toàn bộ mã nguồn và tài liệu lưu an toàn tại working tree local. |
| **Không lưu thông tin nhạy cảm** | ✅ ĐẠT | Sổ địa chỉ lưu trữ theo userId riêng biệt, không chứa thông tin thanh toán bí mật. |
| **Bảo vệ 2 lớp (UI + Service)** | ✅ ĐẠT | Chặn trùng lặp cả trên form UI (Banner đỏ) lẫn tầng Service (Exception). |
| **Hỗ trợ `excludeId` khi Edit** | ✅ ĐẠT | Chỉnh sửa địa chỉ không bị báo lỗi trùng lặp với chính nó. |
| **Đồng bộ Redux & Map** | ✅ ĐẠT | Cập nhật tức thời Redux `checkoutSlice` và điều chỉnh marker OpenStreetMap. |
| **Giao diện Tiếng Việt** | ✅ ĐẠT | Toàn bộ thông báo, nhãn, nút bấm được hiển thị Tiếng Việt có dấu chuẩn mực. |

---

## 🎬 6. Hướng Dẫn Kịch Bản Kiểm Thử Thủ Công (Manual Testing Steps)

1. **Kiểm tra ngăn chặn trùng lặp tại Sổ địa chỉ:**
   - Vào trang Tài khoản ➔ Quản lý Sổ địa chỉ (`/account/addresses`).
   - Bấm *"Thêm địa chỉ mới"*, nhập địa chỉ: `Số 10 Lê Duẩn, Bến Nghé, Quận 1, TP. Hồ Chí Minh` với SĐT `0912345678`. Bấm Lưu ➔ Thành công.
   - Bấm tiếp *"Thêm địa chỉ mới"*, nhập lại y hệt địa chỉ và số điện thoại trên (có thể thử gõ chữ hoa chữ thường khác nhau hoặc khoảng trắng dư thừa).
   - 👉 **Kỳ vọng:** Form chặn submit ngay lập tức, hiển thị thông báo đỏ: *"Địa chỉ này đã tồn tại trong sổ địa chỉ của bạn."*.
2. **Kiểm tra tính năng chọn nhanh tại Checkout:**
   - Đảm bảo tài khoản đã có $\ge 2$ địa chỉ đã lưu trong Sổ địa chỉ.
   - Thêm sản phẩm vào giỏ hàng và chuyển đến trang Thanh toán (`/checkout`).
   - Tại khối Thông tin giao hàng, kiểm tra sự xuất hiện của nút: *"Thay đổi / Chọn từ sổ địa chỉ (X địa chỉ)"*.
   - Bấm nút ➔ Modal `AddressSelectModal` bật lên hiển thị danh sách trực quan.
   - Bấm chọn một địa chỉ khác trong danh sách ➔ Form tự động điền lại toàn bộ thông tin người nhận, Redux Store cập nhật và bản đồ dịch chuyển ghim đến địa chỉ mới.

