#!/bin/bash

# Memorai Docker Services Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    success "Docker is running"
}

# Function to start services
start_services() {
    log "Starting Memorai Docker services..."
    check_docker
    
    # Pull latest images if needed
    log "Pulling latest images..."
    docker-compose pull --ignore-pull-failures
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    timeout 180 bash -c 'until docker-compose ps | grep -q "healthy"; do sleep 5; done' || {
        error "Services failed to become healthy within 3 minutes"
        docker-compose logs
        exit 1
    }
    
    success "All services are running and healthy!"
    show_status
}

# Function to stop services
stop_services() {
    log "Stopping Memorai Docker services..."
    docker-compose down
    success "Services stopped"
}

# Function to restart services
restart_services() {
    log "Restarting Memorai Docker services..."
    stop_services
    start_services
}

# Function to show service status
show_status() {
    log "Service Status:"
    docker-compose ps
    echo ""
    log "Service URLs:"
    echo "  📊 Dashboard: http://localhost:6366"
    echo "  🔗 API Server: http://localhost:6367"
    echo "  ❤️  API Health: http://localhost:6367/health"
    echo "  📋 Redis: localhost:6379"
}

# Function to show logs
show_logs() {
    local service=${1:-}
    if [ -n "$service" ]; then
        log "Showing logs for $service..."
        docker-compose logs -f "$service"
    else
        log "Showing logs for all services..."
        docker-compose logs -f
    fi
}

# Function to clean up
cleanup() {
    log "Cleaning up Memorai Docker resources..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    success "Cleanup completed"
}

# Function to update services
update_services() {
    log "Updating Memorai services to latest versions..."
    stop_services
    
    # Remove old containers
    docker-compose rm -f
    
    # Pull latest images
    docker-compose pull
    
    start_services
    success "Services updated successfully"
}

# Function to backup data
backup_data() {
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    log "Creating backup in $backup_dir..."
    
    mkdir -p "$backup_dir"
    docker run --rm -v memorai-data:/source -v "$(pwd)/$backup_dir":/backup alpine tar czf /backup/memorai-data.tar.gz -C /source .
    docker run --rm -v redis-data:/source -v "$(pwd)/$backup_dir":/backup alpine tar czf /backup/redis-data.tar.gz -C /source .
    
    success "Backup created in $backup_dir"
}

# Main script logic
case "${1:-}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    cleanup)
        cleanup
        ;;
    update)
        update_services
        ;;
    backup)
        backup_data
        ;;
    *)
        echo "Memorai Docker Services Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|cleanup|update|backup}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all services"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  status   - Show service status and URLs"
        echo "  logs     - Show logs (optionally for specific service)"
        echo "  cleanup  - Stop services and clean up resources"
        echo "  update   - Update services to latest versions"
        echo "  backup   - Backup service data"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs memorai-api"
        echo "  $0 status"
        exit 1
        ;;
esac
