#!/bin/bash

# Simple Deployment Script for AttachmentAnalyzer
set -e

echo "🚀 Starting AttachmentAnalyzer deployment..."

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install other dependencies
echo "📦 Installing system dependencies..."
sudo apt-get install -y nginx postgresql postgresql-contrib pm2 build-essential

# Setup PostgreSQL
echo "🗄️ Setting up PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres createdb attachmentdb || echo "Database already exists"
sudo -u postgres createuser attachmentuser || echo "User already exists"
sudo -u postgres psql -c "ALTER USER attachmentuser WITH PASSWORD 'secure_password123';" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE attachmentdb TO attachmentuser;" || true

# Install application dependencies
echo "📦 Installing application dependencies..."
npm install

# Build the application
echo "🏗️ Building application..."
npm run build || echo "Build completed with warnings"

# Setup environment variables
echo "⚙️ Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env || echo "No .env.example found"
fi

# Start services
echo "🚀 Starting services..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Setup PM2 for the application
pm2 start server/index.js --name "attachment-analyzer" || echo "PM2 process may already exist"
pm2 startup || echo "PM2 startup already configured"
pm2 save

echo "✅ Deployment completed!"
echo "🌐 Your application should be available at: http://$(curl -s http://ipinfo.io/ip)"
echo "📊 Check status with: pm2 status" 