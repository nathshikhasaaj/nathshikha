#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Nathshikha Luxury Jewellery — Live Server Update       "
echo "  Domain: nathshikha.in                                  "
echo "=========================================================="

APP_DIR="/var/www/nathshikha"

if [ ! -d "$APP_DIR" ]; then
    echo "Directory $APP_DIR does not exist. Running full deploy script..."
    bash deploy-server.sh
    exit 0
fi

echo "--> Loading Node.js environment (Node v20.x)..."
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    \. "$NVM_DIR/nvm.sh"
    nvm use 20 2>/dev/null || true
fi
echo "Node version: $(node -v || echo 'Not found')"
echo "NPM version: $(npm -v || echo 'Not found')"

echo "--> Navigating to application directory..."
cd "$APP_DIR"

echo "--> Pulling latest changes from GitHub main branch..."
git pull origin main

echo "--> Ensuring uploads directory exists..."
mkdir -p "$APP_DIR/public/uploads"
chmod -R 755 "$APP_DIR/public/uploads"

echo "--> Installing dependencies..."
npm install --production=false

echo "--> Building production Vite frontend..."
npm run build

echo "--> Updating Nginx configuration if changed..."
if [ -f "$APP_DIR/server/nginx/nathshikha.conf" ]; then
    cp "$APP_DIR/server/nginx/nathshikha.conf" /etc/nginx/sites-available/nathshikha
    ln -sf /etc/nginx/sites-available/nathshikha /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
fi

echo "--> Restarting API backend on PM2..."
pm2 restart nathshikha-api || pm2 start server/index.js --name "nathshikha-api" -i max
pm2 save

echo "=========================================================="
echo "  ✓ LIVE UPDATE SUCCESSFUL!                               "
echo "  Website URL: https://nathshikha.in                      "
echo "=========================================================="
