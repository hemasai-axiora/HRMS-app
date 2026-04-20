#!/bin/bash

echo "========================================"
echo "     HRMS AWS Cloud Setup"
echo "========================================"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI not installed"
    echo "Install: https://aws.amazon.com/cli/"
    exit 1
fi

echo "[1/8] Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com

echo "[2/8] Building Docker image..."
cd "$PROJECT_DIR"
docker build -t hrms-backend:$VERSION backend/
docker build -t hrms-frontend:$VERSION frontend/

echo "[3/8] Tagging images..."
docker tag hrms-backend:$VERSION $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/hrms-backend:$VERSION
docker tag hrms-frontend:$VERSION $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/hrms-frontend:$VERSION

echo "[4/8] Pushing to ECR..."
docker push $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/hrms-backend:$VERSION
docker push $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/hrms-frontend:$VERSION

echo "[5/8] Creating EFS for uploads..."
aws efs create-file-system --creation-token hrms-efs-token --region $AWS_REGION
echo "Note: Mount EFS to /app/uploads"

echo "[6/8] Creating RDS database..."
aws rds create-db-instance \
    --db-instance-identifier hrms-db \
    --db-instance-class db.t3.micro \
    --engine postgresql \
    --master-username postgres \
    --master-user-password $DB_PASSWORD \
    --allocated-storage 20 \
    --region $AWS_REGION

echo "[7/8] Creating ECS cluster..."
aws ecs create-cluster --cluster-name hrms-cluster --region $AWS_REGION

echo "[8/8] Creating Task Definitions..."
# Backend task
aws ecs register-task-definition \
    --family hrms-backend \
    --network-mode awsvpc \
    --container-definitions "[{\"name\":\"backend\",\"image\":\"$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/hrms-backend:$VERSION\",\"essential\":true,\"portMappings\":[{\"containerPort\":5000}],\"environment\":[{\"name\":\"DATABASE_URL\",\"value\":\"$DATABASE_URL\"},{\"name\":\"JWT_SECRET\",\"value\":\"$JWT_SECRET\"}]}]" \
    --region $AWS_REGION

# Frontend task
aws ecs register-task-definition \
    --family hrms-frontend \
    --network-mode awsvpc \
    --container-definitions "[{\"name\":\"frontend\",\"image\":\"$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/hrms-frontend:$VERSION\",\"essential\":true,\"portMappings\":[{\"containerPort\":3000}],\"environment\":[{\"name\":\"NEXT_PUBLIC_API_URL\",\"value\":\"https://$API_DOMAIN\"}]}]" \
    --region $AWS_REGION

echo ""
echo "========================================"
echo "AWS Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create ECS services for backend and frontend"
echo "2. Configure Application Load Balancer"
echo "3. Set up CloudFront for frontend"
echo "4. Update Route53 DNS records"
echo ""
echo "Run: aws ecs create-service --cluster hrms-cluster ..."