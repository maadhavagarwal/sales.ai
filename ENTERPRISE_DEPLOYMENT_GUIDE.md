# Enterprise Deployment & DevOps Guide

## Quick Start Production Deployment

### Prerequisites

```bash
# Required Tools
- Docker & Docker Compose 2.0+
- PostgreSQL 14+ 
- Node.js 18+ & npm
- Python 3.9+ & pip
- Git

# Check versions
docker --version      # Docker 20.10+
docker-compose --version  # 2.0+
node --version        # v18+
npm --version         # 8+
python --version      # 3.9+
```

---

## Phase 1: Environment Setup

### 1. Create .env.production

```bash
# Backend Configuration
ENVIRONMENT=production
DEBUG=false
JWT_SECRET_KEY=your-super-secret-key-here-change-this
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=postgresql://sales_user:secure_password@db:5432/sales_ai_db
SQLALCHEMY_POOL_SIZE=20
SQLALCHEMY_MAX_OVERFLOW=0

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_ENVIRONMENT=production

# Security
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
ALLOWED_HOSTS="yourdomain.com,www.yourdomain.com"

# Email Service (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Azure/Cloud Services (If using)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https...
AZURE_OPENAI_KEY=sk-...
AZURE_OPENAI_ENDPOINT=https://...

# Monitoring
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production

# Redis (For caching/sessions)
REDIS_URL=redis://redis:6379/0
```

### 2. Create docker-compose.prod.yml

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    container_name: sales_ai_db
    environment:
      POSTGRES_USER: sales_user
      POSTGRES_PASSWORD: ${DB_PASSWORD:-secure_password}
      POSTGRES_DB: sales_ai_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: always
    networks:
      - sales_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sales_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: sales_ai_redis
    ports:
      - "6379:6379"
    restart: always
    networks:
      - sales_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sales_ai_backend
    environment:
      - DATABASE_URL=postgresql://sales_user:${DB_PASSWORD:-secure_password}@db:5432/sales_ai_db
      - REDIS_URL=redis://redis:6379/0
      - ENVIRONMENT=production
      - DEBUG=false
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "8000:8000"
    restart: always
    networks:
      - sales_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - ./backend/logs:/app/logs

  # Frontend (Next.js)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://api.yourdomain.com
    container_name: sales_ai_frontend
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
      - NEXT_PUBLIC_ENVIRONMENT=production
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: always
    networks:
      - sales_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: sales_ai_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./ssl/cert.pem:/etc/nginx/ssl/cert.pem:ro
      - ./ssl/key.pem:/etc/nginx/ssl/key.pem:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - backend
      - frontend
    restart: always
    networks:
      - sales_network

volumes:
  postgres_data:
    driver: local
  nginx_logs:
    driver: local

networks:
  sales_network:
    driver: bridge
```

### 3. Update Dockerfile (Backend)

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 4. Update Dockerfile (Frontend)

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy node_modules and build from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Run Next.js
CMD ["npm", "start"]
```

### 5. Nginx Production Config

```nginx
# nginx.prod.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

    # Upstream definitions
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL certificates
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # SSL security
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # HSTS
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # API proxy
        location /api/ {
            limit_req zone=api burst=50 nodelay;

            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Frontend proxy
        location / {
            limit_req zone=general burst=20 nodelay;

            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://frontend;
            proxy_cache_valid 200 30d;
            add_header Cache-Control "public, max-age=2592000, immutable";
            add_header X-Cache-Status $upstream_cache_status;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

---

## Phase 2: Database Setup

### 1. Create PostgreSQL Init Script

```sql
-- init-db.sql
-- Create database
CREATE DATABASE IF NOT EXISTS sales_ai_db;

-- Connect to database
\c sales_ai_db

-- Create users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'SALES',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messaging tables
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY,
    title VARCHAR(255),
    is_group BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    user_id INTEGER REFERENCES users(id),
    is_pinned BOOLEAN DEFAULT FALSE,
    unread_count INTEGER DEFAULT 0,
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    sender_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create meetings tables
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    meeting_type VARCHAR(50),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meeting_attendees (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id),
    user_id INTEGER REFERENCES users(id),
    rsvp_status VARCHAR(50) DEFAULT 'pending',
    UNIQUE(meeting_id, user_id)
);

-- Create indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_meetings_start ON meetings(start_time);
CREATE INDEX idx_attendees_user ON meeting_attendees(user_id);

-- Insert sample data
INSERT INTO users (email, username, password_hash, first_name, last_name)
VALUES 
    ('admin@example.com', 'admin', 'hashed_password', 'Admin', 'User'),
    ('user1@example.com', 'user1', 'hashed_password', 'John', 'Doe'),
    ('user2@example.com', 'user2', 'hashed_password', 'Jane', 'Smith')
ON CONFLICT DO NOTHING;

-- Create extension for UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

GRANT ALL PRIVILEGES ON DATABASE sales_ai_db TO sales_user;
```

---

## Phase 3: Deployment Steps

### Using Docker Compose

```bash
# 1. Copy environment file
cp .env.example .env.production

# 2. Update .env.production with your settings
nano .env.production

# 3. Pull latest images
docker-compose -f docker-compose.prod.yml pull

# 4. Build services
docker-compose -f docker-compose.prod.yml build

# 5. Start services
docker-compose -f docker-compose.prod.yml up -d

# 6. Check logs
docker-compose -f docker-compose.prod.yml logs -f

# 7. Verify health
docker-compose -f docker-compose.prod.yml ps

