# Memorai Docker Services Management Script (PowerShell)

param(
    [Parameter(Position=0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs', 'cleanup', 'update', 'backup')]
    [string]$Action = 'help',
    
    [Parameter(Position=1)]
    [string]$Service = ''
)

# Colors for output
$Red = "Red"
$Green = "Green" 
$Yellow = "Yellow"
$Blue = "Cyan"

function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Test-Docker {
    try {
        docker info | Out-Null
        Write-Success "Docker is running"
        return $true
    }
    catch {
        Write-Error "Docker is not running. Please start Docker and try again."
        return $false
    }
}

function Start-Services {
    Write-Log "Starting Memorai Docker services..."
    
    if (-not (Test-Docker)) {
        exit 1
    }
    
    # Pull latest images if needed
    Write-Log "Pulling latest images..."
    docker-compose pull --ignore-pull-failures
    
    # Start services
    Write-Log "Starting services..."
    docker-compose up -d
    
    # Wait for services to be healthy
    Write-Log "Waiting for services to be healthy..."
    $timeout = 180
    $elapsed = 0
    $healthy = $false
    
    while ($elapsed -lt $timeout -and -not $healthy) {
        Start-Sleep 5
        $elapsed += 5
        
        $status = docker-compose ps --format json | ConvertFrom-Json
        $healthy = $status | Where-Object { $_.Health -eq "healthy" } | Measure-Object | Select-Object -ExpandProperty Count
        $healthy = $healthy -gt 0
    }
    
    if (-not $healthy) {
        Write-Error "Services failed to become healthy within 3 minutes"
        docker-compose logs
        exit 1
    }
    
    Write-Success "All services are running and healthy!"
    Show-Status
}

function Stop-Services {
    Write-Log "Stopping Memorai Docker services..."
    docker-compose down
    Write-Success "Services stopped"
}

function Restart-Services {
    Write-Log "Restarting Memorai Docker services..."
    Stop-Services
    Start-Services
}

function Show-Status {
    Write-Log "Service Status:"
    docker-compose ps
    Write-Host ""
    Write-Log "Service URLs:"
    Write-Host "  📊 Dashboard: http://localhost:6366" -ForegroundColor $Green
    Write-Host "  🔗 API Server: http://localhost:6367" -ForegroundColor $Green
    Write-Host "  ❤️  API Health: http://localhost:6367/health" -ForegroundColor $Green
    Write-Host "  📋 Redis: localhost:6379" -ForegroundColor $Green
}

function Show-Logs {
    param([string]$ServiceName)
    
    if ($ServiceName) {
        Write-Log "Showing logs for $ServiceName..."
        docker-compose logs -f $ServiceName
    }
    else {
        Write-Log "Showing logs for all services..."
        docker-compose logs -f
    }
}

function Remove-Resources {
    Write-Log "Cleaning up Memorai Docker resources..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    Write-Success "Cleanup completed"
}

function Update-Services {
    Write-Log "Updating Memorai services to latest versions..."
    Stop-Services
    
    # Remove old containers
    docker-compose rm -f
    
    # Pull latest images
    docker-compose pull
    
    Start-Services
    Write-Success "Services updated successfully"
}

function Backup-Data {
    $backupDir = "./backups/$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Log "Creating backup in $backupDir..."
    
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    
    docker run --rm -v memorai-data:/source -v "${PWD}/${backupDir}:/backup" alpine tar czf /backup/memorai-data.tar.gz -C /source .
    docker run --rm -v redis-data:/source -v "${PWD}/${backupDir}:/backup" alpine tar czf /backup/redis-data.tar.gz -C /source .
    
    Write-Success "Backup created in $backupDir"
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
    default {
        Write-Host "Memorai Docker Services Manager" -ForegroundColor $Blue
        Write-Host ""
        Write-Host "Usage: .\docker-services.ps1 {start|stop|restart|status|logs|cleanup|update|backup} [service]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  start    - Start all services"
        Write-Host "  stop     - Stop all services"
        Write-Host "  restart  - Restart all services"
        Write-Host "  status   - Show service status and URLs"
        Write-Host "  logs     - Show logs (optionally for specific service)"
        Write-Host "  cleanup  - Stop services and clean up resources"
        Write-Host "  update   - Update services to latest versions"
        Write-Host "  backup   - Backup service data"
        Write-Host ""
        Write-Host "Examples:"
        Write-Host "  .\docker-services.ps1 start"
        Write-Host "  .\docker-services.ps1 logs memorai-api"
        Write-Host "  .\docker-services.ps1 status"
    }
}
