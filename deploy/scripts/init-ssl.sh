#!/bin/bash
# ==============================================================================
# GreenPhone - SSL HTTPS Let's Encrypt / Certbot Automated Setup Script
# Domain: greenphone.duckdns.org
# VPS IP: 103.77.208.221
# ==============================================================================
set -euo pipefail

DOMAIN="greenphone.duckdns.org"
EMAIL="${SSL_EMAIL:-admin@greenphone.vn}"
WEBROOT_DIR="/var/www/certbot"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

echo "=============================================================================="
echo "[$(date)] Khoi tao SSL HTTPS Let's Encrypt cho ${DOMAIN}..."
echo "=============================================================================="

# 1. Kiem tra quyen root
if [ "$(id -u)" -ne 0 ]; then
    echo "LOI: Script can duoc chay duoi quyen root (sudo $0)"
    exit 1
fi

# 2. Tao thu muc webroot cho ACME challenge
mkdir -p "${WEBROOT_DIR}"
chmod -R 755 "${WEBROOT_DIR}"

# 3. Cai dat Certbot tren Ubuntu neu chua co
if ! command -v certbot >/dev/null 2>&1; then
    echo "[$(date)] Dang cai dat Certbot..."
    apt update && apt install -y certbot
fi

# 4. Neu chua co chung chi, tao chung chi tam (dummy) de Nginx container khoi dong khong bi crash
if [ ! -f "${CERT_DIR}/fullchain.pem" ]; then
    echo "[$(date)] Chua co chung chi SSL. Tao chung chi tam thoi (self-signed) de Nginx khoi dong..."
    mkdir -p "${CERT_DIR}"
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout "${CERT_DIR}/privkey.pem" \
        -out "${CERT_DIR}/fullchain.pem" \
        -subj "/CN=${DOMAIN}" 2>/dev/null
    chmod 600 "${CERT_DIR}/privkey.pem"
    chmod 644 "${CERT_DIR}/fullchain.pem"
    echo "[$(date)] Da tao xong chung chi tam thoi."
fi

# 5. Khoi dong hoac reload Nginx de phuc vu /.well-known/acme-challenge/
echo "[$(date)] Khoi dong / Reload Nginx container..."
cd "$(dirname "$0")/.."
docker compose -f docker-compose.prod.yml up -d frontend

# Cho Nginx san sang
sleep 3

# 6. Chay Certbot xin cap chung chi Let's Encrypt chinh thuc
echo "[$(date)] Dang gui yeu cau cap chung chi Let's Encrypt qua Certbot..."
certbot certonly --webroot \
    -w "${WEBROOT_DIR}" \
    -d "${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    --non-interactive

# 7. Reload Nginx de nap chung chi Let's Encrypt moi nhat
echo "[$(date)] Cap chung chi thanh cong! Dang reload Nginx de ap dung HTTPS chinh thuc..."
docker exec greenphone-frontend nginx -s reload

# 8. Cai dat cronjob tu dong gia han chung chi (chay 03:00 moi ngay)
CRON_JOB="0 3 * * * certbot renew --webroot -w ${WEBROOT_DIR} --quiet --post-hook 'docker exec greenphone-frontend nginx -s reload' >> /var/log/certbot_renew.log 2>&1"
(crontab -l 2>/dev/null | grep -v "certbot renew" ; echo "${CRON_JOB}") | crontab -

echo "=============================================================================="
echo "[$(date)] HOAN TAT CAI DAT SSL HTTPS!"
echo "Website da san sang tai: https://${DOMAIN}"
echo "Cronjob tu dong gia han SSL da duoc thiet lap tai 03:00 hang ngay."
echo "=============================================================================="