# 8. Run migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 9. Create admin user (if needed)
docker-compose -f docker-compose.prod.yml exec backend python -m backend.scripts.create_admin
```

### Using Kubernetes (Advanced)

```bash
# Create namespace
kubectl create namespace sales-ai

# Create secrets
kubectl create secret generic db-credentials \
  --from-literal=username=sales_user \
  --from-literal=password=your_secure_password \
  -n sales-ai

# Deploy
kubectl apply -f k8s/ -n sales-ai

# Check deployment
kubectl get pods -n sales-ai
kubectl logs -n sales-ai deployment/backend
```

---

## Phase 4: Monitoring & Logging

### 1. Application Health Checks

```python
# backend/app/routes/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependency import get_db
import psutil

router = APIRouter(tags=["health"])

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Basic health check"""
    return {"status": "healthy"}

@router.get("/health/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check"""
    try:
        # Check database
        db.execute("SELECT 1")
        db_status = "healthy"
    except:
        db_status = "unhealthy"
    
    # Check memory
    memory = psutil.virtual_memory()
    memory_percent = memory.percent
    
    # Check disk
    disk = psutil.disk_usage('/')
    disk_percent = disk.percent
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "memory_usage": memory_percent,
        "disk_usage": disk_percent,
        "timestamp": datetime.utcnow().isoformat()
    }
```

### 2. Logging Configuration

```python
# backend/app/core/logging.py
import logging
from logging.handlers import RotatingFileHandler
import os

def setup_logging(log_level="INFO"):
    """Configure application logging"""
    
    # Create logs directory
    os.makedirs("logs", exist_ok=True)
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # File handler
    file_handler = RotatingFileHandler(
        "logs/app.log",
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    root_logger.addHandler(file_handler)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    root_logger.addHandler(console_handler)
```

---

## Phase 5: Security Hardening

### 1. SSL/TLS Certificates

```bash
# Using Let's Encrypt (Recommended)

# Install Certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com

# Verify certificate
ls -la /etc/letsencrypt/live/yourdomain.com/

# Copy to project
cp /etc/letsencrypt/live/yourdomain.com/cert.pem ./ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/key.pem

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 2. Secrets Management

```bash
# Create .env.production (never commit)
echo ".env.production" >> .gitignore

# Use environment variables
export DATABASE_URL="postgresql://..."
export JWT_SECRET_KEY="your-secret-key"

# Or use secret manager (AWS Secrets Manager, HashiCorp Vault, etc.)
```

### 3. Database Backups

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/postgresql"
DB_NAME="sales_ai_db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Full backup
pg_dump -Fc sales_ai_db > $BACKUP_DIR/sales_ai_db_$TIMESTAMP.dump

# Keep only last 7 days
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/sales_ai_db_$TIMESTAMP.dump"
```

Schedule with cron:
```bash
# Daily backup at 2 AM
0 2 * * * /home/user/backup.sh
```

---

## Phase 6: Performance Optimization

### 1. Database Query Optimization

```python
# Add query slow log
SQLALCHEMY_ECHO_POOL = True
SQLALCHEMY_ECHO = False  # Set to True for debugging

# Connection pooling
SQLALCHEMY_POOL_SIZE = 20
SQLALCHEMY_MAX_OVERFLOW = 0
SQLALCHEMY_POOL_RECYCLE = 3600
```

### 2. Caching Strategy

```python
# Redis caching
from functools import wraps
import redis
import json

redis_client = redis.Redis.from_url(REDIS_URL)

def cache_result(ttl_seconds=300):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{args}:{kwargs}"
            
            # Check cache
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            redis_client.setex(cache_key, ttl_seconds, json.dumps(result))
            
            return result
        return wrapper
    return decorator
```

### 3. API Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/messages/send")
@limiter.limit("10/minute")
async def send_message(...):
    pass
```

---

## Deployment Checklist

- [ ] Domain name purchased and configured
- [ ] SSL certificates generated and installed
- [ ] Database backups configured
- [ ] Environment variables set
- [ ] Docker images built and tested
- [ ] docker-compose.prod.yml configured
- [ ] Nginx configuration updated
- [ ] Health checks configured
- [ ] Logging set up
- [ ] Monitoring configured
- [ ] Monitoring alerts set up
- [ ] Rollback procedure documented
- [ ] Team trained on deployment process
- [ ] Documentation updated
- [ ] Load testing completed
- [ ] Security audit passed

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Rebuild image
docker-compose -f docker-compose.prod.yml build --no-cache backend

# Start with verbose output
docker-compose -f docker-compose.prod.yml up backend
```

### Database Connection Issues

```bash
# Test connection
docker-compose -f docker-compose.prod.yml exec db \
  psql -U sales_user -d sales_ai_db -c "SELECT 1"

# Check environment
docker-compose -f docker-compose.prod.yml exec backend \
  env | grep DATABASE
```

### API Response Timeout

```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Monitor resources
docker stats

# Check database slow queries
docker-compose -f docker-compose.prod.yml exec db \
  psql -U sales_user -d sales_ai_db -c "SELECT * FROM pg_stat_statements"
```

---

## Success Criteria

✅ All containers healthy  
✅ Frontend loads in < 2s  
✅ API responds in < 200ms  
✅ Database connections stable  
✅ Logs being collected  
✅ Backups running daily  
✅ SSL certificate valid  
✅ Health checks passing  

---

**Last Updated**: March 19, 2026  
**Version**: 1.0  
**Status**: Ready for Enterprise Deployment
