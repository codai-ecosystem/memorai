# 🚀 Memorai Deployment & Operations Guide

**Version**: 3.2.0  
**Date**: July 3, 2025  
**Author**: Memorai DevOps Team  
**Status**: Production-Ready

## 📋 Overview

This comprehensive guide covers deployment procedures, operational workflows, and best practices for running Memorai in production environments. It is designed for DevOps engineers, SREs, and technical operations teams.

## 🎯 Deployment Strategies

### Production Deployment Models

#### 1. Cloud-Native Kubernetes Deployment (Recommended)

```yaml
# Deployment architecture
cluster_config:
  provider: [AWS EKS, Azure AKS, GCP GKE]
  node_pools:
    - name: application
      instance_type: m5.xlarge
      min_nodes: 3
      max_nodes: 10
      auto_scaling: true
    - name: ml_workload
      instance_type: c5.2xlarge
      min_nodes: 2
      max_nodes: 8
      auto_scaling: true
    - name: database
      instance_type: r5.xlarge
      min_nodes: 3
      max_nodes: 3
      auto_scaling: false

services:
  - memorai-api (3-10 replicas)
  - memorai-dashboard (2-4 replicas)
  - memorai-mcp (2-4 replicas)
  - memorai-worker (2-8 replicas)
```

#### 2. Docker Compose Deployment (Development/Small Production)

```yaml
# docker-compose.yml
version: '3.8'
services:
  memorai-api:
    image: memorai/api:latest
    replicas: 2
    environment:
      DATABASE_URL: postgresql://memorai:${DB_PASSWORD}@postgres:5432/memorai
      REDIS_URL: redis://redis:6379
      QDRANT_URL: http://qdrant:6333
    depends_on:
      - postgres
      - redis
      - qdrant
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/health']
      interval: 30s
      timeout: 10s
      retries: 3

  memorai-dashboard:
    image: memorai/dashboard:latest
    environment:
      NEXT_PUBLIC_API_URL: http://memorai-api:3001
    depends_on:
      - memorai-api

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: memorai
      POSTGRES_USER: memorai
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U memorai']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant_data:/qdrant/storage
```

#### 3. Serverless Deployment (AWS Lambda/Vercel)

```yaml
# serverless.yml
service: memorai-serverless

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}

functions:
  api:
    handler: apps/api/src/lambda.handler
    timeout: 30
    memorySize: 1024
    environment:
      DATABASE_URL: ${ssm:/memorai/${self:provider.stage}/database-url}
      REDIS_URL: ${ssm:/memorai/${self:provider.stage}/redis-url}
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true

  worker:
    handler: apps/worker/src/lambda.handler
    timeout: 300
    memorySize: 2048
    events:
      - sqs:
          arn: ${cf:memorai-queue-${self:provider.stage}.QueueArn}
          batchSize: 10

resources:
  Resources:
    MemoraiRDSCluster:
      Type: AWS::RDS::DBCluster
      Properties:
        Engine: aurora-postgresql
        EngineVersion: '15.4'
        DatabaseName: memorai
        MasterUsername: memorai
        MasterUserPassword: ${ssm:/memorai/${self:provider.stage}/db-password~true}
```

## 🏗️ Infrastructure Setup

### Prerequisites Checklist

#### System Requirements

- [ ] Kubernetes cluster (1.26+) or Docker Compose environment
- [ ] PostgreSQL 15+ database
- [ ] Redis 7+ cache
- [ ] Qdrant vector database
- [ ] SSL certificates for HTTPS
- [ ] Domain name and DNS configuration
- [ ] Monitoring and logging infrastructure

#### Resource Requirements

