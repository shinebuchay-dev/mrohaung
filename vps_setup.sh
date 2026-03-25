#!/bin/bash
# ================================================================
#  vps_setup.sh  —  MROHAUNG First-Time VPS Setup
#  Run once on a fresh VPS as root: bash vps_setup.sh
#  For re-deployments / repairs use:  bash vps_repair.sh
# ================================================================
set -e

VPS_IP="139.162.62.45"

echo "=== System Update ==="
apt update && apt upgrade -y

echo "=== Installing Dependencies ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx build-essential ufw curl

echo "=== Installing PM2 ==="
npm install -g pm2

echo "=== Setting up UFW Firewall ==="
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'

echo "=== Adding Swap Space (for Next.js compilation) ==="
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
fi

echo "=== Cloning Repository ==="
mkdir -p /var/www
cd /var/www

if [ ! -d "mrohaung" ]; then
    git clone https://github.com/shinebuchay-dev/mrohaung.git mrohaung
fi
cd mrohaung
git fetch origin main
git reset --hard origin/main
git pull origin main

echo "=== Backend Setup ==="
cd backend
npm install --omit=dev

# Production .env for backend
cat > .env << 'ENVEOF'
PORT=5001
DATABASE_URL="mysql://mrohaung_user:mrohaung_secure123!@127.0.0.1:3306/mrohaung_db"
JWT_SECRET="shinetwon_secret_key_2024"
NODE_ENV=production
ADMIN_USER_IDS="admin_id_here"
BASE_URL="http://139.162.62.45"
ENVEOF

# Ensure uploads directories exist
mkdir -p uploads/users

# Clear log file if it already exists and is large
LOG_FILE="/var/www/mrohaung/node_errors.log"
if [ -f "$LOG_FILE" ]; then
    > "$LOG_FILE"
    echo "Cleared existing log file."
fi

pm2 stop backend 2>/dev/null || true
pm2 delete backend 2>/dev/null || true
pm2 start index.js --name "backend"

echo "=== Frontend Setup ==="
cd ../web
npm install

# Production .env for frontend (use raw IP for static export)
cat > .env.production << 'ENVEOF'
NEXT_PUBLIC_API_URL=http://139.162.62.45/api
NEXT_PUBLIC_SOCKET_URL=http://139.162.62.45
ENVEOF

npm run build

pm2 stop frontend 2>/dev/null || true
pm2 delete frontend 2>/dev/null || true
pm2 start npm --name "frontend" -- run start -- -p 3000

# Save PM2 processes to restart on boot
pm2 save
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root || true

echo "=== Nginx Setup ==="
cat > /etc/nginx/sites-available/mrohaung << 'NGINXEOF'
server {
    listen 80;
    server_name 139.162.62.45 mrohaung.com www.mrohaung.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        proxy_pass http://localhost:5001/uploads/;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location /socket.io/ {
        proxy_pass http://localhost:5001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/mrohaung /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo ""
echo "=== Setup Complete ==="
echo "Site: http://$VPS_IP"
echo "API:  http://$VPS_IP/api/health"
pm2 list
