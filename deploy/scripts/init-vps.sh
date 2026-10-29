#!/bin/bash
# ==============================================================================
# GreenPhone - VPS Ubuntu 22.04 / 24.04 Setup Script
# ==============================================================================
set -e

echo ">>> [1/4] Cập nhật hệ thống Ubuntu..."
sudo apt update && sudo apt upgrade -y

echo ">>> [2/4] Kích hoạt 2GB Swap Memory (Bảo vệ RAM 4GB không bị tràn)..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap 2GB đã được kích hoạt thành công!"
else
    echo "Swapfile đã tồn tại, bỏ qua."
fi

echo ">>> [3/4] Cài đặt Docker & Docker Compose Plugin..."
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
fi
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo ">>> [4/4] Cấu hình tường lửa UFW (Mở cổng 22, 80, 443)..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "=============================================================================="
echo ">>> KHỞI TẠO VPS CHO GREENPHONE HOÀN TẤT!"
echo "Docker version: $(docker --version)"
echo "Docker compose: $(docker compose version)"
free -h
echo "=============================================================================="
