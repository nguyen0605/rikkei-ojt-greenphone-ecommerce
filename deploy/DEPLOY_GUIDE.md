# 🚀 HƯỚNG DẪN TRIỂN KHAI GREENPHONE LÊN MÁY CHỦ VPS PRODUCTION

> **Máy chủ VPS:** Ubuntu 24.04  
> **IP VPS:** `103.77.208.221`  
> **Tài khoản đăng nhập:** `root`

---

## 📌 BƯỚC 1: SSH VÀO VPS
Từ máy cá nhân (lưu ý dùng mạng 4G nếu mạng trường/công ty chặn cổng 22 SSH):
```bash
ssh root@103.77.208.221
```
*(Nếu trên web thuevpsgiare.com, bạn cũng có thể bấm vào nút **VNC / Web Console** để mở terminal trực tiếp trên trình duyệt)*.

---

## 📌 BƯỚC 2: TẮT DỰ ÁN CŨ (NẾU CÓ) ĐỂ GIẢI PHÓNG TÀI NGUYÊN
Nếu trước đó có chạy BootZone:
```bash
# Kiểm tra các container đang chạy
docker ps

# Nếu có container bootzone, tắt chúng:
cd /var/www/bootzone/deploy 2>/dev/null && docker compose -f docker-compose.prod.yml down
```

---

## 📌 BƯỚC 3: KÉO MÃ NGUỒN GREENPHONE MỚI NHẤT VỀ VPS
```bash
# Tạo thư mục dự án
mkdir -p /var/www
cd /var/www

# Clone mã nguồn từ GitHub (hoặc git pull nếu đã clone)
if [ ! -d "/var/www/greenphone" ]; then
    git clone https://github.com/lethinh26/GreenPhone.git greenphone
fi

cd /var/www/greenphone
git pull origin main
```

---

## 📌 BƯỚC 4: THIẾT LẬP FILE BIẾN MÔI TRƯỜNG (.env) CHO BACKEND
```bash
cd /var/www/greenphone/GreenPhone-Backend
if [ ! -f .env ]; then
    cp .env.example .env
fi
```

---

## 📌 BƯỚC 5: KHỞI CHẠY HỆ THỐNG BẰNG DOCKER COMPOSE
```bash
cd /var/www/greenphone/deploy

# Chạy build và bật full stack (MySQL 8 + Backend Spring Boot + Frontend Nginx)
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 📌 BƯỚC 6: KIỂM TRA TRẠNG THÁI VÀ TRUY CẬP WEBSITE
```bash
# Xem log khởi động của backend
docker logs -f greenphone-backend

# Xem danh sách container
docker ps
```

- **Website GreenPhone:** `http://103.77.208.221` (Đang phục vụ qua cổng 80 chuẩn Web)
- **API Backend & Swagger:** `http://103.77.208.221/api/` hoặc `http://103.77.208.221:8080/swagger-ui/index.html`
- **MySQL 8.0:** Đã tự động nạp toàn bộ 19 bảng và dữ liệu từ `01_greenphone_dump.sql`.

---

## 📌 BƯỚC 7: CÀI ĐẶT BACKUP TỰ ĐỘNG DATABASE MỖI ĐÊM (CRONJOB)
```bash
crontab -e
```
Thêm dòng sau vào cuối file:
```cron
0 2 * * * /var/www/greenphone/deploy/scripts/backup-db.sh >> /var/log/greenphone_backup.log 2>&1
```
