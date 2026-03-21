# NeuralBI Platform - Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the NeuralBI Platform to production environments using Docker and cloud infrastructure.

## Prerequisites

- Docker and Docker Compose installed
- Git repository access
- Cloud provider account (AWS/Azure/GCP)
- Domain name and SSL certificates
- Environment variables configured

## Quick Start with Docker Compose

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/neuralbi-platform.git
cd neuralbi-platform
```

### 2. Configure Environment Variables

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your production values:

```bash
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/neuralbi_prod
POSTGRES_DB=neuralbi_prod
POSTGRES_USER=neuralbi_user
POSTGRES_PASSWORD=your_secure_password

# Redis
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET_KEY=your_256_bit_secret_key_here
ENCRYPTION_KEY=your_32_byte_encryption_key

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD=secure_admin_password

# ERP Integrations
TALLY_API_KEY=your-tally-api-key
ZOHO_API_KEY=your-zoho-api-key

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 3. Initialize Database

```bash
docker-compose -f docker-compose.prod.yml up postgres -d
docker-compose -f docker-compose.prod.yml exec postgres psql -U neuralbi_user -d neuralbi_prod -f /docker-entrypoint-initdb.d/init-db.sql
```

### 4. Deploy the Application

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Verify Deployment

```bash
# Check service health
curl http://localhost/health

# Check application
curl http://localhost

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Cloud Deployment Options

### AWS ECS Fargate

#### 1. Create ECR Repositories

```bash
aws ecr create-repository --repository-name neuralbi-backend --region us-east-1
aws ecr create-repository --repository-name neuralbi-frontend --region us-east-1
```

#### 2. Build and Push Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
docker build -t neuralbi-backend .
docker tag neuralbi-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/neuralbi-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/neuralbi-backend:latest

# Build and push frontend
cd frontend
docker build -t neuralbi-frontend .
docker tag neuralbi-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/neuralbi-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/neuralbi-frontend:latest
```

#### 3. Create ECS Cluster and Services

Use the provided CloudFormation template or Terraform configuration to create:

- ECS cluster
- Task definitions
- Services with load balancers
- RDS PostgreSQL database
- ElastiCache Redis
- Application Load Balancer

### Azure Container Apps

#### 1. Create Resource Group

```bash
az group create --name neuralbi-rg --location eastus
```

#### 2. Create Container Registry

```bash
az acr create --resource-group neuralbi-rg --name neuralbiacr --sku Basic
```

#### 3. Build and Push Images

```bash
# Login to ACR
az acr login --name neuralbiacr

# Build and push
docker build -t neuralbiacr.azurecr.io/neuralbi-backend:latest .
docker push neuralbiacr.azurecr.io/neuralbi-backend:latest
```

#### 4. Deploy to Container Apps

```bash
# Create environment
az containerapp env create --name neuralbi-env --resource-group neuralbi-rg --location eastus

# Deploy backend
az containerapp create --name neuralbi-backend --resource-group neuralbi-rg --environment neuralbi-env --image neuralbiacr.azurecr.io/neuralbi-backend:latest --target-port 8000 --ingress external

# Deploy frontend
az containerapp create --name neuralbi-frontend --resource-group neuralbi-rg --environment neuralbi-env --image neuralbiacr.azurecr.io/neuralbi-frontend:latest --target-port 3000 --ingress external
```

### Google Cloud Run

#### 1. Create Artifact Registry

```bash
gcloud artifacts repositories create neuralbi-repo --repository-format=docker --location=us-central1
```

#### 2. Build and Push Images

```bash
# Build and push
gcloud builds submit --tag gcr.io/<project-id>/neuralbi-backend
gcloud builds submit --tag gcr.io/<project-id>/neuralbi-frontend ./frontend
```

#### 3. Deploy to Cloud Run

```bash
# Deploy backend
gcloud run deploy neuralbi-backend --image gcr.io/<project-id>/neuralbi-backend --platform managed --region us-central1 --allow-unauthenticated --port 8000

# Deploy frontend
gcloud run deploy neuralbi-frontend --image gcr.io/<project-id>/neuralbi-frontend --platform managed --region us-central1 --allow-unauthenticated --port 3000
```

## SSL/TLS Configuration

### Using Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Configure nginx with SSL
server {
    listen 443 ssl http2;
    server_name yourdomain.com api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # ... rest of configuration
}
```

### Using Cloud Load Balancers

- **AWS ALB**: Configure SSL/TLS listeners
- **Azure Application Gateway**: Add SSL certificates
- **GCP Load Balancer**: Configure SSL certificates

## Monitoring and Observability

### Accessing Grafana

1. Open Grafana at `http://localhost:3001`
2. Default credentials: admin / `${GRAFANA_ADMIN_PASSWORD}`
3. Import the NeuralBI dashboard from `/monitoring/grafana/provisioning/dashboards/`

### Accessing Prometheus

1. Open Prometheus at `http://localhost:9090`
2. View metrics and configure alerts

### Setting up Alerts

Configure alerting rules in Prometheus for:
- High CPU/memory usage
- Database connection issues
- API response times
- Error rates

## Backup and Recovery

### Database Backups

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/neuralbi_backup_$DATE.sql"

pg_dump -h postgres -U neuralbi_user -d neuralbi_prod > $BACKUP_FILE
gzip $BACKUP_FILE
```

### File Storage Backups

```bash
# Backup uploaded files
aws s3 sync /app/uploads s3://neuralbi-backups/uploads/
aws s3 sync /app/models s3://neuralbi-backups/models/
```

## Scaling Considerations

### Horizontal Scaling

- Increase ECS task count or Container App replicas
- Use load balancer for distribution
- Implement Redis clustering for cache scaling

### Database Scaling

- Use RDS read replicas for read-heavy workloads
- Implement connection pooling
- Consider database sharding for large datasets

### Performance Optimization

- Enable CDN for static assets
- Implement caching strategies
- Use database indexes effectively
- Monitor and optimize slow queries

## Security Best Practices

### Network Security

- Use VPC/security groups
- Implement WAF rules
- Enable encryption in transit and at rest

### Application Security

- Keep dependencies updated
- Use secret management services
- Implement rate limiting
- Regular security audits

### Access Control

- Use IAM roles and policies
- Implement least privilege access
- Regular credential rotation

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check database connectivity
   docker-compose exec postgres pg_isready -U neuralbi_user -d neuralbi_prod
   ```

2. **Container Health Checks**
   ```bash
   # Check container logs
   docker-compose logs backend
   docker-compose logs frontend
   ```

3. **Performance Issues**
   - Monitor resource usage with Grafana
   - Check slow query logs
   - Review application metrics

### Logs and Debugging

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Access container shell
docker-compose exec backend bash
```

## Maintenance

### Regular Tasks

- Update Docker images monthly
- Rotate database credentials quarterly
- Review and update dependencies
- Monitor disk space and clean up old logs

### Updates and Patches

```bash
# Update application
git pull origin main
docker-compose build
docker-compose up -d

# Update dependencies
docker-compose exec backend pip install -r requirements.txt --upgrade
docker-compose exec frontend npm update
```

## Support

For production support and issues:
- Check the troubleshooting guide
- Review application logs
- Contact the development team
- Check GitHub issues for known problems

---

**Note**: This deployment guide assumes a basic understanding of Docker, cloud platforms, and DevOps practices. For complex deployments, consider consulting with a DevOps engineer or using managed services.