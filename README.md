# GreenPhone - Hệ Thống Thương Mại Điện Tử Chuyên Sâu Thiết Bị Di Động

## Lệnh Khởi Chạy Môi Trường Cục Bộ (Local Development)
- Frontend (React + Vite):
  ```bash
  cd Frontend
  npm run dev
  ```
- Backend (Spring Boot):
  ```bash
  cd GreenPhone-Backend
  ./gradlew bootRun
  ```
  *(Trên Windows PowerShell: `.\gradlew bootRun`)*

---

## 1. Bảng Tổng Hợp Lệnh Docker Vận Hành & Triển Khai VPS

### 1.1. Nạp Cấu Hình & Khởi Động Lại Dịch Vụ
- Nạp lại cấu hình Nginx mà không cần dừng container (Zero-downtime sau khi sửa `Frontend/nginx.conf`):
  ```bash
  docker exec -i greenphone-frontend nginx -s reload
  ```
- Khởi động lại Backend để nạp biến môi trường mới từ `.env` (Gemini API, R2, Mail...):
  ```bash
  docker restart greenphone-backend
  ```

### 1.2. Giám Sát, Trạng Thái & Xem Log
- Kiểm tra danh sách và trạng thái hoạt động của các container:
  ```bash
  docker ps
  ```
- Xem log thời gian thực của toàn bộ hệ thống trên VPS:
  ```bash
  docker compose -f docker-compose.prod.yml logs -f
  ```
- Xem riêng log của Backend Spring Boot:
  ```bash
  docker logs -f greenphone-backend
  ```
- Xem riêng log truy cập của Frontend Nginx:
  ```bash
  docker logs -f greenphone-frontend
  ```

### 1.3. Thao Tác Trực Tiếp Với Cơ Sở Dữ Liệu MySQL
- Truy cập trực tiếp vào trình dòng lệnh MySQL bên trong container:
  ```bash
  docker exec -it greenphone-mysql mysql -u root -proot greenphone
  ```

### 1.4. Khởi Chạy & Giải Phóng Container
- Khởi chạy toàn bộ hệ thống ở chế độ chạy ngầm (Detached mode):
  ```bash
  docker compose -f docker-compose.prod.yml up -d
  ```
- Dừng và giải phóng toàn bộ container của dự án:
  ```bash
  docker compose -f docker-compose.prod.yml down
  ```

---

## 2. Cẩm Nang Lệnh Git Quan Trọng & Quy Trình Phát Hành

### 2.1. Quy Trình Merge Nhánh `develop` Sang `main` Chuẩn Git Flow
Thực hiện các bước sau khi cần phát hành phiên bản chính thức (Production Release):
```bash
# Bước 1: Đảm bảo toàn bộ thay đổi ở nhánh develop đã được commit và push
git checkout develop
git pull origin develop
git status

# Bước 2: Chuyển sang nhánh main và cập nhật mã nguồn mới nhất từ remote
git checkout main
git pull origin main

# Bước 3: Hợp nhất develop vào main
git merge develop -m "merge: sync develop into main for production release"

# Bước 4: Đẩy phiên bản chính thức lên repository GitHub
git push origin main

# Bước 5: Quay lại nhánh develop để tiếp tục phát triển
git checkout develop
```

### 2.2. Lệnh Cập Nhật Mã Nguồn Ngay Trên Máy Chủ VPS
Sau khi đẩy commit lên `main`, truy cập SSH vào VPS và thực thi chuỗi lệnh sau để triển khai:
```bash
# 1. Truy cập thư mục dự án trên VPS
cd /var/www/greenphone

# 2. Kéo mã nguồn mới nhất của nhánh main về máy chủ
git pull origin main

# 3. Nạp lại cấu hình Nginx Frontend ngay lập tức
docker exec -i greenphone-frontend nginx -s reload

# 4. Khởi động lại Backend để nạp code và cấu hình mới
docker restart greenphone-backend
```

### 2.3. Kiểm Tra Trạng Thái & Lịch Sử Commit
- Kiểm tra trạng thái tệp (đang sửa, chưa add, untracked):
  ```bash
  git status
  ```
- Xem các commit mới trên nhánh `develop` mà `main` chưa có:
  ```bash
  git log --oneline main..develop
  ```
- Xem lịch sử commit dạng rút gọn 1 dòng kèm đồ thị nhánh:
  ```bash
  git log --oneline --graph --decorate -n 15
  ```
- Xem chi tiết các tệp có sự thay đổi giữa 2 nhánh:
  ```bash
  git diff --name-only main develop
  ```

