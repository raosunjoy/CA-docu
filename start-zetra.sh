#!/bin/bash

# Zetra Platform Startup Script
# Comprehensive startup script for Zetra CA Platform
# Handles database servers, backend services, and frontend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Zetra Platform"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
PID_DIR="$PROJECT_DIR/pids"

# Default ports
POSTGRES_PORT=5433
REDIS_PORT=6379
ELASTICSEARCH_PORT=9200
FRONTEND_PORT=3000
PRISMA_STUDIO_PORT=5555

# Service flags
START_POSTGRES=true
START_REDIS=false
START_ELASTICSEARCH=false
START_FRONTEND=true
START_PRISMA_STUDIO=false
DEVELOPMENT_MODE=true

# Log function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

header() {
    echo -e "${PURPLE}
╔══════════════════════════════════════════════════════════════════════════════╗
║                         $PROJECT_NAME Startup Script                          ║
╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
}

# Create directories
create_directories() {
    log "Creating necessary directories..."
    mkdir -p "$LOG_DIR" "$PID_DIR"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if port is in use
port_in_use() {
    lsof -i ":$1" >/dev/null 2>&1
}

# Wait for service to be ready
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=${4:-30}
    local attempt=1
    
    info "Waiting for $service_name to be ready on $host:$port..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" >/dev/null 2>&1; then
            log "$service_name is ready!"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "$service_name failed to start after $max_attempts attempts"
            return 1
        fi
        
        info "Attempt $attempt/$max_attempts - waiting for $service_name..."
        sleep 2
        ((attempt++))
    done
}

