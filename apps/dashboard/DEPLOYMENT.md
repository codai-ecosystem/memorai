# Memorai Web Dashboard - Deployment Guide

## 🚀 Production Deployment

This guide covers deploying the Memorai Web Dashboard in production environments.

### Prerequisites

- Node.js 18+ LTS
- npm or pnpm package manager
- Reverse proxy (nginx/Apache) - recommended
- SSL certificate for HTTPS
- Process manager (PM2) - recommended

### Build for Production

```bash
# Navigate to dashboard directory
cd apps/dashboard

# Install dependencies
pnpm install

# Build production assets
pnpm build

# Built files will be in dist/ directory
```

### Deployment Options

#### Option 1: Direct Node.js Deployment

```bash
# Copy dist/ directory to production server
scp -r dist/ user@server:/opt/memorai-dashboard/

# On production server
cd /opt/memorai-dashboard
npm install --production
node start.js
```

#### Option 2: PM2 Process Manager (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'memorai-dashboard',
    script: 'start.js',
    cwd: '/opt/memorai-dashboard',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      WEB_PORT: 3002
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Option 3: Docker Container

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY dist/ ./

# Install production dependencies
RUN npm install --production --silent

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/api/health || exit 1

# Start application
CMD ["node", "start.js"]
```

```bash
# Build and run Docker container
docker build -t memorai-dashboard .
docker run -d -p 3002:3002 --name memorai-dashboard memorai-dashboard
```

#### Option 4: Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: memorai-dashboard
  labels:
    app: memorai-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: memorai-dashboard
  template:
    metadata:
      labels:
        app: memorai-dashboard
    spec:
      containers:
        - name: memorai-dashboard
          image: memorai-dashboard:latest
          ports:
            - containerPort: 3002
          env:
            - name: NODE_ENV
              value: "production"
            - name: WEB_PORT
              value: "3002"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3002
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3002
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: memorai-dashboard-service
spec:
  selector:
    app: memorai-dashboard
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3002
  type: LoadBalancer
```

### Environment Configuration

Create a `.env` file for production settings:

```bash
# Server Configuration
NODE_ENV=production
WEB_PORT=3002
LOG_LEVEL=info

# Memorai Integration
MEMORAI_OPENAI_API_KEY=your_openai_key_here
MEMORAI_AZURE_ENDPOINT=https://your-azure-endpoint.openai.azure.com/
MEMORAI_AZURE_API_KEY=your_azure_key_here
MEMORAI_AZURE_DEPLOYMENT=your_deployment_name

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# SSL/TLS (if using HTTPS directly)
SSL_CERT_PATH=/path/to/certificate.crt
SSL_KEY_PATH=/path/to/private.key
```

### Reverse Proxy Configuration

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/memorai-dashboard
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3002;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Apache Configuration

```apache
# /etc/apache2/sites-available/memorai-dashboard.conf
<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com

    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key

    # Security headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

    ProxyPreserveHost On
    ProxyRequests Off

    # Main application
    ProxyPass / http://localhost:3002/
    ProxyPassReverse / http://localhost:3002/

    # WebSocket support
    ProxyPass /socket.io/ ws://localhost:3002/socket.io/
    ProxyPassReverse /socket.io/ ws://localhost:3002/socket.io/

    # Enable modules
    LoadModule proxy_module modules/mod_proxy.so
    LoadModule proxy_http_module modules/mod_proxy_http.so
    LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so
    LoadModule headers_module modules/mod_headers.so
</VirtualHost>
```

### Monitoring and Logging

#### Log Configuration

```javascript
// Enhanced logging configuration
const winston = require("winston");
const path = require("path");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "memorai-dashboard" },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(__dirname, "logs/error.log"),
      level: "error",
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(__dirname, "logs/combined.log"),
      maxsize: 10485760,
      maxFiles: 10,
    }),
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});
```

#### Health Checks and Monitoring

```bash
# Health check script
#!/bin/bash
HEALTH_URL="http://localhost:3002/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✅ Dashboard is healthy"
    exit 0
else
    echo "❌ Dashboard health check failed (HTTP $RESPONSE)"
    exit 1
fi
```

```bash
# Automated monitoring with cron
# Add to crontab: */5 * * * * /path/to/health-check.sh
```

### Performance Optimization

#### Production Optimizations

```javascript
// Production server optimizations
const express = require("express");
const compression = require("compression");
const helmet = require("helmet");

const app = express();

// Enable compression
app.use(compression());

// Security hardening
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://unpkg.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// Cache control for static assets
app.use(
  "/static",
  express.static("public", {
    maxAge: "1y",
    etag: true,
    lastModified: true,
  }),
);
```

### Backup and Recovery

#### Database Backup (if applicable)

```bash
#!/bin/bash
# backup-memories.sh
BACKUP_DIR="/backup/memorai"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Export memories
curl -s http://localhost:3002/api/memory/export > $BACKUP_DIR/memories_$DATE.json

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "memories_*.json" -mtime +30 -delete

echo "✅ Backup completed: memories_$DATE.json"
```

#### Configuration Backup

```bash
#!/bin/bash
# backup-config.sh
BACKUP_DIR="/backup/memorai"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup configuration
cp /opt/memorai-dashboard/.env $BACKUP_DIR/config_$DATE.env
cp /opt/memorai-dashboard/ecosystem.config.js $BACKUP_DIR/ecosystem_$DATE.js

echo "✅ Configuration backup completed"
```

### Troubleshooting

#### Common Issues and Solutions

**Port Already in Use**

```bash
# Find process using port
lsof -i :3002
# Kill process
sudo kill -9 <PID>
```

**Memory Issues**

```bash
# Check memory usage
ps aux | grep node
# Monitor in real-time
top -p $(pgrep node)
```

**WebSocket Connection Issues**

```bash
# Check WebSocket connectivity
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:3002/socket.io/
```

**SSL Certificate Issues**

```bash
# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiry
openssl x509 -in certificate.crt -text -noout | grep "Not After"
```

### Security Checklist

- [ ] SSL/TLS certificate installed and configured
- [ ] Security headers configured (HSTS, CSP, etc.)
- [ ] Rate limiting enabled and configured
- [ ] CORS origins properly restricted
- [ ] Environment variables secured
- [ ] Log files have proper permissions
- [ ] Regular security updates applied
- [ ] Firewall configured to restrict access
- [ ] Backup encryption enabled
- [ ] Monitoring and alerting configured

### Performance Checklist

- [ ] Gzip compression enabled
- [ ] Static asset caching configured
- [ ] Database queries optimized
- [ ] Memory usage monitored
- [ ] CPU usage monitored
- [ ] Network latency minimized
- [ ] CDN configured for static assets
- [ ] Load balancing configured (if needed)
- [ ] Auto-scaling configured (if needed)

---

For additional support and advanced deployment scenarios, consult the main Memorai documentation or contact the development team.
