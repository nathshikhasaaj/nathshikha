#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Nathshikha Luxury Jewellery — Live Server Update       "
echo "  Target Node: NVM Node 20.20.2 (Node 20 LTS)            "
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
echo "--> Setting up Node.js via NVM (target: 20.20.2)..."
nvm install 20.20.2 2>/dev/null || nvm install 20
nvm use 20.20.2 2>/dev/null || nvm use 20
nvm alias default $(node -v)

echo "Active Node Version : $(node -v)"
echo "Active NPM Version  : $(npm -v)"
echo "Active Node Binary  : $(which node)"

# 3. Locate & Update Application Directory
APP_DIR="/var/www/nathshikha"
if [ ! -d "$APP_DIR" ]; then
    if [ -d "$(pwd)/server" ] && [ -d "$(pwd)/src" ]; then
        APP_DIR="$(pwd)"
    else
        mkdir -p "$APP_DIR"
        git clone https://github.com/nathshikhasaaj/nathshikha.git "$APP_DIR"
    fi
fi

cd "$APP_DIR"
echo "App Directory       : $APP_DIR"

# 4. Pull Latest Changes from GitHub
if [ -d "$APP_DIR/.git" ]; then
    echo "--> Pulling latest changes from GitHub repository..."
    git fetch origin main
    git reset --hard origin/main
fi

# 5. Ensure Environment Variables (.env) exist
if [ ! -f "$APP_DIR/.env" ]; then
    echo "--> Creating default production .env..."
    cat << 'EOF' > "$APP_DIR/.env"
PORT=4000
NODE_ENV=production
JWT_SECRET=650e4df09b9acb71046ff5d8488066b407a06d784db12df19d3f51d3b5aeba20
UPI_ID=7038172478@pthdfc
VITE_WHATSAPP_NUMBER=919699668421
VITE_UPI_ID=7038172478@pthdfc
SMTP_USER=nathshikha.saaj@gmail.com
SMTP_PASSWORD=wjkd gqaw sekk dqtx
EMAIL_FROM=nathshikha.saaj@gmail.com
APP_BASE_URL=https://nathshikha.in
MONGO_URI="mongodb://36nakharewali_db_user:GHDoNQUww84P4cyN@ac-8evlyx5-shard-00-00.ha7uwx6.mongodb.net:27017,ac-8evlyx5-shard-00-01.ha7uwx6.mongodb.net:27017,ac-8evlyx5-shard-00-02.ha7uwx6.mongodb.net:27017/nakhrewali?ssl=true&replicaSet=atlas-xrh8s9-shard-0&authSource=admin&appName=Cluster0"
EOF
fi

# 6. Ensure Uploads Directory Exists
mkdir -p "$APP_DIR/public/uploads"

# 7. Install Dependencies
echo "--> Installing npm dependencies..."
npm install --production=false

# 8. Build Frontend SPA Bundle
echo "--> Building production Vite bundle..."
npm run build

# 9. Restart PM2 Process with the active NVM Node version
echo "--> Restarting PM2 process manager..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

pm2 delete nathshikha-api 2>/dev/null || true
pm2 start server/index.js --name "nathshikha-api" -i max --interpreter $(which node)
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | bash 2>/dev/null || true

# 10. Test and Reload Nginx
if command -v nginx &> /dev/null; then
    echo "--> Testing and reloading Nginx..."
    nginx -t
    systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null || true
fi

# 11. Verification
echo "--> Checking PM2 status..."
pm2 status nathshikha-api

echo "=========================================================="
echo "  ✓ LIVE SERVER UPDATED SUCCESSFULLY WITH NODE $(node -v)! "
echo "  Website URL: https://nathshikha.in                      "
echo "=========================================================="