```yaml
# Minimum production requirements
compute:
  cpu: 8 vCPUs
  memory: 16 GB RAM
  storage: 100 GB SSD

database:
  cpu: 4 vCPUs
  memory: 8 GB RAM
  storage: 200 GB SSD
  iops: 3000

cache:
  memory: 4 GB RAM
  persistence: enabled

vector_db:
  cpu: 2 vCPUs
  memory: 4 GB RAM
  storage: 50 GB SSD

# Recommended production requirements
compute:
  cpu: 16 vCPUs
  memory: 32 GB RAM
  storage: 500 GB SSD

database:
  cpu: 8 vCPUs
  memory: 16 GB RAM
  storage: 1 TB SSD
  iops: 10000
  read_replicas: 2

cache:
  memory: 8 GB RAM
  persistence: enabled
  cluster_mode: true
  nodes: 3

vector_db:
  cpu: 4 vCPUs
  memory: 8 GB RAM
  storage: 200 GB SSD
  replicas: 2
```

### Environment Configuration

#### Environment Variables

```bash
# Core configuration
MEMORAI_ENV=production
MEMORAI_PORT=3001
MEMORAI_HOST=0.0.0.0

# Database configuration
DATABASE_URL=postgresql://memorai:password@localhost:5432/memorai
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Cache configuration
REDIS_URL=redis://localhost:6379
REDIS_CLUSTER_MODE=true
REDIS_PASSWORD=your_redis_password

# Vector database configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=memorai_embeddings

# Security configuration
JWT_SECRET=your_jwt_secret_256_bits
ENCRYPTION_KEY=your_encryption_key_256_bits
SESSION_SECRET=your_session_secret

# External services
OPENAI_API_KEY=your_openai_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Monitoring configuration
PROMETHEUS_ENDPOINT=http://prometheus:9090
GRAFANA_ENDPOINT=http://grafana:3000
JAEGER_ENDPOINT=http://jaeger:14268

# Feature flags
ENABLE_AI_FEATURES=true
ENABLE_ANALYTICS=true
ENABLE_AUDIT_LOGGING=true
ENABLE_RATE_LIMITING=true

# Performance tuning
MAX_MEMORY_SIZE=512mb
MAX_CONCURRENT_REQUESTS=1000
CACHE_TTL=3600
QUERY_TIMEOUT=30000
```

### Database Setup

#### PostgreSQL Setup

```sql
-- Create database and user
CREATE DATABASE memorai;
CREATE USER memorai WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE memorai TO memorai;

-- Connect to memorai database
\c memorai

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS memorai;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Set default search path
ALTER DATABASE memorai SET search_path TO memorai, public;

-- Performance optimizations
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
```

#### Database Migration

```bash
# Run migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed

# Create indexes
pnpm db:index

# Verify setup
pnpm db:verify
```

#### Qdrant Setup

```bash
# Start Qdrant with custom configuration
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  -v $(pwd)/qdrant_config.yaml:/qdrant/config/production.yaml \
  qdrant/qdrant:latest

# Create collection
curl -X PUT 'http://localhost:6333/collections/memorai_embeddings' \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    },
    "optimizers_config": {
      "default_segment_number": 2,
      "max_segment_size": 20000,
      "memmap_threshold": 50000
    },
    "replication_factor": 2,
    "write_consistency_factor": 1
  }'
```

## 🚢 Deployment Procedures

### Kubernetes Deployment

#### 1. Namespace and RBAC Setup

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: memorai-production
  labels:
    name: memorai-production
    environment: production

---
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: memorai-sa
  namespace: memorai-production

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: memorai-role
rules:
  - apiGroups: ['']
    resources: ['pods', 'services', 'endpoints']
    verbs: ['get', 'list', 'watch']
  - apiGroups: ['apps']
    resources: ['deployments', 'replicasets']
    verbs: ['get', 'list', 'watch']

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: memorai-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: memorai-role
subjects:
  - kind: ServiceAccount
    name: memorai-sa
    namespace: memorai-production
```

#### 2. ConfigMaps and Secrets

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: memorai-config
  namespace: memorai-production
data:
  MEMORAI_ENV: 'production'
  MEMORAI_PORT: '3001'
  DATABASE_POOL_SIZE: '20'
  REDIS_CLUSTER_MODE: 'true'
  ENABLE_AI_FEATURES: 'true'
  MAX_CONCURRENT_REQUESTS: '1000'

---
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: memorai-secrets
  namespace: memorai-production
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  REDIS_URL: <base64-encoded-redis-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  OPENAI_API_KEY: <base64-encoded-openai-key>
```

