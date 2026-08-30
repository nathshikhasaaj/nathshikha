#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Nathshikha Luxury Jewellery — Production Server Setup   "
echo "  Domain: nathshikha.in                                  "
echo "=========================================================="

# 1. Update system packages
echo "--> Updating system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential

# 2. Install Node.js 20 LTS
if ! command -v node &> /dev/null; then
    echo "--> Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 3. Install PM2 Process Manager
if ! command -v pm2 &> /dev/null; then
    echo "--> Installing PM2 globally..."
    npm install -g pm2
fi

# 4. Configure Application Directory
APP_DIR="/var/www/nathshikha"
echo "--> Setting up application in $APP_DIR..."
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/public/uploads"

# If git repo exists, pull, else clone
if [ -d "$APP_DIR/.git" ]; then
    echo "--> Pulling latest changes from Git..."
    cd "$APP_DIR"
    git pull origin main
else
    echo "--> Cloning repository from GitHub..."
    rm -rf "$APP_DIR"
    git clone https://github.com/nathshikhasaaj/nathshikha.git "$APP_DIR"
    cd "$APP_DIR"
fi

# 5. Setup Production Environment Variables (.env)
echo "--> Writing production .env..."
cat << 'EOF' > "$APP_DIR/.env"
PORT=4000
NODE_ENV=production
JWT_SECRET=650e4df09b9acb71046ff5d8488066b407a06d784db12df19d3f51d3b5aeba20
UPI_ID=shwetadarekar04-1@okhdfcbank
VITE_WHATSAPP_NUMBER=919699668421
VITE_UPI_ID=shwetadarekar04-1@okhdfcbank
MONGO_URI="mongodb://36nakharewali_db_user:GHDoNQUww84P4cyN@ac-8evlyx5-shard-00-00.ha7uwx6.mongodb.net:27017,ac-8evlyx5-shard-00-01.ha7uwx6.mongodb.net:27017,ac-8evlyx5-shard-00-02.ha7uwx6.mongodb.net:27017/nakhrewali?ssl=true&replicaSet=atlas-xrh8s9-shard-0&authSource=admin&appName=Cluster0"
EOF

# 6. Install Dependencies & Build Frontend
echo "--> Installing npm dependencies..."
cd "$APP_DIR"
npm install --production=false

echo "--> Building production Vite SPA bundle..."
npm run build

# 7. Start/Restart Backend with PM2
echo "--> Configuring PM2 process manager..."
pm2 delete nathshikha-api 2>/dev/null || true
pm2 start server/index.js --name "nathshikha-api" -i max
pm2 save
pm2 startup systemd -u root --hp /root | bash || true

# 8. Configure Nginx
echo "--> Setting up Nginx virtual host for nathshikha.in..."
cat << 'EOF' > /etc/nginx/sites-available/nathshikha
server {
    listen 80;
    listen [::]:80;
    server_name nathshikha.in www.nathshikha.in;

    client_max_body_size 50M;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json image/svg+xml;

    root /var/www/nathshikha/dist;
    index index.html;

    location /uploads/ {
        alias /var/www/nathshikha/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri =404;
    }

    location /assets/ {
        alias /var/www/nathshikha/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Enable site and remove default
ln -sf /etc/nginx/sites-available/nathshikha /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx and reload
nginx -t
systemctl restart nginx

# 9. Configure Firewall (UFW)
echo "--> Configuring UFW Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 10. SSL Certificate Setup (Let's Encrypt)
echo "--> Setting up Free SSL with Certbot..."
certbot --nginx -d nathshikha.in -d www.nathshikha.in --non-interactive --agree-tos --register-unsafely-without-email || true

echo "=========================================================="
echo "  ✓ DEPLOYMENT COMPLETE!                                  "
echo "  Website URL : http://nathshikha.in                      "
echo "  HTTPS URL   : https://nathshikha.in                     "
echo "=========================================================="
