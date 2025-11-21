#!/bin/bash

# Script to initialize Let's Encrypt certificates
# Usage: ./init-letsencrypt.sh your-domain.com your-email@example.com

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 drivebetter.co admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Initializing Let's Encrypt for domain: $DOMAIN"
echo "📧 Email: $EMAIL"

# Create directories
echo "📁 Creating directories..."
mkdir -p "$PROJECT_DIR/certbot/conf"
mkdir -p "$PROJECT_DIR/certbot/www"

# Check if certificates already exist
if [ -d "$PROJECT_DIR/certbot/conf/live/$DOMAIN" ]; then
    echo "⚠️  Certificates already exist for $DOMAIN"
    read -p "Do you want to renew them? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Renewing certificates..."
        docker run --rm \
            -v "$PROJECT_DIR/certbot/conf:/etc/letsencrypt" \
            -v "$PROJECT_DIR/certbot/www:/var/www/certbot" \
            certbot/certbot renew
    else
        echo "✅ Using existing certificates"
        exit 0
    fi
else
    echo "📝 Generating new certificates..."
    
    # Start nginx temporarily for certificate generation
    echo "🌐 Starting nginx container for certificate validation..."
    cd "$PROJECT_DIR"
    docker-compose up -d nginx
    
    # Wait for nginx to be ready
    sleep 5
    
    # Generate certificates
    docker run --rm \
        -v "$PROJECT_DIR/certbot/conf:/etc/letsencrypt" \
        -v "$PROJECT_DIR/certbot/www:/var/www/certbot" \
        certbot/certbot certonly --webroot \
        -w /var/www/certbot \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive
    
    if [ $? -eq 0 ]; then
        echo "✅ Certificates generated successfully!"
        echo "📋 Certificate location: $PROJECT_DIR/certbot/conf/live/$DOMAIN"
    else
        echo "❌ Certificate generation failed"
        echo "💡 Make sure:"
        echo "   1. DNS is properly configured (A record pointing to this server)"
        echo "   2. Ports 80 and 443 are open"
        echo "   3. Domain is accessible via HTTP"
        exit 1
    fi
fi

# Restart nginx with SSL
echo "🔄 Restarting nginx with SSL configuration..."
cd "$PROJECT_DIR"
docker-compose restart nginx

echo "✅ Setup complete!"
echo "🌐 Visit https://$DOMAIN to verify SSL is working"