#### 3. Application Deployments

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: memorai-api
  namespace: memorai-production
  labels:
    app: memorai-api
    version: v3.2.0
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: memorai-api
  template:
    metadata:
      labels:
        app: memorai-api
        version: v3.2.0
    spec:
      serviceAccountName: memorai-sa
      containers:
        - name: memorai-api
          image: memorai/api:3.2.0
          ports:
            - containerPort: 3001
          envFrom:
            - configMapRef:
                name: memorai-config
            - secretRef:
                name: memorai-secrets
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '1Gi'
              cpu: '1000m'
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

---
# api-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: memorai-api-service
  namespace: memorai-production
  labels:
    app: memorai-api
spec:
  selector:
    app: memorai-api
  ports:
    - name: http
      port: 80
      targetPort: 3001
      protocol: TCP
  type: ClusterIP

---
# api-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: memorai-api-hpa
  namespace: memorai-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: memorai-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

#### 4. Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: memorai-ingress
  namespace: memorai-production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: '100'
    nginx.ingress.kubernetes.io/rate-limit-window: '1m'
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    nginx.ingress.kubernetes.io/force-ssl-redirect: 'true'
spec:
  tls:
    - hosts:
        - api.memorai.com
        - dashboard.memorai.com
      secretName: memorai-tls
  rules:
    - host: api.memorai.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: memorai-api-service
                port:
                  number: 80
    - host: dashboard.memorai.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: memorai-dashboard-service
                port:
                  number: 80
```

### Deployment Commands

#### Manual Deployment

```bash
# Build and push images
docker build -t memorai/api:3.2.0 .
docker push memorai/api:3.2.0

# Apply Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/rbac.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress.yaml

# Verify deployment
kubectl get pods -n memorai-production
kubectl get services -n memorai-production
kubectl get ingress -n memorai-production
```

#### CI/CD Deployment

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test:ci

      - name: Build application
        run: pnpm build

      - name: Build Docker images
        run: |
          docker build -t memorai/api:${{ github.sha }} .
          docker build -t memorai/dashboard:${{ github.sha }} -f apps/dashboard/Dockerfile .

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push memorai/api:${{ github.sha }}
          docker push memorai/dashboard:${{ github.sha }}

      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v1
        with:
          manifests: |
            k8s/deployments/api-deployment.yaml
            k8s/deployments/dashboard-deployment.yaml
          images: |
            memorai/api:${{ github.sha }}
            memorai/dashboard:${{ github.sha }}
          kubectl-version: 'latest'

      - name: Verify deployment
        run: |
          kubectl rollout status deployment/memorai-api -n memorai-production
          kubectl rollout status deployment/memorai-dashboard -n memorai-production

      - name: Run smoke tests
        run: pnpm test:smoke --base-url=https://api.memorai.com

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed successfully!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## ⚙️ Operational Procedures

### Health Monitoring

#### Health Check Endpoints

```typescript
// Health check implementation
export const healthRoutes = {
  // Basic health check
  '/health': {
    handler: async () => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.MEMORAI_VERSION,
    }),
  },

  // Detailed readiness check
  '/ready': {
    handler: async () => {
      const checks = await Promise.allSettled([
        checkDatabase(),
        checkRedis(),
        checkQdrant(),
        checkExternalServices(),
      ]);

      const isReady = checks.every(check => check.status === 'fulfilled');

      return {
        status: isReady ? 'ready' : 'not ready',
        checks: checks.map((check, i) => ({
          name: ['database', 'redis', 'qdrant', 'external'][i],
          status: check.status,
          ...(check.status === 'rejected' && { error: check.reason.message }),
        })),
        timestamp: new Date().toISOString(),
      };
    },
  },

  // Live probe
  '/live': {
    handler: async () => ({
      status: 'alive',
      pid: process.pid,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    }),
  },
};
```

#### Monitoring Configuration

```yaml
# Prometheus configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'memorai_rules.yml'

