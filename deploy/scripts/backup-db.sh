#!/bin/bash
# ==============================================================================
# GreenPhone - Automated MySQL Database Backup Script with Cloud Storage Sync
# Task: [5 SP] [BE1-05]
# Security: Zero Hardcoded Passwords, Cloudflare R2 / AWS S3 Cloud Sync
# Cronjob: 0 2 * * * /var/www/greenphone/deploy/scripts/backup-db.sh >> /var/log/greenphone_backup.log 2>&1
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/greenphone}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/greenphone_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

echo "=============================================================================="
echo "[$(date)] Bat dau sao luu co so du lieu GreenPhone..."
echo "=============================================================================="

# ------------------------------------------------------------------------------
# 1. Nap cau hinh bao mat tu file .env (Tuyet doi khong hardcode credential)
# ------------------------------------------------------------------------------
ENV_FILE=""
if [ -f "${SCRIPT_DIR}/../.env" ]; then
    ENV_FILE="${SCRIPT_DIR}/../.env"
elif [ -f "${PROJECT_ROOT}/GreenPhone-Backend/.env" ]; then
    ENV_FILE="${PROJECT_ROOT}/GreenPhone-Backend/.env"
fi

if [ -n "${ENV_FILE}" ]; then
    echo "[$(date)] Dang nap bien moi truong tu: ${ENV_FILE}"
    # Nap cac bien can thiet ma khong lam hong ky tu dac biet
    export $(grep -v '^#' "${ENV_FILE}" | grep -E '^(DB_PASSWORD|MYSQL_ROOT_PASSWORD|R2_|AWS_|S3_)' | xargs -d '\n' || true)
fi

DB_PASS="${MYSQL_ROOT_PASSWORD:-${DB_PASSWORD:-root}}"
DB_USER="root"
DB_NAME="greenphone"
CONTAINER_NAME="greenphone-mysql"

# ------------------------------------------------------------------------------
# 2. Dump database tu Docker Container qua bien moi truong MYSQL_PWD
#    (Tranh hien thi mat khau trong command line / ps aux process table)
# ------------------------------------------------------------------------------
echo "[$(date)] Dang dump database tu container ${CONTAINER_NAME}..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[$(date)] LOI: Container ${CONTAINER_NAME} khong hoat dong!"
    exit 1
fi

docker exec -e MYSQL_PWD="${DB_PASS}" "${CONTAINER_NAME}" \
    mysqldump \
        -u "${DB_USER}" \
        --single-transaction \
        --quick \
        --default-character-set=utf8mb4 \
        "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"

# ------------------------------------------------------------------------------
# 3. Kiem tra tinh toan ven cua ban sao luu
# ------------------------------------------------------------------------------
if [ ! -s "${BACKUP_FILE}" ]; then
    echo "[$(date)] LOI: File backup bi rong (0 byte) hoac loi sao luu!"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

FILE_SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
echo "[$(date)] Sao luu cuc bo thanh cong: ${BACKUP_FILE} (${FILE_SIZE})"

# ------------------------------------------------------------------------------
# 4. Dong bo ban sao luu len Cloud Storage ngoai VPS (Cloudflare R2 / AWS S3)
# ------------------------------------------------------------------------------
CLOUD_SYNCED=0
BUCKET="${R2_BUCKET_NAME:-${AWS_BUCKET_NAME:-${S3_BUCKET_NAME:-}}}"

if [ -n "${BUCKET}" ]; then
    echo "[$(date)] Dang dong bo file len Cloud Storage: ${BUCKET}..."

    # Phuong an 1: Dung AWS CLI (Tuong thich ca AWS S3 va Cloudflare R2)
    if command -v aws >/dev/null 2>&1; then
        ENDPOINT_ARGS=""
        if [ -n "${R2_ACCOUNT_ID:-}" ]; then
            ENDPOINT_ARGS="--endpoint-url https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        elif [ -n "${S3_ENDPOINT:-}" ]; then
            ENDPOINT_ARGS="--endpoint-url ${S3_ENDPOINT}"
        fi

        AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID:-${AWS_ACCESS_KEY_ID:-}}" \
        AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY:-${AWS_SECRET_ACCESS_KEY:-}}" \
        aws s3 cp "${BACKUP_FILE}" "s3://${BUCKET}/database/$(basename "${BACKUP_FILE}")" ${ENDPOINT_ARGS}

        echo "[$(date)] Da dong bo len Cloud Storage thanh cong qua AWS CLI!"
        CLOUD_SYNCED=1

    # Phuong an 2: Dung Rclone
    elif command -v rclone >/dev/null 2>&1; then
        rclone copy "${BACKUP_FILE}" "r2:${BUCKET}/database/"
        echo "[$(date)] Da dong bo len Cloud Storage thanh cong qua Rclone!"
        CLOUD_SYNCED=1
    else
        echo "[$(date)] CANH BAO: May chu chua cai AWS CLI hoac Rclone de upload len Cloud."
        echo "Cai dat tren Ubuntu: apt install -y awscli hoac rclone"
    fi
else
    echo "[$(date)] LUU Y: Chua cau hinh bien R2_BUCKET_NAME / S3_BUCKET_NAME trong .env."
    echo "De dap ung quy chuan Disaster Recovery, vui long cau hinh Cloudflare R2 hoac AWS S3."
fi

# ------------------------------------------------------------------------------
# 5. Don dep cac ban sao luu cuc bo cu hon RETENTION_DAYS ngay tren VPS
# ------------------------------------------------------------------------------
find "${BACKUP_DIR}" -name "greenphone_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete
echo "[$(date)] Da don dep cac ban backup cuc bo cu hon ${RETENTION_DAYS} ngay."

echo "=============================================================================="
echo "[$(date)] TIEN TRINH SAO LUU HOAN TAT MY MAN!"
echo "File: ${BACKUP_FILE} (${FILE_SIZE})"
echo "Dong bo Cloud: $([ "${CLOUD_SYNCED}" -eq 1 ] && echo "DA XAC NHAN" || echo "CHUA DONG BO (Chi luu local)")"
echo "=============================================================================="
