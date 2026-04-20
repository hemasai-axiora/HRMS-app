# HRMS - Cloud Hosting Guide

Deploy the HRMS application to AWS cloud using multiple deployment options.

## Deployment Options

1. **AWS ECS (Fargate)** - Containerized deployment
2. **AWS EC2** - Virtual machine deployment
3. **Render/Railway** - Simpler managed platforms
4. **Vercel + Railway** - Frontend + Database

---

## Option 1: AWS ECS (Fargate) - Recommended

### Prerequisites

- AWS Account
- AWS CLI configured
- ECR repositories created

### Step 1: Build and Push Docker Images

```bash
# Set environment variables
export AWS_REGION=us-east-1
export AWS_ACCOUNT=123456789012
export VERSION=1.0.0

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com

# Build images
docker build -t hrms-backend:$VERSION ./backend
docker build -t hrms-frontend:$VERSION ./frontend

# Tag for ECR
docker tag hrms-backend:$VERSION $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/hrms-backend:$VERSION
docker tag hrms-frontend:$VERSION $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/hrms-frontend:$VERSION

# Push to ECR
docker push $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/hrms-backend:$VERSION
docker push $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/hrms-frontend:$VERSION
```

### Step 2: Create RDS Database

```bash
# Create PostgreSQL RDS instance
aws rds create-db-instance \
    --db-instance-identifier hrms-prod-db \
    --db-instance-class db.t3.micro \
    --engine postgresql \
    --master-username postgres \
    --master-user-password 'YourSecurePassword123!' \
    --allocated-storage 20 \
    --region $AWS_REGION

# Wait for DB to be available
aws rds wait db-instance-available --db-instance-identifier hrms-prod-db --region $AWS_REGION

# Get endpoint
aws rds describe-db-instances --db-instance-identifier hrms-prod-db --query 'DBInstances[0].Endpoint.Address'
```

### Step 3: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster --cluster-name hrms-production

# Create security groups
aws ec2 create-security-group --group-name hrms-sg --description "HRMS Security Group"
aws ec2 authorize-security-group-ingress --group-name hrms-sg --protocol tcp --port 3000 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name hrms-sg --protocol tcp --port 5000 --cidr 0.0.0.0/0

# Register task definitions (see below)
```

### Step 4: Task Definitions

**Backend Task (hrms-backend.json):**
```json
{
  "family": "hrms-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [{
    "name": "backend",
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/hrms-backend:1.0.0",
    "essential": true,
    "portMappings": [{
      "containerPort": 5000,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "DATABASE_URL", "value": "postgresql://postgres:password@hrms-prod-db.xxxx.us-east-1.rds.amazonaws.com:5432/hrms"},
      {"name": "JWT_SECRET", "value": "your-secure-jwt-secret"},
      {"name": "PORT", "value": "5000"}
    ]
  }]
}
```

**Frontend Task (hrms-frontend.json):**
```json
{
  "family": "hrms-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [{
    "name": "frontend",
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/hrms-frontend:1.0.0",
    "essential": true,
    "portMappings": [{
      "containerPort": 3000,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "NEXT_PUBLIC_API_URL", "value": "https://api.yourdomain.com"}
    ]
  }]
}
```

### Step 5: Deploy Services

```bash
# Register task definitions
aws ecs register-task-definition --cli-input-json file://hrms-backend.json
aws ecs register-task-definition --cli-input-json file://hrms-frontend.json

# Create services
aws ecs create-service \
    --cluster hrms-production \
    --service-name hrms-backend \
    --task-definition hrms-backend \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx]}"

aws ecs create-service \
    --cluster hrms-production \
    --service-name hrms-frontend \
    --task-definition hrms-frontend \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx]}"
```

---

## Option 2: Render.com (Simplest)

### Step 1: Prepare Backend

```bash
# Create render.yaml in project root
```

**render.yaml:**
```yaml
services:
  - type: web
    name: hrms-backend
    env: node
    buildCommand: cd backend && npm install && npx prisma generate
    startCommand: cd backend && node src/index.js
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: hrms-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true

  - type: pserv
    name: hrms-db
    plan: free
    postgresMajorVersion: "14"