scrape_configs:
  - job_name: 'memorai-api'
    static_configs:
      - targets: ['memorai-api:3001']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'memorai-dashboard'
    static_configs:
      - targets: ['memorai-dashboard:3000']
    metrics_path: '/api/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

### Backup Procedures

#### Database Backup

```bash
#!/bin/bash
# backup-database.sh

set -e

BACKUP_DIR="/backups/memorai"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="memorai_backup_${TIMESTAMP}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump \
  --host=$DB_HOST \
  --port=$DB_PORT \
  --username=$DB_USER \
  --dbname=$DB_NAME \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/$BACKUP_FILE"

# Encrypt backup
gpg --cipher-algo AES256 \
    --compress-algo 1 \
    --symmetric \
    --output "$BACKUP_DIR/${BACKUP_FILE}.gpg" \
    "$BACKUP_DIR/$BACKUP_FILE"

# Remove unencrypted backup
rm "$BACKUP_DIR/$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_DIR/${BACKUP_FILE}.gpg" \
          "s3://memorai-backups/database/${BACKUP_FILE}.gpg"

# Clean up old local backups (keep last 7 days)
find $BACKUP_DIR -name "*.gpg" -mtime +7 -delete

echo "Database backup completed: $BACKUP_FILE"
```

#### Vector Database Backup

```bash
#!/bin/bash
# backup-qdrant.sh

set -e

BACKUP_DIR="/backups/qdrant"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="qdrant_backup_${TIMESTAMP}.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create snapshot
curl -X POST "http://qdrant:6333/collections/memorai_embeddings/snapshots"

# Wait for snapshot completion
sleep 30

# Download snapshot
SNAPSHOT_NAME=$(curl -s "http://qdrant:6333/collections/memorai_embeddings/snapshots" | \
                jq -r '.result[-1].name')

curl -o "$BACKUP_DIR/snapshot.snapshot" \
     "http://qdrant:6333/collections/memorai_embeddings/snapshots/$SNAPSHOT_NAME"

# Compress and encrypt
tar -czf "$BACKUP_DIR/$BACKUP_FILE" -C "$BACKUP_DIR" snapshot.snapshot
gpg --symmetric --output "$BACKUP_DIR/${BACKUP_FILE}.gpg" "$BACKUP_DIR/$BACKUP_FILE"

# Clean up
rm "$BACKUP_DIR/snapshot.snapshot" "$BACKUP_DIR/$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_DIR/${BACKUP_FILE}.gpg" \
          "s3://memorai-backups/qdrant/${BACKUP_FILE}.gpg"

echo "Qdrant backup completed: $BACKUP_FILE"
```

### Restore Procedures

#### Database Restore

```bash
#!/bin/bash
# restore-database.sh

set -e

BACKUP_FILE=$1
RESTORE_TARGET=${2:-memorai_restored}

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file> [target_database]"
  exit 1
fi

# Download backup from S3
aws s3 cp "s3://memorai-backups/database/$BACKUP_FILE" "/tmp/$BACKUP_FILE"

# Decrypt backup
gpg --decrypt "/tmp/$BACKUP_FILE" > "/tmp/backup.sql"

# Create target database
createdb --host=$DB_HOST --port=$DB_PORT --username=$DB_USER $RESTORE_TARGET

# Restore database
pg_restore \
  --host=$DB_HOST \
  --port=$DB_PORT \
  --username=$DB_USER \
  --dbname=$RESTORE_TARGET \
  --format=custom \
  --jobs=4 \
  "/tmp/backup.sql"

# Clean up
rm "/tmp/$BACKUP_FILE" "/tmp/backup.sql"

echo "Database restored to: $RESTORE_TARGET"
```

### Scaling Procedures

#### Horizontal Scaling

