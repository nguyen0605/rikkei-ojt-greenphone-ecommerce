#!/usr/bin/env bash
# ============================================================
# start-tunnel.sh — GreenPhone Backend + Cloudflared Tunnel
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

echo "=========================================="
echo " GreenPhone Backend + Cloudflared Tunnel"
echo "=========================================="
echo ""
echo "[1/2] Starting backend + tunnel..."
docker compose -f "$COMPOSE_FILE" up -d --build

echo ""
echo "[2/2] Waiting for tunnel URL..."
echo ""

# Theo dõi log của tunnel container để bắt URL
TUNNEL_URL=""
TIMEOUT=60
ELAPSED=0

while [[ $ELAPSED -lt $TIMEOUT ]]; do
    # Cloudflared in ra URL với format: https://<random>.trycloudflare.com
    TUNNEL_URL=$(docker logs greenphone-tunnel 2>&1 \
        | grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' \
        | tail -1 || true)

    if [[ -n "$TUNNEL_URL" ]]; then
        break
    fi

    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo -n "."
done

echo ""
echo ""

if [[ -n "$TUNNEL_URL" ]]; then
    echo "=========================================="
    echo "  TUNNEL READY"
    echo "=========================================="
    echo ""
    echo "  🌐 Public URL: $TUNNEL_URL"
    echo "  📡 API Docs:   $TUNNEL_URL/swagger-ui.html"
    echo "  🏠 Local:       http://localhost:8080"
    echo ""
    echo "=========================================="
    echo ""
    echo "To stop: docker compose -f \"$COMPOSE_FILE\" down"
else
    echo "⚠️  Timed out waiting for tunnel URL (${TIMEOUT}s)"
    echo "Check logs manually: docker logs greenphone-tunnel"
fi
