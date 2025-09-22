# AttachmentAnalyzer DigitalOcean Deployment Guide

This guide will help you deploy the AttachmentAnalyzer application on DigitalOcean with full video calling support, HTTPS, and production-ready configuration.

## Prerequisites

1. **DigitalOcean Account**: Sign up at https://www.digitalocean.com/
2. **Domain Name** (optional but recommended): Purchase from any registrar
3. **Local Machine**: macOS, Linux, or Windows with SSH client

## Quick Deployment (Automated)

### Step 1: Create DigitalOcean Droplet

1. **Login to DigitalOcean Dashboard**
2. **Create New Droplet**:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic - 4GB RAM / 2 CPUs ($24/mo)
   - **Region**: Choose closest to your users
   - **Authentication**: SSH Key (recommended)
   - **Hostname**: attachment-analyzer

3. **Generate SSH Key** (if you don't have one):
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
   cat ~/.ssh/id_rsa.pub  # Copy this to DigitalOcean
   ```

### Step 2: Deploy Application

1. **SSH into your droplet**:
   ```bash
   ssh root@your_droplet_ip
   ```

2. **Create a non-root user**:
   ```bash
   adduser deploy
   usermod -aG sudo deploy
   mkdir -p /home/deploy/.ssh
   cp ~/.ssh/authorized_keys /home/deploy/.ssh/
   chown -R deploy:deploy /home/deploy/.ssh
   chmod 700 /home/deploy/.ssh
   chmod 600 /home/deploy/.ssh/authorized_keys
   exit
   ```

3. **Login as deploy user**:
   ```bash
   ssh deploy@your_droplet_ip
   ```

4. **Download and run deployment script**:
   ```bash
   # Upload the deployment files to your server
   scp deploy.sh deploy@your_droplet_ip:~/
   scp -r . deploy@your_droplet_ip:~/AttachmentAnalyzer/
   
   # Run the deployment script
   chmod +x ~/deploy.sh
   ./deploy.sh
   ```

### Step 3: Configure Domain (Optional)

If you have a domain name:

1. **Point your domain to the server**:
   - Create A record: `yourdomain.com` → `your_droplet_ip`
   - Create A record: `www.yourdomain.com` → `your_droplet_ip`

2. **Run domain setup script**:
   ```bash
   chmod +x ~/setup-domain.sh
   ./setup-domain.sh
   ```

## What the Scripts Do

### Main Deployment Script (`deploy.sh`)

✅ **System Setup**:
- Updates Ubuntu packages
- Installs Node.js 18.x
- Installs Nginx web server
- Installs PostgreSQL database
- Configures firewall (UFW)

✅ **Application Setup**:
- Creates application directory
- Installs dependencies
- Configures environment variables
- Sets up PM2 process manager

✅ **Database Configuration**:
- Creates database and user
- Sets secure passwords
- Configures permissions

✅ **Web Server Configuration**:
- Configures Nginx reverse proxy
- Sets up WebSocket support
- Enables security headers

✅ **Video Calling Support**:
- Installs Coturn STUN/TURN server
- Configures WebRTC media relay
- Opens required ports (3478, 5349)

✅ **Security & Monitoring**:
- Sets up fail2ban
- Configures automatic backups
- Creates monitoring scripts
- Sets up SSL auto-renewal

### Domain Setup Script (`setup-domain.sh`)

✅ **SSL Certificate**:
- Installs Let's Encrypt SSL certificate
- Configures HTTPS redirect
- Sets up auto-renewal

✅ **Domain Configuration**:
- Updates Nginx with domain name
- Configures STUN/TURN with domain
- Tests SSL certificate

## Manual Configuration Steps

### 1. Environment Variables

Edit `/var/www/attachment-analyzer/.env`:

```bash
sudo nano /var/www/attachment-analyzer/.env
```

Update these values:
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key

# Other API keys as needed
```

### 2. Database Migration

If you have database migrations:
```bash
cd /var/www/attachment-analyzer
npm run migrate
```

### 3. Upload Application Files

If you need to update the application:
```bash
# On your local machine
scp -r . deploy@your_droplet_ip:/var/www/attachment-analyzer/

# On the server
cd /var/www/attachment-analyzer
npm install --production
npm run build
pm2 restart attachment-analyzer
```

## Useful Commands

### Application Management
```bash
# View application status
pm2 status

# View logs
pm2 logs attachment-analyzer

# Restart application
pm2 restart attachment-analyzer

# Monitor application
pm2 monit
```

### System Monitoring
```bash
# Run monitoring script
./monitor.sh

# Check system resources
htop

# Check disk space
df -h

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Management
```bash
# Connect to database
sudo -u postgres psql attachmentdb

# Backup database
sudo -u postgres pg_dump attachmentdb > backup.sql

# Restore database
sudo -u postgres psql attachmentdb < backup.sql
```

### SSL Certificate Management
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test auto-renewal
sudo certbot renew --dry-run
```

## Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs attachment-analyzer

# Check if port is in use
sudo netstat -tulpn | grep :5001

# Restart application
pm2 restart attachment-analyzer
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connection
sudo -u postgres psql -c "SELECT version();"

# Reset database password
sudo -u postgres psql -c "ALTER USER attachmentuser WITH PASSWORD 'new_password';"
```

### Video Calls Not Working
```bash
# Check Coturn status
sudo systemctl status coturn

# Check STUN/TURN ports
sudo netstat -tulpn | grep -E ":(3478|5349)"

# Test STUN server
stun-client your-domain.com 3478
```

### SSL Certificate Issues
```bash
# Check certificate
sudo certbot certificates

# Check Nginx configuration
sudo nginx -t

# Renew certificate
sudo certbot renew --force-renewal
```

## Security Considerations

1. **Regular Updates**: Keep the system updated
   ```bash
   sudo apt update && sudo apt upgrade
   ```

2. **Monitor Logs**: Check for suspicious activity
   ```bash
   sudo tail -f /var/log/auth.log
   ```

3. **Backup Strategy**: Automated backups run daily at 2 AM
   ```bash
   # Manual backup
   /usr/local/bin/backup-attachment-analyzer
   ```

4. **Firewall Status**: Verify firewall is active
   ```bash
   sudo ufw status
   ```

## Performance Optimization

### For High Traffic
1. **Upgrade Droplet**: 8GB RAM / 4 CPUs ($48/mo)
2. **Enable Caching**: Add Redis for session storage
3. **Load Balancer**: Use DigitalOcean Load Balancer
4. **CDN**: Use DigitalOcean Spaces + CDN

### Database Optimization
```bash
# Tune PostgreSQL
sudo nano /etc/postgresql/14/main/postgresql.conf

# Increase shared_buffers, effective_cache_size
# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Support

For issues with this deployment:
1. Check the logs first: `pm2 logs attachment-analyzer`
2. Review the monitoring script: `./monitor.sh`
3. Check system resources: `htop`
4. Verify services are running: `sudo systemctl status nginx postgresql coturn`

## Cost Estimate

- **Droplet**: $24/month (4GB RAM / 2 CPUs)
- **Domain**: $10-15/year
- **Backups**: $1.20/month (optional)
- **Load Balancer**: $12/month (if needed)

**Total**: ~$25-30/month for production-ready deployment

## Next Steps After Deployment

1. **Test video calling functionality**
2. **Configure email notifications**
3. **Set up monitoring alerts**
4. **Configure payment processing**
5. **Add custom branding**
6. **Set up staging environment** 