```bash
#!/bin/bash
# scale-application.sh

COMPONENT=$1
REPLICAS=$2

case $COMPONENT in
  api)
    kubectl scale deployment memorai-api --replicas=$REPLICAS -n memorai-production
    ;;
  dashboard)
    kubectl scale deployment memorai-dashboard --replicas=$REPLICAS -n memorai-production
    ;;
  worker)
    kubectl scale deployment memorai-worker --replicas=$REPLICAS -n memorai-production
    ;;
  *)
    echo "Usage: $0 {api|dashboard|worker} <replicas>"
    exit 1
    ;;
esac

# Wait for rollout
kubectl rollout status deployment/memorai-$COMPONENT -n memorai-production

echo "Scaled $COMPONENT to $REPLICAS replicas"
```

#### Database Scaling

```sql
-- Add read replica
SELECT pg_promote();

-- Create new read replica connection
-- Update application configuration with read replica endpoint

-- Vertical scaling (requires maintenance window)
-- 1. Create snapshot
-- 2. Restore to larger instance
-- 3. Update DNS/connection strings
-- 4. Switch traffic
```

### Security Operations

#### Certificate Management

```bash
#!/bin/bash
# renew-certificates.sh

# Renew Let's Encrypt certificates
certbot renew --nginx --quiet

# Update Kubernetes secrets
kubectl create secret tls memorai-tls \
  --cert=/etc/letsencrypt/live/memorai.com/fullchain.pem \
  --key=/etc/letsencrypt/live/memorai.com/privkey.pem \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart ingress controller to pick up new certificates
kubectl rollout restart deployment nginx-ingress-controller -n ingress-nginx

echo "Certificates renewed and updated"
```

#### Security Scanning

```bash
#!/bin/bash
# security-scan.sh

# Scan Docker images
trivy image memorai/api:latest
trivy image memorai/dashboard:latest

# Scan Kubernetes manifests
trivy config k8s/

# Scan dependencies
npm audit --audit-level=high
pnpm audit --audit-level=high

# Network security scan
nmap -sS -O memorai.com

echo "Security scan completed"
```

### Disaster Recovery

#### Failover Procedure

```bash
#!/bin/bash
# failover-to-secondary.sh

set -e

echo "Starting failover to secondary region..."

# 1. Stop traffic to primary region
kubectl annotate ingress memorai-ingress \
  nginx.ingress.kubernetes.io/canary="true" \
  nginx.ingress.kubernetes.io/canary-weight="0" \
  -n memorai-production

# 2. Promote read replica to primary
aws rds promote-read-replica \
  --db-instance-identifier memorai-replica-us-west-2

# 3. Update DNS to point to secondary region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch file://dns-failover.json

# 4. Scale up secondary region
kubectl scale deployment memorai-api --replicas=5 -n memorai-production-west

# 5. Verify health
curl -f https://api-west.memorai.com/health

echo "Failover completed successfully"
```

#### Recovery Testing

```bash
#!/bin/bash
# test-disaster-recovery.sh

# Test backup restoration
./restore-database.sh memorai_backup_20250703_120000.sql.gpg memorai_test

# Test application startup with restored data
docker run --rm \
  -e DATABASE_URL=postgresql://memorai:password@localhost:5432/memorai_test \
  memorai/api:latest \
  node scripts/verify-data-integrity.js

# Test failover mechanism
./failover-to-secondary.sh --dry-run

echo "Disaster recovery test completed"
```

## 📊 Performance Optimization

### Database Optimization

#### Query Optimization

```sql
-- Analyze slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Create missing indexes
CREATE INDEX CONCURRENTLY idx_memories_user_created
ON memories(user_id, created_at DESC);

-- Optimize expensive queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM memories
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20;

-- Partition large tables
CREATE TABLE memories_2025_01
PARTITION OF memories
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

#### Connection Pool Tuning

```javascript
// Database pool configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Connection pool settings
  min: 5, // Minimum connections
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Wait 5s for connection
  acquireTimeoutMillis: 60000, // Wait 60s to acquire connection

  // Performance settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,

  // Health checks
  allowExitOnIdle: true,
});
```

### Application Performance

#### Caching Strategy

```typescript
// Multi-level caching implementation
class CacheManager {
  private l1Cache = new Map<string, any>(); // In-memory
  private l2Cache: Redis; // Redis cache
  private l3Cache: CDN; // CDN cache

