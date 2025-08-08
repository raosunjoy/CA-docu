#!/bin/bash

# Zetra Platform - Production Setup Script
# This script automates the production deployment process

set -e

echo "🚀 Starting Zetra Platform Production Setup..."

# Configuration
ENVIRONMENT=${1:-production}
NAMESPACE="zetra-${ENVIRONMENT}"
IMAGE_TAG=${2:-latest}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install Terraform first."
        exit 1
    fi
    
    log_info "Prerequisites check passed ✅"
}

setup_infrastructure() {
    log_info "Setting up infrastructure with Terraform..."
    
    cd infrastructure/terraform
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -var-file="${ENVIRONMENT}.tfvars" -out=tfplan
    
    # Apply infrastructure
    log_warn "About to create infrastructure. This will incur costs. Continue? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        terraform apply tfplan
        log_info "Infrastructure setup completed ✅"
    else
        log_warn "Infrastructure setup skipped"
        return 1
    fi
    
    cd ../..
}

setup_kubernetes() {
    log_info "Setting up Kubernetes resources..."
    
    # Create namespace
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply secrets (make sure secrets.yaml is configured)
    if [ -f "k8s/secrets-${ENVIRONMENT}.yaml" ]; then
        kubectl apply -f "k8s/secrets-${ENVIRONMENT}.yaml" -n ${NAMESPACE}
    else
        log_warn "Secrets file not found. Please create k8s/secrets-${ENVIRONMENT}.yaml"
    fi
    
    # Apply configmaps
    if [ -f "k8s/configmap-${ENVIRONMENT}.yaml" ]; then
        kubectl apply -f "k8s/configmap-${ENVIRONMENT}.yaml" -n ${NAMESPACE}
    fi
    
    log_info "Kubernetes setup completed ✅"
}

build_and_deploy() {
    log_info "Building and deploying application..."
    
    # Build Docker image
    log_info "Building Docker image..."
    docker build -t zetra-platform:${IMAGE_TAG} .
    
    # Tag for registry (update with your registry)
    REGISTRY=${DOCKER_REGISTRY:-"your-registry.com"}
    docker tag zetra-platform:${IMAGE_TAG} ${REGISTRY}/zetra-platform:${IMAGE_TAG}
    
    # Push to registry
    log_info "Pushing to registry..."
    docker push ${REGISTRY}/zetra-platform:${IMAGE_TAG}
    
    # Deploy to Kubernetes
    log_info "Deploying to Kubernetes..."
    envsubst < k8s/deployment.yaml | kubectl apply -f - -n ${NAMESPACE}
    kubectl apply -f k8s/service.yaml -n ${NAMESPACE}
    kubectl apply -f k8s/ingress.yaml -n ${NAMESPACE}
    
    # Wait for deployment
    log_info "Waiting for deployment to be ready..."
    kubectl rollout status deployment/zetra-app -n ${NAMESPACE} --timeout=600s
    
    log_info "Application deployment completed ✅"
}

setup_database() {
    log_info "Setting up database..."
    
    # Wait for app to be ready
    sleep 30
    
    # Run database migrations
    log_info "Running database migrations..."
    kubectl exec -n ${NAMESPACE} deployment/zetra-app -- npm run db:push
    
    # Seed initial data
    log_info "Seeding initial data..."
    kubectl exec -n ${NAMESPACE} deployment/zetra-app -- npm run db:seed
    
    log_info "Database setup completed ✅"
}

setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Deploy monitoring stack
    cd monitoring
    docker-compose up -d
    cd ..
    
    # Apply Kubernetes monitoring resources
    kubectl apply -f monitoring/k8s/ -n ${NAMESPACE}
    
    log_info "Monitoring setup completed ✅"
}

run_health_checks() {
    log_info "Running health checks..."
    
    # Get service URL
    SERVICE_URL=$(kubectl get ingress -n ${NAMESPACE} -o jsonpath='{.items[0].spec.rules[0].host}')
    
    if [ -z "$SERVICE_URL" ]; then
        log_warn "Could not determine service URL. Using port-forward for health check..."
        kubectl port-forward -n ${NAMESPACE} service/zetra-app 8080:80 &
        PORT_FORWARD_PID=$!
        sleep 5
        SERVICE_URL="localhost:8080"
        PROTOCOL="http"
    else
        PROTOCOL="https"
    fi
    
    # Health checks
    log_info "Checking application health..."
    if curl -f "${PROTOCOL}://${SERVICE_URL}/api/health" > /dev/null 2>&1; then
        log_info "Application health check passed ✅"
    else
        log_error "Application health check failed ❌"
        return 1
    fi
    
    log_info "Checking database connectivity..."
    if curl -f "${PROTOCOL}://${SERVICE_URL}/api/health/db" > /dev/null 2>&1; then
        log_info "Database health check passed ✅"
    else
        log_error "Database health check failed ❌"
        return 1
    fi
    
    # Clean up port-forward if used
    if [ ! -z "$PORT_FORWARD_PID" ]; then
        kill $PORT_FORWARD_PID
    fi
    
    log_info "All health checks passed ✅"
}

cleanup_on_error() {
    log_error "Setup failed. Cleaning up..."
    
    # Clean up port-forward if running
    if [ ! -z "$PORT_FORWARD_PID" ]; then
        kill $PORT_FORWARD_PID
    fi
    
    # Optionally rollback deployment
    log_warn "Do you want to rollback the deployment? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        kubectl delete namespace ${NAMESPACE} --ignore-not-found=true
        log_info "Rollback completed"
    fi
}

# Main execution
main() {
    log_info "Starting production setup for environment: ${ENVIRONMENT}"
    
    # Set up error handling
    trap cleanup_on_error ERR
    
    # Run setup steps
    check_prerequisites
    
    log_warn "This will set up production infrastructure. Continue? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Setup cancelled by user"
        exit 0
    fi
    
    setup_infrastructure
    setup_kubernetes
    build_and_deploy
    setup_database
    setup_monitoring
    run_health_checks
    
    log_info "🎉 Production setup completed successfully!"
    log_info "Your Zetra Platform is now running at: https://${SERVICE_URL}"
    log_info ""
    log_info "Next steps:"
    log_info "1. Configure DNS to point to your load balancer"
    log_info "2. Set up SSL certificates"
    log_info "3. Create initial admin user"
    log_info "4. Configure monitoring alerts"
    log_info "5. Run user acceptance testing"
    log_info ""
    log_info "For support, check the documentation at docs/"
}

# Script usage
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [environment] [image_tag]"
    echo ""
    echo "Arguments:"
    echo "  environment  Target environment (default: production)"
    echo "  image_tag    Docker image tag (default: latest)"
    echo ""
    echo "Examples:"
    echo "  $0 production v1.0.0"
    echo "  $0 staging latest"
    echo ""
    echo "Prerequisites:"
    echo "  - kubectl configured for target cluster"
    echo "  - Docker installed and configured"
    echo "  - Terraform installed"
    echo "  - Environment-specific configuration files"
    exit 0
fi

# Run main function
main "$@"