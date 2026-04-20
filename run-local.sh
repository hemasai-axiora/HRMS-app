#!/bin/bash

echo "========================================="
echo "       HRMS Quick Start"
echo "========================================="
echo ""
echo "1. Docker Compose (Recommended)"
echo "2. Manual Setup"
echo "3. Cloud (AWS)"
echo ""
read -p "Choose option [1]: " choice
choice=${choice:-1}

case $choice in
    1)
        echo ""
        echo "Starting with Docker Compose..."
        docker-compose up -d
        echo ""
        echo "Frontend: http://localhost:3000"
        echo "Backend:  http://localhost:5000"
        ;;
    2)
        echo ""
        echo "Starting manually..."
        cd backend && node src/index.js &
        cd ../frontend && npm run dev
        ;;
    3)
        echo "./scripts/setup-aws.sh"
        ;;
esac