## 📌 THÔNG TIN PULL REQUEST (PR)

- **Mã Thẻ Trello:** [Dán link thẻ Trello của bạn vào đây]
- **Người thực hiện:** @username
- **Vai trò phụ trách:** [ ] BE1 | [ ] BE2 | [ ] BE3 | [ ] FE1 | [ ] FE2 | [ ] FE3
- **Nhánh tính năng:** `feat/...` ➔ **Target Branch:** `develop`

---

### 📝 1. Tóm tắt các thay đổi (Chức năng vừa làm)
- [ ] Tính năng 1: 
- [ ] Tính năng 2: 
- [ ] Danh sách các file chính đã tạo/sửa: 

---

### 🧪 2. Kịch bản & Bằng chứng đã kiểm thử (Testing Evidence)
- [ ] Đã kiểm thử chạy thành công tại máy local (không lỗi crash app).
- [ ] **[Backend]** Đã test trên Swagger/Postman (Response trả về đúng chuẩn `ApiResponse<T>`).
- [ ] **[Frontend]** Đã test trên trình duyệt (Giao diện chuẩn responsive, không lỗi console đỏ).

*Dán ảnh chụp màn hình kết quả chạy thử (Postman / UI) vào dưới đây:*
> 

---

### 🛡️ 3. Checklist Tuân Thủ Quy Chuẩn (Bắt buộc tick đủ trước khi bấm Tạo PR)
- [ ] Đã merge `develop` mới nhất vào nhánh của mình và **giải quyết 100% conflict**.
- [ ] **TUYỆT ĐỐI KHÔNG** commit file `.env`, mật khẩu database hay API key bí mật.
- [ ] **KHÔNG** sửa các file Flyway migration cũ (`V1`, `V2`). Muốn đổi DB phải tạo file migration mới.
- [ ] [Backend] Dùng MapStruct DTO, không trả về JPA Entity trực tiếp ra ngoài Controller.
- [ ] [Backend] Đã xử lý khóa tồn kho `@Lock(LockModeType.PESSIMISTIC_WRITE)` nếu can thiệp vào kho máy.
- [ ] [Frontend] Form đã có validation Zod/React Hook Form, không có console.log rác.

---

### 👥 Người Review (Reviewers)
- Tech Lead: @nguyen0605
- Thành viên chéo (Peer reviewer): @...
