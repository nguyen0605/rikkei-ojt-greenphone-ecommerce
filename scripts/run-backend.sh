#!/bin/bash
set -e

echo "============================================================"
echo "  GREENPHONE - KHOI DONG BACKEND VA TU DONG CHAY MIGRATION"
echo "============================================================"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/../GreenPhone-Backend"

# 1. Kiem tra file .env
if [ ! -f ".env" ]; then
    echo "[INFO] File .env chua ton tai. Dang sao chep tu .env.example..."
    cp .env.example .env
    echo "[OK] Da tao file .env tu .env.example."
fi

# 2. Kiem tra Docker Redis (neu co docker)
if command -v docker &> /dev/null; then
    if docker ps -a --format "{{.Names}}" | grep -q "greenphone-redis"; then
        if ! docker ps --format "{{.Names}}" | grep -q "greenphone-redis"; then
            echo "[INFO] Dang khoi dong container Redis: greenphone-redis..."
            docker start greenphone-redis >/dev/null 2>&1 || true
        fi
    fi
fi

echo ""
echo "[INFO] Dang bien dich va khoi dong Spring Boot Backend..."
echo "[INFO] Flyway se tu dong kiem tra va chay tat ca migration con thieu trong db/migration."
echo ""

chmod +x ./gradlew
./gradlew bootRun
