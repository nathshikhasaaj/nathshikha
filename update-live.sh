#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Nathshikha Luxury Jewellery — Live Server Update       "
echo "  Target Node: NVM 20.20.2 (Node 20 LTS)                 "
echo "=========================================================="

# 1. Load NVM Environment
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
elif [ -s "/root/.nvm/nvm.sh" ]; then
    export NVM_DIR="/root/.nvm"
    \. "/root/.nvm/nvm.sh"
elif [ -s "$HOME/.nvm/nvm.sh" ]; then
    \. "$HOME/.nvm/nvm.sh"
else
    echo "--> Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# 2. Use or Install Node.js 20.20.2 (or Node 20 LTS)
echo "--> Setting up Node.js via NVM..."
nvm install 20.20.2 2>/dev/null || nvm install 20
nvm use 20.20.2 2>/dev/null || nvm use 20
nvm alias default $(node -v)

echo "Active Node Version : $(node -v)"
echo "Active NPM Version  : $(npm -v)"

# 3. Locate App Directory
APP_DIR="/var/www/nathshikha"
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
else
    APP_DIR="$(pwd)"
    cd "$APP_DIR"
fi
echo "App Directory       : $APP_DIR"

# 4. Install Dependencies
echo "--> Installing npm dependencies..."
npm install --production=false

# 5. Build Frontend SPA Bundle
echo "--> Building production Vite bundle..."
npm run build

# 6. Restart PM2 Process
echo "--> Restarting PM2 process manager..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

pm2 delete nathshikha-api 2>/dev/null || true
pm2 start server/index.js --name "nathshikha-api" -i max
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | bash 2>/dev/null || true

# 7. Reload Nginx
if command -v nginx &> /dev/null; then
    echo "--> Testing and reloading Nginx..."
    nginx -t
    systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null || true
fi

echo "=========================================================="
echo "  ✓ LIVE SERVER UPDATED SUCCESSFULLY WITH NODE $(node -v)! "
echo "  Website URL: https://nathshikha.in                      "
echo "=========================================================="
