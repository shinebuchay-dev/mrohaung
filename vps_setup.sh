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
cat > .env <<EOF
PORT=5001
DATABASE_URL="mysql://u860480593_social_media:SBCsmdb1234@153.92.15.35:3306/u860480593_social_media"
JWT_SECRET="shinetwon_secret_key_2024"
NODE_ENV=production
ADMIN_USER_IDS="admin_id_here"
BASE_URL="http://139.162.62.45"
EOF

# Ensure uploads directories exist
mkdir -p uploads/users

pm2 stop backend || true
pm2 delete backend || true
pm2 start index.js --name "backend"

echo "=== Frontend Setup ==="
cd ../web
npm install

# Production .env for frontend
cat > .env.production <<EOF
NEXT_PUBLIC_API_URL=http://139.162.62.45/api
NEXT_PUBLIC_SOCKET_URL=http://139.162.62.45
EOF

npm run build

pm2 stop frontend || true
pm2 delete frontend || true
pm2 start npm --name "frontend" -- run start -- -p 3000

# Save PM2 processes to restart on boot
pm2 save
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root || true

echo "=== Nginx Setup ==="
cat > /etc/nginx/sites-available/mrohaung <<EOF
server {
    listen 80;
    server_name 139.162.62.45; # Replace with mrohaung.com later

    client_max_body_size 100M;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static Uploads
    location /uploads/ {
        proxy_pass http://localhost:5001/uploads/;
        proxy_set_header Host \$host;
        # Add caching
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:5001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/mrohaung /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "=== Deployment Complete ==="