# Kill existing processes
cleanup_processes() {
    log "Cleaning up existing processes..."
    
    # Kill Next.js dev servers
    pkill -f "next dev" 2>/dev/null || true
    
    # Kill Prisma Studio
    pkill -f "prisma studio" 2>/dev/null || true
    
    # Clean up PID files
    rm -f "$PID_DIR"/*.pid
    
    sleep 2
    log "Cleanup completed"
}

# Start PostgreSQL
start_postgresql() {
    if [ "$START_POSTGRES" = false ]; then
        return 0
    fi
    
    log "Starting PostgreSQL..."
    
    if ! command_exists psql; then
        warn "PostgreSQL client (psql) not found. Attempting to start via Homebrew..."
    fi
    
    if command_exists brew; then
        # Check if PostgreSQL service is running
        if brew services list | grep -q "postgresql.*started"; then
            info "PostgreSQL is already running"
        else
            log "Starting PostgreSQL via Homebrew..."
            brew services start postgresql@15 || brew services start postgresql
        fi
    else
        error "Homebrew not found. Please ensure PostgreSQL is installed and running"
        return 1
    fi
    
    # Wait for PostgreSQL to be ready
    wait_for_service "localhost" "$POSTGRES_PORT" "PostgreSQL"
    
    # Test database connection
    log "Testing database connection..."
    if npm run db:push >/dev/null 2>&1; then
        log "Database schema synced successfully"
    else
        warn "Database schema sync failed, but continuing..."
    fi
}

# Start Redis (optional)
start_redis() {
    if [ "$START_REDIS" = false ]; then
        return 0
    fi
    
    log "Starting Redis..."
    
    if command_exists brew && brew services list | grep -q "redis.*stopped"; then
        brew services start redis
        wait_for_service "localhost" "$REDIS_PORT" "Redis"
    elif port_in_use "$REDIS_PORT"; then
        info "Redis is already running"
    else
        warn "Redis not found or not configured to start"
    fi
}

# Start Elasticsearch (optional)
start_elasticsearch() {
    if [ "$START_ELASTICSEARCH" = false ]; then
        return 0
    fi
    
    log "Starting Elasticsearch..."
    
    if command_exists brew && brew services list | grep -q "elasticsearch.*stopped"; then
        brew services start elasticsearch
        wait_for_service "localhost" "$ELASTICSEARCH_PORT" "Elasticsearch" 60
    elif port_in_use "$ELASTICSEARCH_PORT"; then
        info "Elasticsearch is already running"
    else
        warn "Elasticsearch not found or not configured to start"
    fi
}

# Install dependencies
install_dependencies() {
    log "Checking and installing dependencies..."
    
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log "Installing/updating npm dependencies..."
        npm install
    else
        info "Dependencies are up to date"
    fi
}

# Generate Prisma client
generate_prisma() {
    log "Generating Prisma client..."
    npm run db:generate
}

# Start Prisma Studio (optional)
start_prisma_studio() {
    if [ "$START_PRISMA_STUDIO" = false ]; then
        return 0
    fi
    
    log "Starting Prisma Studio..."
    
    if port_in_use "$PRISMA_STUDIO_PORT"; then
        warn "Prisma Studio port $PRISMA_STUDIO_PORT is already in use"
        return 1
    fi
    
    nohup npm run db:studio > "$LOG_DIR/prisma-studio.log" 2>&1 &
    echo $! > "$PID_DIR/prisma-studio.pid"
    
    wait_for_service "localhost" "$PRISMA_STUDIO_PORT" "Prisma Studio"
    log "Prisma Studio started at http://localhost:$PRISMA_STUDIO_PORT"
}

# Start Frontend (Next.js)
start_frontend() {
    if [ "$START_FRONTEND" = false ]; then
        return 0
    fi
    
    log "Starting Next.js frontend..."
    
    if port_in_use "$FRONTEND_PORT"; then
        warn "Frontend port $FRONTEND_PORT is already in use. Trying next available port..."
    fi
    
    # Set environment variables for development
    export NODE_ENV=development
    export PORT=$FRONTEND_PORT
    
    if [ "$DEVELOPMENT_MODE" = true ]; then
        log "Starting in development mode..."
        nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    else
        log "Building and starting in production mode..."
        npm run build
        nohup npm run start > "$LOG_DIR/frontend.log" 2>&1 &
    fi
    
    echo $! > "$PID_DIR/frontend.pid"
    
    # Wait for frontend to be ready
    sleep 5
    local actual_port=$FRONTEND_PORT
    
    # Check if Next.js started on a different port
    if port_in_use 3003; then
        actual_port=3003
    fi
    
    wait_for_service "localhost" "$actual_port" "Next.js Frontend" 60
    log "Frontend started at http://localhost:$actual_port"
}

# Health check
health_check() {
    log "Performing health checks..."
    
    local all_healthy=true
    
    # Check PostgreSQL
    if [ "$START_POSTGRES" = true ] && ! port_in_use "$POSTGRES_PORT"; then
        error "PostgreSQL health check failed"
        all_healthy=false
    fi
    
    # Check Redis
    if [ "$START_REDIS" = true ] && ! port_in_use "$REDIS_PORT"; then
        error "Redis health check failed"
        all_healthy=false
    fi
    
    # Check Elasticsearch
    if [ "$START_ELASTICSEARCH" = true ] && ! port_in_use "$ELASTICSEARCH_PORT"; then
        error "Elasticsearch health check failed"
        all_healthy=false
    fi
    
    # Check Frontend
    if [ "$START_FRONTEND" = true ]; then
        if port_in_use "$FRONTEND_PORT" || port_in_use 3003; then
            log "Frontend health check passed"
        else
            error "Frontend health check failed"
            all_healthy=false
        fi
    fi
    
    if [ "$all_healthy" = true ]; then
        log "All health checks passed!"
        return 0
    else
        error "Some services failed health checks"
        return 1
    fi
}

# Show service status
show_status() {
    echo -e "${BLUE}
╔══════════════════════════════════════════════════════════════════════════════╗
║                            Service Status                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    
    # PostgreSQL
    if port_in_use "$POSTGRES_PORT"; then
        echo -e "PostgreSQL:     ${GREEN}✓ Running${NC} (localhost:$POSTGRES_PORT)"
    else
        echo -e "PostgreSQL:     ${RED}✗ Not Running${NC}"
    fi
    
    # Redis
    if port_in_use "$REDIS_PORT"; then
        echo -e "Redis:          ${GREEN}✓ Running${NC} (localhost:$REDIS_PORT)"
    else
        echo -e "Redis:          ${YELLOW}○ Not Started${NC}"
    fi
    
    # Elasticsearch
    if port_in_use "$ELASTICSEARCH_PORT"; then
        echo -e "Elasticsearch:  ${GREEN}✓ Running${NC} (localhost:$ELASTICSEARCH_PORT)"
    else
        echo -e "Elasticsearch:  ${YELLOW}○ Not Started${NC}"
    fi
    
    # Frontend
    if port_in_use "$FRONTEND_PORT"; then
        echo -e "Frontend:       ${GREEN}✓ Running${NC} (http://localhost:$FRONTEND_PORT)"
    elif port_in_use 3003; then
        echo -e "Frontend:       ${GREEN}✓ Running${NC} (http://localhost:3003)"
    else
        echo -e "Frontend:       ${RED}✗ Not Running${NC}"
    fi
    
    # Prisma Studio
    if port_in_use "$PRISMA_STUDIO_PORT"; then
        echo -e "Prisma Studio:  ${GREEN}✓ Running${NC} (http://localhost:$PRISMA_STUDIO_PORT)"
    else
        echo -e "Prisma Studio:  ${YELLOW}○ Not Started${NC}"
    fi
    
    echo ""
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -p, --production        Start in production mode"
    echo "  -d, --dev               Start in development mode (default)"
    echo "  --no-postgres           Skip PostgreSQL startup"
    echo "  --with-redis            Start Redis server"
    echo "  --with-elasticsearch    Start Elasticsearch server"
    echo "  --with-prisma-studio    Start Prisma Studio"
    echo "  --frontend-only         Start only frontend"
    echo "  --status                Show service status"
    echo "  --stop                  Stop all services"
    echo ""
    echo "Examples:"
    echo "  $0                      # Start with default settings"
    echo "  $0 --production         # Start in production mode"
    echo "  $0 --with-redis --with-elasticsearch  # Start with all services"
    echo "  $0 --frontend-only      # Start only the frontend"
    echo "  $0 --status             # Show current service status"
    echo "  $0 --stop               # Stop all services"
}

# Stop all services
stop_services() {
    log "Stopping all services..."
    
    # Stop frontend
    if [ -f "$PID_DIR/frontend.pid" ]; then
        kill "$(cat "$PID_DIR/frontend.pid")" 2>/dev/null || true
        rm -f "$PID_DIR/frontend.pid"
    fi
    
    # Stop Prisma Studio
    if [ -f "$PID_DIR/prisma-studio.pid" ]; then
        kill "$(cat "$PID_DIR/prisma-studio.pid")" 2>/dev/null || true
        rm -f "$PID_DIR/prisma-studio.pid"
    fi
    
    # Kill any remaining processes
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "prisma studio" 2>/dev/null || true
    
    # Optionally stop database services
    if command_exists brew; then
        if [ "$START_POSTGRES" = true ]; then
            brew services stop postgresql@15 2>/dev/null || brew services stop postgresql 2>/dev/null || true
        fi
        if [ "$START_REDIS" = true ]; then
            brew services stop redis 2>/dev/null || true
        fi
        if [ "$START_ELASTICSEARCH" = true ]; then
            brew services stop elasticsearch 2>/dev/null || true
        fi
    fi
    
    log "All services stopped"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -p|--production)
            DEVELOPMENT_MODE=false
            shift
            ;;
        -d|--dev)
            DEVELOPMENT_MODE=true
            shift
            ;;
        --no-postgres)
            START_POSTGRES=false
            shift
            ;;
        --with-redis)
            START_REDIS=true
            shift
            ;;
        --with-elasticsearch)
            START_ELASTICSEARCH=true
            shift
            ;;
        --with-prisma-studio)
            START_PRISMA_STUDIO=true
            shift
            ;;
        --frontend-only)
            START_POSTGRES=false
            START_REDIS=false
            START_ELASTICSEARCH=false
            START_PRISMA_STUDIO=false
            shift
            ;;
        --status)
            show_status
            exit 0
            ;;
        --stop)
            stop_services
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    header
    
    # Change to project directory
    cd "$PROJECT_DIR"
    
    # Create directories
    create_directories
    
    # Cleanup existing processes
    cleanup_processes
    
    # Install dependencies
    install_dependencies
    
    # Generate Prisma client
    generate_prisma
    
    # Start services in order
    log "Starting services..."
    
    start_postgresql
    start_redis
    start_elasticsearch
    start_prisma_studio
    start_frontend
    
    # Health check
    if health_check; then
        log "🚀 $PROJECT_NAME started successfully!"
        show_status
        
        log "📋 Useful commands:"
        log "   View frontend logs: tail -f $LOG_DIR/frontend.log"
        if [ "$START_PRISMA_STUDIO" = true ]; then
            log "   View Prisma Studio logs: tail -f $LOG_DIR/prisma-studio.log"
        fi
        log "   Stop all services: $0 --stop"
        log "   Check status: $0 --status"
        
        log "✨ Happy coding!"
    else
        error "❌ Some services failed to start properly"
        log "Check the logs in $LOG_DIR/ for more details"
        exit 1
    fi
}

# Run main function
main "$@"