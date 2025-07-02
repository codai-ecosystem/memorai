#!/usr/bin/env pwsh
param(
    [Parameter(Position=0)]
    [string]$Action = "help",
    [Parameter(Position=1)]
    [string]$Service = ""
)

# Color definitions
$Green = 'Green'
$Yellow = 'Yellow'
$Red = 'Red'
$Blue = 'Cyan'

function Write-Success($Message) { Write-Host $Message -ForegroundColor $Green }
function Write-Warning($Message) { Write-Host $Message -ForegroundColor $Yellow }
function Write-Error($Message) { Write-Host $Message -ForegroundColor $Red }
function Write-Info($Message) { Write-Host $Message -ForegroundColor $Blue }

function Start-Services {
    Write-Info "Starting Memorai Docker services..."
    
    # Check if Docker is running
    try {
        docker info | Out-Null
    }
    catch {
        Write-Error "Docker is not running or not installed"
        exit 1
    }
    
    # Create external network if it doesn't exist
    $networkExists = docker network ls --filter name=memorai-network --format "{{.Name}}" | Select-String "memorai-network"
    if (-not $networkExists) {
        Write-Info "Creating Docker network..."
        docker network create memorai-network
    }
    
    # Start services with docker-compose
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Services started successfully!"
        Write-Info ""
        Write-Info "Service URLs:"
        Write-Info "  - Dashboard: http://localhost:6366"
        Write-Info "  - API: http://localhost:6367"
        Write-Info "  - MCP HTTP Server: http://localhost:8080"
        Write-Info "  - Redis: localhost:6379"
        Write-Info ""
        Write-Info "Check status with: .\docker-services.ps1 status"
    } else {
        Write-Error "Failed to start services"
        exit 1
    }
}

function Stop-Services {
    Write-Info "Stopping Memorai Docker services..."
    
    docker-compose down
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Services stopped successfully!"
    } else {
        Write-Error "Failed to stop services"
        exit 1
    }
}

function Restart-Services {
    Write-Info "Restarting Memorai Docker services..."
    Stop-Services
    Start-Sleep 2
    Start-Services
}

function Show-Status {
    Write-Info "Memorai Docker Services Status:"
    Write-Info "================================"
    
    # Check Docker daemon
    try {
        docker info | Out-Null
        Write-Success "✓ Docker daemon running"
    }
    catch {
        Write-Error "✗ Docker daemon not running"
        return
    }
    
    # Check services
    $services = @("memorai-api", "memorai-dashboard", "memorai-mcp", "redis")
    
    foreach ($service in $services) {
        $status = docker-compose ps --services --filter "status=running" | Select-String $service
        if ($status) {
            Write-Success "✓ $service running"
            
            # Show container details
            $container = docker-compose ps $service --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
            Write-Host "  $container" -ForegroundColor Gray
        } else {
            Write-Warning "✗ $service not running"
        }
    }
    
    Write-Info ""
    Write-Info "Service URLs:"
    Write-Info "  - Dashboard: http://localhost:6366"
    Write-Info "  - API: http://localhost:6367"
    Write-Info "  - MCP HTTP Server: http://localhost:8080"
    Write-Info "  - Redis: localhost:6379"
}

function Show-Logs {
    param([string]$ServiceName)
    
    if ($ServiceName) {
        Write-Info "Showing logs for $ServiceName..."
        docker-compose logs -f $ServiceName
    } else {
        Write-Info "Showing logs for all services..."
        docker-compose logs -f
    }
}

function Remove-Resources {
    Write-Warning "Stopping services and cleaning up resources..."
    
    # Stop and remove containers, networks, and volumes
    docker-compose down -v --remove-orphans
    
    # Remove network if exists
    $networkExists = docker network ls --filter name=memorai-network --format "{{.Name}}" | Select-String "memorai-network"
    if ($networkExists) {
        docker network rm memorai-network
    }
    
    # Remove images (optional - commented out to preserve build cache)
    # docker-compose down --rmi all
    
    Write-Success "Cleanup completed!"
}

