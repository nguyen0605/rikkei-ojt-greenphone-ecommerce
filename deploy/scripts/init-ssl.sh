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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=============================================================================="
echo "[$(date)] Khoi tao SSL HTTPS Let's Encrypt cho ${DOMAIN}..."
echo "=============================================================================="

# 1. Kiem tra quyen root
if [ "$(id -u)" -ne 0 ]; then
    echo "LOI: Script can duoc chay duoi quyen root (sudo $0)"
    exit 1
fi

# 2. Tao thu muc can thiet
mkdir -p "${WEBROOT_DIR}"
chmod -R 755 "${WEBROOT_DIR}"

# 3. Cai dat Certbot tren Ubuntu neu chua co
if ! command -v certbot >/dev/null 2>&1; then
    echo "[$(date)] Dang cai dat Certbot tren he dieu hanh..."
    apt update && apt install -y certbot
fi

# 4. Xoa thu muc live cu neu chua co file renewal hop le (tranh loi Live directory exists)
if [ -d "${CERT_DIR}" ] && [ ! -f "/etc/letsencrypt/renewal/${DOMAIN}.conf" ]; then
    echo "[$(date)] Xoa thu muc chung chi tam de Certbot khoi tao lineage chinh thuc..."
    rm -rf "${CERT_DIR}"
fi

# 5. Tam dung container frontend de giai phong cong 80 cho Certbot cap phat doc lap
echo "[$(date)] Tam dung container greenphone-frontend de giai phong cong 80..."
docker stop greenphone-frontend 2>/dev/null || true

# 5. Chay Certbot o che do Standalone de xin cap chung chi Let's Encrypt (tranh moi loi xung dot Nginx/SPA)
echo "[$(date)] Dang gui yeu cau cap chung chi Let's Encrypt qua Certbot Standalone..."
certbot certonly --standalone \
    -d "${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    --non-interactive

# 6. Dong bo duong dan chung chi ve /etc/letsencrypt/live/${DOMAIN} (neu Certbot tao hau to -0001)
LATEST_CERT_DIR=$(ls -d /etc/letsencrypt/live/${DOMAIN}* 2>/dev/null | tail -n 1)
if [ -n "${LATEST_CERT_DIR}" ] && [ "${LATEST_CERT_DIR}" != "/etc/letsencrypt/live/${DOMAIN}" ]; then
    echo "[$(date)] Phat hien chung chi tai ${LATEST_CERT_DIR}, dong bo ve /etc/letsencrypt/live/${DOMAIN}..."
    rm -rf "/etc/letsencrypt/live/${DOMAIN}"
    cp -rL "${LATEST_CERT_DIR}" "/etc/letsencrypt/live/${DOMAIN}"
fi

# 7. Khoi chay / Reload toan bo frontend container voi chung chi SSL thuc te
echo "[$(date)] Cap chung chi thanh cong! Dang khoi chay Nginx voi SSL HTTPS..."
cd "${DEPLOY_DIR}"
docker compose -f docker-compose.prod.yml restart frontend || docker compose -f docker-compose.prod.yml up -d frontend

# 8. Cai dat cronjob tu dong gia han chung chi (chay vao 03:00 moi ngay)
CRON_JOB="0 3 * * * certbot renew --standalone --pre-hook 'docker stop greenphone-frontend' --post-hook 'docker start greenphone-frontend' --quiet >> /var/log/certbot_renew.log 2>&1"
(crontab -l 2>/dev/null | grep -v "certbot renew" ; echo "${CRON_JOB}") | crontab -

echo "=============================================================================="
echo "[$(date)] HOAN TAT CAI DAT SSL HTTPS!"
echo "Website da san sang hoat dong tai: https://${DOMAIN}"
echo "Cronjob tu dong gia han SSL da duoc thiet lap tai 03:00 hang ngay."
echo "=============================================================================="