```

### Step 2: Deploy

```bash
# Connect GitHub repository to Render
# Or use CLI:
render deploy
```

---

## Option 3: Railway + Vercel

### Backend (Railway)

1. Create Railway account
2. Create new project
3. Add PostgreSQL plugin
4. Deploy from GitHub

**Railway Config:**
```toml
[build]
command = "cd backend && npm install && npx prisma generate"
builder = "nixpacks"

[deploy]
startCommand = "node src/index.js"
```

### Frontend (Vercel)

1. Create Vercel account
2. Import GitHub repo
3. Build command: `npm run build`
4. Output directory: `.next`
5. Environment variables:
   - `NEXT_PUBLIC_API_URL` = Your Railway backend URL

---

## Option 4: AWS EC2 Manual

### Step 1: Launch EC2 Instance

```bash
# Create key pair
aws ec2 create-key-pair --key-name hrms-key

# Launch instance
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.micro \
    --key-name hrms-key \
    --security-group-ids sg-xxx \
    --subnet-id subnet-xxx
```

### Step 2: Connect and Setup

```bash
ssh -i hrms-key.pem ec2-user@<instance-ip>

# Install Docker
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Clone project
git clone <your-repo>
cd hrms-application
```

### Step 3: Configure and Deploy

```bash
# Edit .env
nano backend/.env

# Update DATABASE_URL to point to RDS
# Or start local PostgreSQL with Docker

# Start with Docker Compose
docker-compose up -d
```

---

## Environment Variables for Production

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@host:5432/hrms
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
JWT_EXPIRES_IN=24h
PORT=5000
NODE_ENV=production
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NODE_ENV=production
```

---

## SSL/HTTPS Setup

### Option 1: AWS ALB + ACM

```bash
# Request SSL certificate
aws acm request-certificate \
    --domain-name yourdomain.com \
    --validation-method DNS

# Create Application Load Balancer
aws elbv2 create-load-balancer \
    --name hrms-alb \
    --scheme internet-facing \
    --type application \
    --subnets subnet-xxx subnet-yyy \
    --security-group sg-xxx

# Create target groups and listeners
```

### Option 2: CloudFront

```bash
# Create distribution for frontend
aws cloudfront create-distribution \
    --origin-domain-name your-backend.elb.amazonaws.com \
    --default-root-object index.html
```

---

## Domain Configuration

1. **Register Domain**: Route 53 or external registrar
2. **Create Record Sets**:
   - `api.yourdomain.com` → ALB/ELB
   - `yourdomain.com` → S3/CloudFront

---

## Monitoring & Logging

### CloudWatch Logs
```bash
# View container logs
aws logs tail /ecs/hrms-backend --follow
```

### ECS Service Metrics
- Monitor: CPU, Memory utilization
- Alarms: High usage notifications

---

## Backup Strategy

### RDS Automated Backups
```bash
# Enable backup retention
aws rds modify-db-instance \
    --db-instance-identifier hrms-prod-db \
    --backup-retention-period 7 \
    --apply-immediately
```

---

## Cost Estimation (Monthly)

| Service          | Configuration       | Approx Cost   |
|------------------|-------------------|---------------|
| ECS Fargate      | 2 tasks, 0.5 vCPU | $15-25/month |
| RDS PostgreSQL   | db.t3.micro       | $10-15/month  |
| ECR Storage      | ~1GB              | $1/month      |
| Data Transfer    | ~10GB             | $1/month      |
| ALB              | Standard          | $15-25/month  |
| CloudFront       | Pay per use       | $5/month      |
| Route53          | 1 hosted zone     | $0.50/month   |
| **Total**        |                   | **$47-72/month** |

---

## Security Checklist

- [ ] Enable RDS encryption
- [ ] Use IAM roles (not access keys)
- [ ] Restrict security group ports
- [ ] Enable CloudTrail logging
- [ ] Use secrets manager for credentials
- [ ] Enable VPC flow logs
- [ ] Regular security patches

---

## Quick Deploy Script

Use `backend/scripts/setup-aws.sh` for automated AWS deployment:

```bash
chmod +x backend/scripts/setup-aws.sh
./backend/scripts/setup-aws.sh
```
