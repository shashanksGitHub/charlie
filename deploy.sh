#!/bin/bash

# AttachmentAnalyzer DigitalOcean Deployment Script
# This script automates the complete deployment process

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Configuration variables
APP_NAME="attachment-analyzer"
DB_NAME="attachmentdb"
DB_USER="attachmentuser"
NODE_VERSION="18"
APP_PORT="5001"

# Generate secure password
DB_PASSWORD=$(openssl rand -base64 32)

log "Starting AttachmentAnalyzer deployment..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root. Please run as a regular user with sudo privileges."
fi

# Update system
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
log "Installing required packages..."
sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates

# Install Node.js
log "Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
log "Node.js installed: ${node_version}, npm: ${npm_version}"

# Install Nginx
log "Installing Nginx..."
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx

# Install PostgreSQL
log "Installing PostgreSQL..."
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Install PM2
log "Installing PM2..."
sudo npm install -g pm2

# Install additional tools
log "Installing additional tools..."
sudo apt install -y git htop ufw fail2ban certbot python3-certbot-nginx

# Configure firewall
log "Configuring firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3478  # STUN server
sudo ufw allow 5349  # TURN server
sudo ufw --force enable

# Configure PostgreSQL
log "Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -c "ALTER USER ${DB_USER} CREATEDB;"

# Create application directory
log "Setting up application directory..."
sudo mkdir -p /var/www/${APP_NAME}
sudo chown $USER:$USER /var/www/${APP_NAME}

# Clone repository (you'll need to update this with your actual repo)
log "Cloning application repository..."
cd /var/www/${APP_NAME}

# If you have a git repository, uncomment and update the next line:
# git clone https://github.com/yourusername/AttachmentAnalyzer.git .

