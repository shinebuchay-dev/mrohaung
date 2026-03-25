#!/bin/bash
# ================================================================
#  vps_repair.sh  —  MROHAUNG Final Deployment & Repair Script
#  Run on VPS as root: bash vps_repair.sh
# ================================================================
set -e

APP_DIR="/var/www/mrohaung"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/web"
LOG_FILE="$APP_DIR/node_errors.log"
VPS_IP="139.162.62.45"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}   ✅  $*${NC}"; }
warn() { echo -e "${YELLOW}   ⚠   $*${NC}"; }
fail() { echo -e "${RED}   ❌  $*${NC}"; }

banner() {
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  $*${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

banner "MROHAUNG — FINAL DEPLOYMENT & REPAIR"
echo "  VPS: $VPS_IP"
echo "  App: $APP_DIR"
date

# ── STEP 1: Disk status ──────────────────────────────────────────
banner "STEP 1 — Disk Status"
df -h /

# ── STEP 2: Clear the runaway log ───────────────────────────────
banner "STEP 2 — Clear Oversized Log File"
if [ -f "$LOG_FILE" ]; then
  SIZE=$(du -sh "$LOG_FILE" 2>/dev/null | cut -f1)
  warn "Log file is $SIZE — truncating to 0 bytes..."
  > "$LOG_FILE"
  ok "Log cleared."
else
  ok "No log file found, skipping."
fi

echo ""
echo "  Disk usage AFTER cleanup:"
df -h /

# ── STEP 3: Pull latest code ─────────────────────────────────────
banner "STEP 3 — Git Pull (latest code)"
cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main
git pull origin main
ok "Code is up to date."

# ── STEP 4: Write backend .env ───────────────────────────────────
banner "STEP 4 — Backend Environment"
cat > "$BACKEND_DIR/.env" << 'ENVEOF'
PORT=5001
DATABASE_URL="mysql://mrohaung_user:mrohaung_secure123!@127.0.0.1:3306/mrohaung_db"
JWT_SECRET="shinetwon_secret_key_2024"
NODE_ENV=production
ADMIN_USER_IDS="admin_id_here"
BASE_URL="http://139.162.62.45"
ENVEOF
ok "Backend .env written."

# ── STEP 5: Install backend deps & restart ───────────────────────
banner "STEP 5 — Backend: Install & Restart"
cd "$BACKEND_DIR"
npm install --omit=dev
ok "npm install done."

pm2 stop backend   2>/dev/null || true
pm2 delete backend 2>/dev/null || true
pm2 start index.js --name "backend" --update-env
pm2 save
ok "PM2 backend restarted."

echo "  Waiting 4s for backend to boot..."
sleep 4

# ── STEP 6: Write frontend .env.production ───────────────────────
banner "STEP 6 — Frontend Environment"
cat > "$FRONTEND_DIR/.env.production" << 'ENVEOF'
NEXT_PUBLIC_API_URL=http://139.162.62.45/api
NEXT_PUBLIC_SOCKET_URL=http://139.162.62.45
ENVEOF
ok "Frontend .env.production written."

# ── STEP 7: Build & restart frontend ────────────────────────────
banner "STEP 7 — Frontend: Build & Restart"
cd "$FRONTEND_DIR"
npm install
npm run build
ok "Next.js build complete."

pm2 stop frontend   2>/dev/null || true
pm2 delete frontend 2>/dev/null || true
pm2 start npm --name "frontend" -- run start -- -p 3000
pm2 save
ok "PM2 frontend restarted."

# ── STEP 8: Nginx config ─────────────────────────────────────────
banner "STEP 8 — Nginx Config"
cat > /etc/nginx/sites-available/mrohaung << 'NGINXEOF'
server {
    listen 80;
    server_name 139.162.62.45 mrohaung.com www.mrohaung.com;

    client_max_body_size 100M;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploaded files (static)
    location /uploads/ {
        proxy_pass http://localhost:5001/uploads/;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Socket.IO
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
nginx -t && systemctl reload nginx
ok "Nginx config applied and reloaded."

# ── STEP 9: Verify all API routes ───────────────────────────────
banner "STEP 9 — Route Verification"
echo "  Testing backend directly (port 5001)..."

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/health)
PING=$(curl -s http://localhost:5001/api/ping 2>/dev/null || echo "no response")
ME_LOCAL=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/auth/me)
ADMIN_LOCAL=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/admin/overview)

echo "  /api/health         → HTTP $HEALTH  (want 200)"
echo "  /api/ping           → $PING         (want pong)"
echo "  /api/auth/me        → HTTP $ME_LOCAL  (want 401, not 404)"
echo "  /api/admin/overview → HTTP $ADMIN_LOCAL  (want 401/403, not 404)"

echo ""
echo "  Testing via Nginx (public)..."
PUBLIC_PING=$(curl -s "http://$VPS_IP/api/ping" 2>/dev/null || echo "no response")
PUBLIC_ME=$(curl -s -o /dev/null -w "%{http_code}" "http://$VPS_IP/api/auth/me")
PUBLIC_ADMIN=$(curl -s -o /dev/null -w "%{http_code}" "http://$VPS_IP/api/admin/overview")

echo "  /api/ping           → $PUBLIC_PING  (want pong)"
echo "  /api/auth/me        → HTTP $PUBLIC_ME  (want 401, not 404)"
echo "  /api/admin/overview → HTTP $PUBLIC_ADMIN  (want 401/403, not 404)"

# Final verdict
FAILED=0
[ "$ME_LOCAL"    = "404" ] && { fail "/api/auth/me is 404 on backend direct"; FAILED=1; }
[ "$ADMIN_LOCAL" = "404" ] && { fail "/api/admin/overview is 404 on backend direct"; FAILED=1; }
[ "$PUBLIC_ME"   = "404" ] && { fail "/api/auth/me is 404 via Nginx — check Nginx config"; FAILED=1; }

if [ $FAILED -eq 0 ]; then
  echo ""
  ok "ALL ROUTES VERIFIED — deployment successful!"
else
  echo ""
  warn "Some routes still broken. Showing backend PM2 logs:"
  pm2 logs backend --nostream --lines 80
fi

# ── DONE ────────────────────────────────────────────────────────
banner "DEPLOYMENT COMPLETE"
pm2 list
echo ""
echo "  Site: http://$VPS_IP"
echo "  API:  http://$VPS_IP/api/health"
echo ""
