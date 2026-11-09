# HUONG DAN TRIEN KHAI GREENPHONE LEN MAY CHU PRODUCTION

Thong tin may chu:
- He dieu hanh: Ubuntu 24.04 LTS
- Dia chi IP VPS: 103.77.208.221
- Ten mien chinh thuc: greenphone.duckdns.org
- Tai khoan quan tri: root

---

## MUC LUC
1. Kiem tra ten mien va tro ban ghi DNS
2. Ket noi SSH vao may chu VPS
3. Cap nhat ma nguon va cau hinh bien moi truong
4. Khoi tao SSL HTTPS Let's Encrypt tu dong qua Certbot
5. Khoi chay toan bo he thong bang Docker Compose
6. Cau hinh sao luu database tu dong va dong bo len Cloud Storage
7. Kich ban kiem thu va nghiem thu thuc te (Test Demo)

---

## 1. KIEM TRA TEN MIEN VA TRO BAN GHI DNS

Ten mien `greenphone.duckdns.org` da duoc dang ky va tro ve IP may chu:
- Domain: `greenphone.duckdns.org`
- IPv4: `103.77.208.221`

Kiem tra tren may ca nhan bang lenh:
```bash
nslookup greenphone.duckdns.org
```
Ket qua tra ve dia chi `103.77.208.221` la da san sang.

---

## 2. KET NOI SSH VAO MAY CHU VPS

Mo terminal tren may tinh ca nhan:
```bash
ssh root@103.77.208.221
```
(Neu su dung web quan tri VPS, co the bam vao nut VNC / Web Console de mo terminal truc tiep tren trinh duyet).

---

## 3. CAP NHAT MA NGUON VA CAU HINH BIEN MOI TRUONG

Di chuyen vao thu muc du an va keo ma nguon moi nhat:
```bash
cd /var/www/greenphone
git pull origin develop
```

Kiem tra file bien moi truong cho Backend:
```bash
cd /var/www/greenphone/GreenPhone-Backend
if [ ! -f .env ]; then
    cp .env.example .env
fi
```

Dam bao file `.env` chua day du cac bien cau hinh:
- `DB_PASSWORD`: Mat khau database
- `JWT_SECRET`: Chuoi bi mat JWT
- `SPRING_PROFILES_ACTIVE`: prod

---

## 4. KHOI TAO SSL HTTPS LET'S ENCRYPT TU DONG QUA CERTBOT

Chung toi da dong goi san script tu dong hoa toan bo quy trinh tao chung chi SSL, khoi dong Nginx va thiet lap cronjob gia han:

Cap quyen thuc thi va chay script khoi tao:
```bash
cd /var/www/greenphone/deploy/scripts
chmod +x init-ssl.sh backup-db.sh
sudo ./init-ssl.sh
```

Script se thuc hien cac buoc:
1. Cai dat Certbot tren he dieu hanh Ubuntu (neu chua co).
2. Tao thu muc webroot `/var/www/certbot` de phuc vu ACME challenge.
3. Tao chung chi SSL tam thoi de Nginx khong bi crash khi khoi dong lan dau.
4. Khoi chay Nginx container de lang nghe cong 80 va 443.
5. Gui yeu cau toi Let's Encrypt de cap chung chi SSL chinh thuc cho `greenphone.duckdns.org`.
6. Reload Nginx de nap chung chi moi nhat.
7. Cai dat crontab tu dong kiem tra va gia han SSL luc 03:00 hang ngay.

---

## 5. KHOI CHAY TOAN BO HE THONG BANG DOCKER COMPOSE

Neu can build hoac khoi dong lai toan bo stack:
```bash
cd /var/www/greenphone/deploy
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

Kiem tra trang thai hoat dong cua cac container:
```bash
docker ps
```
Cac container bat buoc phai o trang thai running (healthy):
- `greenphone-mysql` (MySQL 8.0, cong 3306)
- `greenphone-redis` (Redis 7.2, cong 6379)
- `greenphone-backend` (Spring Boot 3, cong 8080)
- `greenphone-frontend` (Nginx, cong 80 va 443)

---

## 6. CAU HINH SAO LUU DATABASE VA DONG BO LEN CLOUD STORAGE

Script sao luu: `deploy/scripts/backup-db.sh`
- Khong hardcode mat khau (doc an toan tu file `.env` qua bien môi truong `MYSQL_PWD`).
- Tu dong nen dinh dang `.sql.gz`.
- Don dep file sao luu cuc bo cu hon 7 ngay.
- Ho tro dong bo truc tiep len Cloud Storage (Cloudflare R2 hoac AWS S3).

### 6.1. Cai dat AWS CLI hoac Rclone tren VPS de ket noi Cloud Storage
```bash
sudo apt update && sudo apt install -y awscli
```

### 6.2. Cau hinh bien moi truong Cloud Storage trong `.env`
Them cac dong sau vao file `/var/www/greenphone/GreenPhone-Backend/.env`:
```ini
# Cau hinh Cloudflare R2 (hoac AWS S3)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=greenphone-backups
```

### 6.3. Dat lich chay tu dong moi dem (Crontab)
Mo trinh sua crontab:
```bash
crontab -e
```
Them dong sau vao cuoi file:
```cron
0 2 * * * /var/www/greenphone/deploy/scripts/backup-db.sh >> /var/log/greenphone_backup.log 2>&1
```

Chay thu nghiem ngay lap tuc de kiem tra:
```bash
/var/www/greenphone/deploy/scripts/backup-db.sh
```

---

## 7. KICH BAN KIEM THU VA NGHIEM THU THUC TE (TEST DEMO)

Cac buoc trinh dien voi Tech Lead / Mentor:

### Buoc 1: Kiem tra truy cap Website qua HTTPS
- Mo trinh duyet (Chrome/Firefox/Edge) truy cap: `https://greenphone.duckdns.org`
- Ket qua mong doi:
  - Trang chu GreenPhone hien thi day du giao dien, load du lieu san pham tu backend.
  - Trinh duyet bao ket noi an toan (hien bieu tuong o khoa xanh bao mat).
  - Chung chi SSL duoc cap boi Let's Encrypt Authority hop le.

### Buoc 2: Kiem tra chuyen huong HTTP sang HTTPS va Security Headers
Chay lenh curl kiem tra phan hoi:
```bash
curl -I http://greenphone.duckdns.org
```
Ket qua mong doi: HTTP/1.1 301 Moved Permanently, Location: `https://greenphone.duckdns.org/`.

Chay lenh curl kiem tra HTTPS va Security Headers:
```bash
curl -I https://greenphone.duckdns.org
```
Ket qua mong doi xuat hien day du cac tieu de an ninh:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Buoc 3: Kiem tra tinh nang nen Gzip
Chay lenh curl yeu cau nen gzip:
```bash
curl -I -H "Accept-Encoding: gzip" https://greenphone.duckdns.org
```
Ket qua mong doi xuat hien:
- `Content-Encoding: gzip`

### Buoc 4: Kiem tra kich ban sao luu an toan
Chay script sao luu:
```bash
/var/www/greenphone/deploy/scripts/backup-db.sh
```
Ket qua mong doi:
- Tao file sao luu tai `/var/backups/greenphone/greenphone_YYYYMMDD_HHMMSS.sql.gz`.
- Khong co bat ky mat khau nao hien thi trong log hoac tien trinh he thong.
- Ban sao luu duoc dong bo an toan len bucket Cloud Storage.