  async get(key: string): Promise<any> {
    // L1: Check in-memory cache
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key);
    }

    // L2: Check Redis cache
    const redisValue = await this.l2Cache.get(key);
    if (redisValue) {
      this.l1Cache.set(key, redisValue);
      return redisValue;
    }

    // L3: Check CDN/database
    const dbValue = await this.fetchFromDatabase(key);
    if (dbValue) {
      await this.l2Cache.setex(key, 3600, dbValue);
      this.l1Cache.set(key, dbValue);
    }

    return dbValue;
  }

  async set(key: string, value: any, ttl = 3600): Promise<void> {
    this.l1Cache.set(key, value);
    await this.l2Cache.setex(key, ttl, value);
    await this.invalidateCDN(key);
  }
}
```

#### Request Optimization

```typescript
// Request batching and optimization
class OptimizedMemoryService {
  private requestQueue: Map<string, Promise<any>> = new Map();

  async getMemory(id: string): Promise<Memory> {
    // Deduplicate concurrent requests
    if (this.requestQueue.has(id)) {
      return this.requestQueue.get(id);
    }

    const promise = this.fetchMemory(id);
    this.requestQueue.set(id, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.requestQueue.delete(id);
    }
  }

  async getMemories(ids: string[]): Promise<Memory[]> {
    // Batch database requests
    const chunks = chunk(ids, 100);
    const results = await Promise.all(
      chunks.map(chunk => this.fetchMemoriesBatch(chunk))
    );
    return results.flat();
  }
}
```

## 🔧 Troubleshooting Guide

### Common Issues

#### 1. High Response Times

**Symptoms**: API response times > 100ms
**Diagnosis**:

```bash
# Check application metrics
curl -s http://localhost:3001/metrics | grep http_request_duration

# Check database performance
psql -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# Check Redis performance
redis-cli --latency-history -i 1
```

**Solutions**:

- Scale application horizontally
- Optimize database queries
- Increase cache hit rates
- Add database read replicas

#### 2. Memory Leaks

**Symptoms**: Increasing memory usage over time
**Diagnosis**:

```bash
# Monitor memory usage
kubectl top pods -n memorai-production

# Check Node.js heap usage
curl -s http://localhost:3001/health | jq '.memory'

# Generate heap dump
kill -USR2 $(pgrep node)
```

**Solutions**:

- Restart affected pods
- Review code for memory leaks
- Adjust garbage collection settings
- Implement memory limits

#### 3. Database Connection Issues

**Symptoms**: Connection timeout errors
**Diagnosis**:

```bash
# Check connection pool status
psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='memorai';"

# Check application logs
kubectl logs -f deployment/memorai-api -n memorai-production | grep -i connection
```

**Solutions**:

- Increase connection pool size
- Optimize long-running queries
- Implement connection retry logic
- Scale database resources

### Performance Monitoring

#### Key Metrics to Monitor

```yaml
# Application metrics
- http_request_duration_seconds
- http_requests_total
- memory_usage_bytes
- cpu_usage_seconds
- active_connections

# Database metrics
- postgres_connections_active
- postgres_query_duration_seconds
- postgres_cache_hit_ratio
- postgres_replication_lag

# Cache metrics
- redis_memory_usage_bytes
- redis_hit_ratio
- redis_connected_clients
- redis_operations_per_second

# System metrics
- node_cpu_usage_percent
- node_memory_usage_percent
- node_disk_usage_percent
- node_network_bytes
```

#### Alerting Rules

```yaml
# Critical alerts
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: 'High error rate detected'

- alert: DatabaseConnectionsExhausted
  expr: postgres_connections_active / postgres_connections_max > 0.9
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: 'Database connections near limit'

# Warning alerts
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: 'High response time detected'
```

---

**Document Version**: 1.0  
**Last Updated**: July 3, 2025  
**Next Review**: October 3, 2025  
**Document Owner**: Memorai DevOps Team  
**Approved By**: Head of Engineering, SRE Lead