### 2.4. Quản Lý Nhánh Tính Năng (Feature Branch)
- Tạo nhánh mới từ `develop` và chuyển sang nhánh đó:
  ```bash
  git checkout -b feat/<ma-task>-<ten-tinh-nang> develop
  ```
- Kéo các commit mới nhất từ `develop` vào nhánh hiện tại (tránh xung đột):
  ```bash
  git pull origin develop
  ```
- Xóa nhánh local sau khi đã merge xong:
  ```bash
  git branch -d feat/<ma-task>-<ten-tinh-nang>
  ```

### 2.5. Cất Giữ Thay Đổi Tạm Thời (Git Stash)
Dùng khi đang làm dở nhưng cần chuyển gấp sang nhánh khác:
```bash
# Cất toàn bộ mã nguồn đang sửa dở vào bộ nhớ tạm
git stash save "Lưu tạm công việc dở dang"

# Xem danh sách các lần stash
git stash list

# Lấy lại mã nguồn đã cất và áp dụng vào nhánh hiện tại
git stash pop
```

### 2.6. Hoàn Tác & Khôi Phục An Toàn
- Hủy bỏ toàn bộ thay đổi của một tệp về trạng thái commit gần nhất:
  ```bash
  git checkout -- <duong_dan_file>
  ```
- Bỏ tệp đã lỡ `git add` ra khỏi vùng chuẩn bị commit (Staging area):
  ```bash
  git restore --staged <duong_dan_file>
  ```
- Sửa lại thông điệp commit gần nhất (khi chưa push):
  ```bash
  git commit --amend -m "fix: thong diep moi chinh xac"
  ```

---

## 3. Hướng Dẫn Các Bước Thực Hiện Demo Với Mentor

### Bước 1: Cập Nhật Số Lượng Tồn Kho Về Đúng 1 Sản Phẩm
Mở DBeaver / Navicat hoặc terminal kết nối MySQL và chạy câu lệnh sau (ví dụ kiểm thử với biến thể `id = 1`):
```sql
UPDATE phone_variant SET stock_quantity = 1 WHERE id = 1;
UPDATE warehouse_stock SET quantity = 1 WHERE phone_variant_id = 1 AND warehouse_id = 1;
UPDATE warehouse_stock SET quantity = 0 WHERE phone_variant_id = 1 AND warehouse_id IN (2, 3);
```

### Bước 2: Khởi Chạy Kịch Bản Chia Đôi Màn Hình
Mở Terminal tại thư mục gốc dự án và chạy lệnh:
- Nếu chạy trên môi trường Localhost:
  ```bash
  python scripts/demo_concurrency_split_screen.py
  ```
- Nếu chạy trên môi trường VPS (DuckDNS):
  ```bash
  python scripts/demo_concurrency_split_screen.py --url https://greenphone.duckdns.org
  ```

### Bước 3: Thao Tác Chuẩn Bị Trên Cả 2 Cửa Sổ Trình Duyệt
- Cửa sổ bên Trái: Đăng nhập tài khoản 1 (ví dụ `an.nguyen@example.com` / `123456789`), chọn sản phẩm có biến thể `id = 1`, nhấn "Tiến hành đặt hàng" và đi tới bước hiển thị nút "Đặt hàng (COD)".
- Cửa sổ bên Phải: Đăng nhập tài khoản 2 (ví dụ `laotuyentvm@gmail.com` / `123456789`), cũng chọn đúng sản phẩm đó và đi tới bước hiển thị nút "Đặt hàng (COD)".

### Bước 4: Kích Hoạt Và Trình Bày Demo
1. Quay lại cửa sổ Terminal và nhấn `[ENTER]`.
2. Quan sát trực tiếp trên 2 nửa màn hình:
   - Một bên hoàn tất đơn hàng thành công.
   - Bên còn lại hiện thông báo lỗi đỏ từ Ant Design: "Sản phẩm không đủ số lượng trong kho".
3. **Trình bày với Mentor cơ chế kỹ thuật:**
   Hệ thống sử dụng `@Lock(LockModeType.PESSIMISTIC_WRITE)` tại tầng cơ sở dữ liệu. Khi hai giao dịch diễn ra đồng thời, một giao dịch sẽ giữ khóa hàng (row-level lock) để trừ kho, giao dịch sau phải đợi và bị từ chối ngay lập tức khi kiểm tra số lượng tồn kho còn lại bằng 0, đảm bảo kho hàng không bao giờ bị bán âm.