function Update-Services {
    Write-Info "Updating Memorai services..."
    
    # Pull latest images
    docker-compose pull
    
    # Restart services with new images
    docker-compose up -d --force-recreate
    
    Write-Success "Services updated!"
}

function Backup-Data {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupDir = "backups/$timestamp"
    
    Write-Info "Creating backup in $backupDir..."
    
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    
    docker run --rm -v memorai-data:/source -v "${PWD}/${backupDir}:/backup" alpine tar czf /backup/memorai-data.tar.gz -C /source .
    docker run --rm -v redis-data:/source -v "${PWD}/${backupDir}:/backup" alpine tar czf /backup/redis-data.tar.gz -C /source .
    
    Write-Success "Backup created in $backupDir"
}

function Start-MCPServer {
    Write-Info "Starting Memorai MCP HTTP Server..."
    
    docker-compose up -d memorai-mcp
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "MCP HTTP Server started successfully!"
        Write-Info "  - MCP Server: http://localhost:8080"
        Write-Info "  - Health Check: http://localhost:8080/health"
        Write-Info "  - SSE Endpoint: http://localhost:8080/sse"
    } else {
        Write-Error "Failed to start MCP server"
        exit 1
    }
}

function Stop-MCPServer {
    Write-Info "Stopping Memorai MCP HTTP Server..."
    
    docker-compose stop memorai-mcp
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "MCP HTTP Server stopped successfully!"
    } else {
        Write-Error "Failed to stop MCP server"
        exit 1
    }
}

function Show-MCPStatus {
    Write-Info "Memorai MCP HTTP Server Status:"
    Write-Info "==============================="
    
    # Check container status
    $mcpStatus = docker-compose ps memorai-mcp --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
    if ($mcpStatus) {
        Write-Success "✓ memorai-mcp container running"
        Write-Host "  $mcpStatus" -ForegroundColor Gray
        
        # Test health endpoint
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8080/health" -TimeoutSec 5
            Write-Success "✓ Health check passed"
            Write-Host "  Status: $($response.status)" -ForegroundColor Gray
        } catch {
            Write-Warning "⚠ Health check failed"
        }
    } else {
        Write-Warning "✗ memorai-mcp container not running"
    }
    
    Write-Info ""
    Write-Info "MCP Endpoints:"
    Write-Info "  - Health: http://localhost:8080/health"
    Write-Info "  - SSE: http://localhost:8080/sse"
    Write-Info "  - Status: http://localhost:8080/status"
}

# Main script logic
switch ($Action) {
    'start' { Start-Services }
    'stop' { Stop-Services }
    'restart' { Restart-Services }
    'status' { Show-Status }
    'logs' { Show-Logs $Service }
    'cleanup' { Remove-Resources }
    'update' { Update-Services }
    'backup' { Backup-Data }
    'mcp-start' { Start-MCPServer }
    'mcp-stop' { Stop-MCPServer }
    'mcp-status' { Show-MCPStatus }
    default {
        Write-Host "Memorai Docker Services Manager" -ForegroundColor $Blue
        Write-Host ""
        Write-Host "Usage: .\docker-services.ps1 {start|stop|restart|status|logs|cleanup|update|backup|mcp-start|mcp-stop|mcp-status} [service]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  start      - Start all services"
        Write-Host "  stop       - Stop all services"
        Write-Host "  restart    - Restart all services"
        Write-Host "  status     - Show service status and URLs"
        Write-Host "  logs       - Show logs (optionally for specific service)"
        Write-Host "  cleanup    - Stop services and clean up resources"
        Write-Host "  update     - Update services to latest versions"
        Write-Host "  backup     - Backup service data"
        Write-Host "  mcp-start  - Start only MCP HTTP server"
        Write-Host "  mcp-stop   - Stop only MCP HTTP server"
        Write-Host "  mcp-status - Show MCP server status"
        Write-Host ""
        Write-Host "Examples:"
        Write-Host "  .\docker-services.ps1 start"
        Write-Host "  .\docker-services.ps1 logs memorai-api"
        Write-Host "  .\docker-services.ps1 mcp-start"
        Write-Host "  .\docker-services.ps1 mcp-status"
    }
}
