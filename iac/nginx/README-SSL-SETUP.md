# SSL/HTTPS Setup Guide for DriveBetter

This guide will help you set up HTTPS with Let's Encrypt SSL certificates for your domain on Route 53.

## Prerequisites

1. Domain registered on Route 53 (e.g., `drivebetter.co`)
2. EC2 instance or server with Docker installed
3. Ports 80 and 443 open in your security group
4. Root or sudo access to the server

## Step 1: Configure Route 53 DNS

1. Go to AWS Route 53 Console → Hosted Zones
2. Select your domain (e.g., `drivebetter.co`)
3. Create/Update A records:

   **For main domain:**
   - Name: `@` (or leave blank)
   - Type: `A`
   - Alias: `No`
   - Value: Your server's public IP address
   - TTL: `300` (5 minutes)

   **For www subdomain (optional):**
   - Name: `www`
   - Type: `A`
   - Alias: `No`
   - Value: Your server's public IP address
   - TTL: `300`

4. Wait for DNS propagation (can take a few minutes to hours)

## Step 2: Install Certbot on Your Server

SSH into your server and install certbot:

```bash
# For Ubuntu/Debian
sudo apt-get update
sudo apt-get install certbot

# For Amazon Linux 2
sudo yum install certbot
```

## Step 3: Create Required Directories

```bash
cd /path/to/your/project/iac
mkdir -p certbot/conf certbot/www
```

## Step 4: Start Nginx Container (HTTP only, for certificate generation)

First, temporarily update `nginx.conf` to only listen on port 80 for certificate generation:

```nginx
server {
    listen 80;
    server_name drivebetter.co www.drivebetter.co;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 "Certificate generation in progress";
        add_header Content-Type text/plain;
    }
}
```

Start nginx:
```bash
docker-compose up -d nginx
```

## Step 5: Generate SSL Certificates

Run certbot to generate certificates:

```bash
sudo certbot certonly --webroot \
  -w /path/to/your/project/iac/certbot/www \
  -d drivebetter.co \
  -d www.drivebetter.co \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive
```

**Note:** If using Docker, you may need to run certbot in a container:

```bash
docker run -it --rm \
  -v /path/to/your/project/iac/certbot/conf:/etc/letsencrypt \
  -v /path/to/your/project/iac/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d drivebetter.co \
  -d www.drivebetter.co \
  --email your-email@example.com \
  --agree-tos
```

## Step 6: Update nginx.conf

Restore the full `nginx.conf` with SSL configuration (already done in the file).

## Step 7: Restart Services

```bash
docker-compose down
docker-compose up -d
```

## Step 8: Set Up Auto-Renewal

SSL certificates expire every 90 days. Set up automatic renewal:

### Option 1: Cron Job (Recommended)

```bash
sudo crontab -e
```

Add this line (runs daily at 2 AM):
```
0 2 * * * docker run --rm -v /path/to/your/project/iac/certbot/conf:/etc/letsencrypt -v /path/to/your/project/iac/certbot/www:/var/www/certbot certbot/certbot renew --quiet && docker-compose -f /path/to/your/project/iac/docker-compose.yaml exec nginx nginx -s reload
```

### Option 2: Systemd Timer (Alternative)

Create `/etc/systemd/system/certbot-renewal.service`:
```ini
[Unit]
Description=Renew Let's Encrypt certificates
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/docker run --rm -v /path/to/your/project/iac/certbot/conf:/etc/letsencrypt -v /path/to/your/project/iac/certbot/www:/var/www/certbot certbot/certbot renew
ExecStartPost=/usr/bin/docker-compose -f /path/to/your/project/iac/docker-compose.yaml exec nginx nginx -s reload
```

Create `/etc/systemd/system/certbot-renewal.timer`:
```ini
[Unit]
Description=Renew Let's Encrypt certificates daily
Requires=certbot-renewal.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable certbot-renewal.timer
sudo systemctl start certbot-renewal.timer
```

## Step 9: Verify SSL

1. Visit `https://drivebetter.co` in your browser
2. Check SSL rating: https://www.ssllabs.com/ssltest/analyze.html?d=drivebetter.co
3. Verify HTTP redirects to HTTPS

## Troubleshooting

### Certificate generation fails
- Ensure DNS is properly configured and propagated
- Check that ports 80 and 443 are open in security group
- Verify nginx is running and accessible

### 502 Bad Gateway
- Check if API and web containers are running: `docker-compose ps`
- Check nginx logs: `docker-compose logs nginx`
- Verify proxy_pass URLs match your service names

### Certificate renewal fails
- Check certbot logs: `sudo certbot certificates`
- Ensure certbot has write access to certificate directories
- Verify nginx can read certificates (check file permissions)

## Security Group Rules (AWS)

Ensure your EC2 security group allows:
- Inbound TCP 80 (HTTP) from 0.0.0.0/0
- Inbound TCP 443 (HTTPS) from 0.0.0.0/0
- Outbound All traffic (for Let's Encrypt validation)

## Additional Notes

- Replace `drivebetter.co` with your actual domain name if different
- Update email address in certbot commands
- Adjust file paths to match your project structure
- Consider using AWS Certificate Manager (ACM) if using AWS ALB/CloudFront instead