# For now, we'll copy from the current directory
cp -r /Users/sauravshaw/Downloads/AttachmentAnalyzer/* . 2>/dev/null || {
    warning "Could not copy from source directory. Please manually copy your application files to /var/www/${APP_NAME}"
}

# Create .env file
log "Creating environment configuration..."
cat > .env << EOL
# Database Configuration
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}

# Application Configuration
NODE_ENV=production
PORT=${APP_PORT}

# Frontend Environment Variables
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51RgwjDCEnma3eoA3dlN6OdDVdnIasFq9e7yJkLXcH0g3Wf3jZQ50UtGLlXoeh3PFQvAjrCA
VITE_STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_51RgwjDCEnma3eoA3uk6kj2JDepeiIjYI9MlsYFyqLmD1yjuAiNB8qgNCIsAsLD5xwUMHhbxuJIXxPQzMplEElBTj00j3GopuSV
VITE_MAPBOX_PUBLIC_KEY=

# Security
SESSION_SECRET="dM6Fv8y9A0TkMpXC6ypT9sPjetTLZbTnKtwFo9XYYjceqz0mKh49J8Nfb8aivzMPrvx3CWQb+S27iiN64Ely2g=="

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_51RgwjNC5nO0UwsR6KmAVKPb9JthHlEScgRALG1Aqj8KIxNekF9OW9cApcJFktdl71HPIiCpvsREbFChKqupTatwh00rtAw87a7"
VITE_STRIPE_PUBLIC_KEY="pk_test_51RgwjNC5nO0UwsR6Tm8wnFsziLhGLPXS8K8q5AMOXPUul8v9h4e44eVAnTHOs9l014xiL1Vgy1OF87guoWVk7INE00judFEA7C"
STRIPE_LIVE_PUBLISHABLE_KEY="pk_live_51RgwjDCEnma3eoA3uk6kj2JDepeiIjYI9MlsYFyqLmD1yjuAiNB8qgNCIsAsLD5xwUMHhbxuJIXxPQzMplEElBTj00j3GopuSV"
STRIPE_LIVE_SECRET_KEY="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"

# Mapbox Configuration
MAPBOX_PUBLIC_KEY="pk.eyJ1Ijoib2JlZGFtaXNzYWg4MDAiLCJhIjoiY203eXlkdzlxMGZibzJscTNtMmFjejhnYSJ9.YgQk1mVzSM2C6CKhrZJrsA"

# Object Storage Configuration
DEFAULT_OBJECT_STORAGE_BUCKET_ID="replit-objstore-50e7355c-92d0-4b69-88bd-255899b22f29"
PUBLIC_OBJECT_SEARCH_PATHS="/replit-objstore-50e7355c-92d0-4b69-88bd-255899b22f29/public"
PRIVATE_OBJECT_DIR="/replit-objstore-50e7355c-92d0-4b69-88bd-255899b22f29/.private"

# OpenAI Configuration
OPENAI_API_KEY="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"

# SendGrid Configuration
SENDGRID_API_KEY="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"

# STUN/TURN Server Configuration
STUN_SERVER=stun:localhost:3478
TURN_SERVER=turn:localhost:3478
TURN_USERNAME=attachment-user
TURN_PASSWORD=$(openssl rand -base64 16)

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/${APP_NAME}/uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOL

# Install application dependencies
if [ -f "package.json" ]; then
    log "Installing application dependencies..."
    npm install --production
    
    # Build the application if build script exists
    if npm run | grep -q "build"; then
        log "Building application..."
        npm run build
    fi
else
    warning "package.json not found. Please ensure your application files are in /var/www/${APP_NAME}"
fi

# Create uploads directory
mkdir -p uploads
chmod 755 uploads

# Configure Nginx
log "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/${APP_NAME} > /dev/null << EOL
server {
    listen 80;
    server_name _;
    client_max_body_size 10M;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;

    # Main application
    location / {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files
    location /uploads {
        alias /var/www/${APP_NAME}/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOL

# Enable the site
sudo ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Install and configure Coturn (STUN/TURN server)
log "Installing and configuring Coturn STUN/TURN server..."
sudo apt install coturn -y

# Generate TURN server secret
TURN_SECRET=$(openssl rand -base64 32)

sudo tee /etc/turnserver.conf > /dev/null << EOL
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
external-ip=\$(curl -s http://ipinfo.io/ip)
realm=localhost
server-name=localhost
lt-cred-mech
static-auth-secret=${TURN_SECRET}
userdb=/etc/turnuserdb.conf
no-multicast-peers
no-cli
no-tlsv1
no-tlsv1_1
cipher-list="ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!SHA1:!AESCCM"
EOL

# Enable and start Coturn
sudo systemctl enable coturn
sudo systemctl start coturn

# Run database migrations if they exist
if [ -f "migrations" ] || [ -d "migrations" ]; then
    log "Running database migrations..."
    npm run migrate 2>/dev/null || warning "Migration command not found or failed"
fi

# Start application with PM2
log "Starting application with PM2..."
pm2 stop ${APP_NAME} 2>/dev/null || true
pm2 delete ${APP_NAME} 2>/dev/null || true

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: '${APP_NAME}',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: ${APP_PORT}
    },
    error_file: '/var/log/${APP_NAME}/error.log',
    out_file: '/var/log/${APP_NAME}/out.log',
    log_file: '/var/log/${APP_NAME}/combined.log',
    time: true,
    max_memory_restart: '500M',
    node_args: '--max_old_space_size=1024'
  }]
};
EOL

# Create log directory
sudo mkdir -p /var/log/${APP_NAME}
sudo chown $USER:$USER /var/log/${APP_NAME}

# Start the application
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# Configure automatic SSL renewal
log "Setting up SSL certificate auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Create backup script
log "Creating backup script..."
sudo tee /usr/local/bin/backup-${APP_NAME} > /dev/null << EOL
#!/bin/bash
BACKUP_DIR="/var/backups/${APP_NAME}"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \${BACKUP_DIR}

# Backup database
sudo -u postgres pg_dump ${DB_NAME} | gzip > \${BACKUP_DIR}/db_\${DATE}.sql.gz

# Backup application files
tar -czf \${BACKUP_DIR}/app_\${DATE}.tar.gz -C /var/www/${APP_NAME} .

# Keep only last 7 days of backups
find \${BACKUP_DIR} -name "*.gz" -mtime +7 -delete

echo "Backup completed: \${DATE}"
EOL

sudo chmod +x /usr/local/bin/backup-${APP_NAME}

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-${APP_NAME}") | crontab -

# Create monitoring script
log "Creating monitoring script..."
cat > /home/$USER/monitor.sh << EOL
#!/bin/bash
echo "=== AttachmentAnalyzer Status ==="
echo "Date: \$(date)"
echo ""
echo "=== Application Status ==="
pm2 status
echo ""
echo "=== System Resources ==="
free -h
df -h
echo ""
echo "=== Network Connections ==="
ss -tulpn | grep :${APP_PORT}
echo ""
echo "=== Recent Logs ==="
pm2 logs ${APP_NAME} --lines 10
EOL

chmod +x /home/$USER/monitor.sh

# Display deployment summary
log "Deployment completed successfully!"
echo ""
echo "=== DEPLOYMENT SUMMARY ==="
echo "Application: ${APP_NAME}"
echo "URL: http://$(curl -s http://ipinfo.io/ip)"
echo "Database: ${DB_NAME}"
echo "Database User: ${DB_USER}"
echo "Database Password: ${DB_PASSWORD}"
echo "TURN Secret: ${TURN_SECRET}"
echo ""
echo "=== IMPORTANT FILES ==="
echo "Application Directory: /var/www/${APP_NAME}"
echo "Environment File: /var/www/${APP_NAME}/.env"
echo "Nginx Config: /etc/nginx/sites-available/${APP_NAME}"
echo "PM2 Config: /var/www/${APP_NAME}/ecosystem.config.js"
echo "Logs Directory: /var/log/${APP_NAME}"
echo ""
echo "=== USEFUL COMMANDS ==="
echo "View logs: pm2 logs ${APP_NAME}"
echo "Restart app: pm2 restart ${APP_NAME}"
echo "Monitor status: ./monitor.sh"
echo "Manual backup: /usr/local/bin/backup-${APP_NAME}"
echo ""
echo "=== NEXT STEPS ==="
echo "1. Point your domain to this server's IP: $(curl -s http://ipinfo.io/ip)"
echo "2. Update Nginx config with your domain name"
echo "3. Run: sudo certbot --nginx -d your-domain.com"
echo "4. Update environment variables in /var/www/${APP_NAME}/.env"
echo ""
warning "Please save the database password: ${DB_PASSWORD}"
warning "Please save the TURN secret: ${TURN_SECRET}"

log "Deployment script completed!" 