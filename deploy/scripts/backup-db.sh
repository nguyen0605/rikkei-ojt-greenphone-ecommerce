#!/bin/bash
# ==============================================================================
# GreenPhone - Automated MySQL Database Backup Script
# Cronjob: 0 2 * * * /var/www/greenphone/deploy/scripts/backup-db.sh >> /var/log/greenphone_backup.log 2>&1
# ==============================================================================

BACKUP_DIR="/var/backups/greenphone"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/greenphone_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

mkdir -p ${BACKUP_DIR}

echo "[$(date)] Bắt đầu backup database greenphone..."

# Dump trực tiếp từ container greenphone-mysql
docker exec greenphone-mysql mysqldump -u root -proot --single-transaction --quick greenphone | gzip > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup thành công: ${BACKUP_FILE} ($(du -h ${BACKUP_FILE} | cut -f1))"
else
    echo "[$(date)] LỖI: Backup database thất bại!"
    exit 1
fi

# Tự động dọn dẹp các bản backup cũ hơn 7 ngày
find ${BACKUP_DIR} -name "greenphone_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Đã dọn dẹp các bản backup cũ hơn ${RETENTION_DAYS} ngày."
