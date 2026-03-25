#!/bin/bash
set -e

echo "=== System Update ==="
apt update && apt upgrade -y

echo "=== Installing Dependencies ==="
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx build-essential ufw curl

echo "=== Installing PM2 ==="
npm install -g pm2 concurrently

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
npm install
# Production .env for backend
printf "# MySQL Configuration - REMOTE (Hostinger)\n# Construction for Prisma\nDATABASE_URL=\"mysql://u860480593_social_media:SBCsmdb1234@153.92.15.35:3306/u860480593_social_media\"\n\n# Individual variables for mysql2 pool fallback\nDB_HOST=153.92.15.35\nDB_USER=u860480593_social_media\nDB_PASS=SBCsmdb1234\nDB_PASSWORD=SBCsmdb1234\nDB_NAME=u860480593_social_media\nDB_PORT=3306\n\n# Backend Configuration\nJWT_SECRET=shinetwon_secret_key_2024\nNODE_ENV=production\n\n# Frontend Configuration\nNEXT_PUBLIC_API_URL=https://mrohaung.com/api\nNEXT_PUBLIC_SOCKET_URL=https://mrohaung.com\nFRONTEND_URL=https://mrohaung.com\nBASE_URL=https://mrohaung.com\n" > .env
npx prisma generate

# Ensure uploads directories exist
mkdir -p uploads/users

pm2 stop backend || true
pm2 delete backend || true
pm2 start index.js --name "backend"

echo "=== Frontend Setup ==="
cd ../web
npm install

# Production .env for frontend
printf "NEXT_PUBLIC_API_URL=http://139.162.62.45/api\nNEXT_PUBLIC_SOCKET_URL=http://139.162.62.45\n" > .env.production

npm run build

pm2 stop frontend || true
pm2 delete frontend || true
pm2 start npm --name "frontend" -- run start -- -p 3000

# Save PM2 processes to restart on boot
pm2 save
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root || true

echo "=== Nginx Setup ==="
printf "server {\n    listen 80;\n    server_name 139.162.62.45;\n\n    client_max_body_size 100M;\n\n    location / {\n        proxy_pass http://localhost:3000;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade \$http_upgrade;\n        proxy_set_header Connection 'upgrade';\n        proxy_set_header Host \$host;\n        proxy_cache_bypass \$http_upgrade;\n    }\n\n    location /api/ {\n        proxy_pass http://localhost:5001/api/;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade \$http_upgrade;\n        proxy_set_header Connection 'upgrade';\n        proxy_set_header Host \$host;\n        proxy_cache_bypass \$http_upgrade;\n    }\n\n    location /uploads/ {\n        proxy_pass http://localhost:5001/uploads/;\n        proxy_set_header Host \$host;\n        expires 30d;\n        add_header Cache-Control \"public, no-transform\";\n    }\n\n    location /socket.io/ {\n        proxy_pass http://localhost:5001/socket.io/;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade \$http_upgrade;\n        proxy_set_header Connection \"upgrade\";\n        proxy_set_header Host \$host;\n    }\n}\n" > /etc/nginx/sites-available/mrohaung

ln -sf /etc/nginx/sites-available/mrohaung /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "=== Deployment Complete ==="
