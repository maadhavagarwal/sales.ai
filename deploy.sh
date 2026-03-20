#!/bin/bash

# Advanced Sales AI Platform Deployment Script
# This script automates deployment to multiple cloud platforms

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    dependencies=("docker" "docker-compose" "python" "pip" "npm" "node")
    missing=()
    
    for cmd in "${dependencies[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            missing+=($cmd)
        fi
    done
    
    if [ ${#missing[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing[@]}"
        print_status "Install them and try again"
        exit 1
    fi
    
    print_success "All dependencies installed"
}

# Build services
build_services() {
    print_status "Building Docker services..."
    
    docker-compose -f docker-compose.advanced.yml build --no-cache
    
    print_success "Services built successfully"
}

# Start services
start_services() {
    print_status "Starting services with docker-compose..."
    
    docker-compose -f docker-compose.advanced.yml up -d
    
    sleep 5
    
    # Check health
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_warning "Backend is starting (may take 30 seconds)"
    fi
    
    print_success "All services started"
}

# Install Python dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    
    cd backend
    pip install -r requirements.txt
    cd ..
    
    print_success "Backend dependencies installed"
}

# Install frontend dependencies
install_frontend_deps() {
    print_status "Installing frontend dependencies..."
    
    cd frontend
    npm install
    cd ..
    
    print_success "Frontend dependencies installed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    cd backend
    python -m pytest --tb=short -v
    cd ..
    
    print_success "All tests passed"
}

# Deploy to Azure
deploy_azure() {
    print_status "Deploying to Azure..."
    
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI not installed. Install it: https://learn.microsoft.com/cli/azure/install-azure-cli"
        exit 1
    fi
    
    # Create deployment
    az deployment group create \
        --resource-group neuralbί-rg \
        --template-file azure-deploy.json \
        --parameters azureEnvironment=prod
    
    print_success "Deployed to Azure"
}

# Deploy to AWS
deploy_aws() {
    print_status "Deploying to AWS..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not installed. Install it: https://aws.amazon.com/cli/"
        exit 1
    fi
    
    # Deploy using CloudFormation
    aws cloudformation deploy \
        --template-file aws-cloudformation.yml \
        --stack-name sales-ai-platform \
        --parameter-overrides Environment=production
    
    print_success "Deployed to AWS"
}

# Deploy to Render
deploy_render() {
    print_status "Deploying to Render..."
    
    # Install Render CLI
    npm install -g @render-api/cli
    
    # Push to GitHub (prerequisite)
    print_warning "Make sure your code is pushed to GitHub first"
    
    # Create render.yaml if it doesn't exist
    if [ ! -f "render.yaml" ]; then
        print_status "Creating render.yaml..."
        cat > render.yaml << 'EOF'
services:
  - type: web
    name: sales-ai-backend
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    rootDir: backend
    envVars:
      - key: DATABASE_URL
        value: postgresql://...
      - key: REDIS_URL
        value: redis://...
  
  - type: web
    name: sales-ai-frontend
    env: node
    buildCommand: "cd frontend && npm install && npm run build"
    startCommand: "cd frontend && npm start"
    envVars:
      - key: NEXT_PUBLIC_API_URL
        value: https://sales-ai-backend.onrender.com

  - type: pserv
    name: sales-ai-db
    plan: standard
    ipAllowList: []
EOF
    fi
    
    print_success "render.yaml configured. Deploy via Render dashboard"
}

# Output deployment info
show_deployment_info() {
    print_status "Deployment Information:"
    echo ""
    echo "  Backend API:    http://localhost:8000"
    echo "  Frontend:       http://localhost:3000"
    echo "  API Docs:       http://localhost:8000/docs"
    echo "  Redis:          localhost:6379"
    echo "  PostgreSQL:     localhost:5432"
    echo ""
    echo "  Admin Commands:"
    echo "    Celery Worker:  docker-compose -f docker-compose.advanced.yml logs celery-worker"
    echo "    Health Check:   curl http://localhost:8000/health"
    echo "    Stop Services:  docker-compose -f docker-compose.advanced.yml down"
    echo ""
}

# Main menu
show_menu() {
    clear
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Sales AI Platform - Advanced Deployment Script        ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "1) Full Setup (dependencies + build + start)"
    echo "2) Build Docker Services"
    echo "3) Start Services (docker-compose)"
    echo "4) Run Tests"
    echo "5) Stop Services"
    echo "6) View Logs"
    echo "7) Deploy to Azure"
    echo "8) Deploy to AWS"
    echo "9) Deploy to Render"
    echo "10) Health Check"
    echo "11) Exit"
    echo ""
}

# Health check
health_check() {
    print_status "Running health check..."
    echo ""
    
    services=("Backend" "Frontend" "Redis" "PostgreSQL")
    urls=("http://localhost:8000/health" "http://localhost:3000" "localhost:6379" "localhost:5432")
    
    for i in "${!services[@]}"; do
        service="${services[$i]}"
        url="${urls[$i]}"
        
        if [[ $service == "Redis" ]]; then
            if redis-cli -p 6379 ping > /dev/null 2>&1; then
                print_success "$service is running"
            else
                print_error "$service is not responding"
            fi
        elif [[ $service == "PostgreSQL" ]]; then
            if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
                print_success "$service is running"
            else
                print_error "$service is not responding"
            fi
        else
            if curl -f "$url" > /dev/null 2>&1; then
                print_success "$service is running"
            else
                print_error "$service is not responding"
            fi
        fi
    done
    echo ""
}

# View logs
view_logs() {
    echo "1) Backend"
    echo "2) Frontend"
    echo "3) Celery Worker"
    echo "4) All Services"
    read -p "Select service: " choice
    
    case $choice in
        1) docker-compose -f docker-compose.advanced.yml logs -f backend ;;
        2) docker-compose -f docker-compose.advanced.yml logs -f frontend ;;
        3) docker-compose -f docker-compose.advanced.yml logs -f celery-worker ;;
        4) docker-compose -f docker-compose.advanced.yml logs -f ;;
        *) print_error "Invalid choice" ;;
    esac
}

# Main loop
while true; do
    show_menu
    read -p "Select option (1-11): " choice
    
    case $choice in
        1)
            check_dependencies
            install_backend_deps
            install_frontend_deps
            build_services
            start_services
            show_deployment_info
            ;;
        2)
            build_services
            ;;
        3)
            start_services
            show_deployment_info
            ;;
        4)
            run_tests
            ;;
        5)
            docker-compose -f docker-compose.advanced.yml down
            print_success "Services stopped"
            ;;
        6)
            view_logs
            read -p "Press Enter to continue..."
            ;;
        7)
            deploy_azure
            ;;
        8)
            deploy_aws
            ;;
        9)
            deploy_render
            ;;
        10)
            health_check
            read -p "Press Enter to continue..."
            ;;
        11)
            print_success "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            sleep 1
            ;;
    esac
done
