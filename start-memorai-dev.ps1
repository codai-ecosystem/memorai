#!/usr/bin/env powershell

<#
.SYNOPSIS
    Complete Memorai development environment startup script
.DESCRIPTION
    Starts complete development environment for Memorai services:
    - Infrastructure services (Qdrant, Redis, PostgreSQL)
    - MCP Server (development mode)
    - API Server (development mode)
    - Dashboard (development mode)
    - Live data verification and testing
.EXAMPLE
    .\start-memorai-dev.ps1
#>

Write-Host "[*] Starting Complete Memorai Development Environment..." -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan

# Change to project directory
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot
Write-Host "[*] Working directory: $ProjectRoot" -ForegroundColor Yellow

# Step 1: Start Infrastructure Services
Write-Host ""
Write-Host "[STEP 1] Starting Infrastructure Services..." -ForegroundColor Blue
Write-Host "=============================================" -ForegroundColor Cyan

# Start Docker Compose services
Write-Host "[*] Starting Docker services..." -ForegroundColor Blue
try {
    docker-compose -f tools/docker/docker-compose.dev.yml up -d
    if ($LASTEXITCODE -ne 0) {
        throw "Docker compose failed"
    }
    Write-Host "[OK] Docker services started" -ForegroundColor Green
} catch {
    Write-Host "[X] Failed to start Docker services: $_" -ForegroundColor Red
    exit 1
}

Write-Host "[*] Waiting for infrastructure to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Health checks
Write-Host "[*] Performing infrastructure health checks..." -ForegroundColor Blue

# Check Qdrant
try {
    $qdrantResponse = Invoke-RestMethod -Uri "http://localhost:6333/health" -TimeoutSec 5
    Write-Host "   [OK] Qdrant Vector Database: Ready (http://localhost:6333)" -ForegroundColor Green
} catch {
    Write-Host "   [X] Qdrant: Not responding" -ForegroundColor Red
    Write-Host "       Continuing anyway - will use in-memory fallback" -ForegroundColor Yellow
}

# Check Redis
try {
    $redisTest = docker exec ((docker ps --filter "name=redis" --format "{{.Names}}") | Select-Object -First 1) redis-cli ping 2>$null
    if ($redisTest -eq "PONG") {
        Write-Host "   [OK] Redis Cache: Ready (localhost:6379)" -ForegroundColor Green
    } else {
        Write-Host "   [X] Redis: Not responding" -ForegroundColor Red
    }
} catch {
    Write-Host "   [X] Redis: Error testing connection" -ForegroundColor Red
}

# Step 2: Start Development Services
Write-Host ""
Write-Host "[STEP 2] Starting Development Services..." -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Cyan

# Set environment variables for development
$env:NODE_ENV = "development"
$env:MEMORAI_USE_INMEMORY = "false"
$env:MEMORAI_TIER = "ADVANCED"
$env:MEMORAI_TENANT_ID = "dev-tenant"
$env:QDRANT_URL = "http://localhost:6333"
$env:REDIS_URL = "redis://localhost:6379"

Write-Host "[*] Environment configured for development:" -ForegroundColor Yellow
Write-Host "   NODE_ENV: $env:NODE_ENV" -ForegroundColor Gray
Write-Host "   MEMORAI_USE_INMEMORY: $env:MEMORAI_USE_INMEMORY" -ForegroundColor Gray
Write-Host "   MEMORAI_TIER: $env:MEMORAI_TIER" -ForegroundColor Gray
Write-Host "   QDRANT_URL: $env:QDRANT_URL" -ForegroundColor Gray

# Function to start service in new terminal
function Start-ServiceInNewTerminal {
    param(
        [string]$ServiceName,
        [string]$WorkingDir,
        [string]$Command,
        [string]$Args,
        [int]$Port
    )
    
    Write-Host "[*] Starting $ServiceName..." -ForegroundColor Blue
    $FullPath = Join-Path $ProjectRoot $WorkingDir
    
    # Create PowerShell command to run in new terminal
    $PSCommand = @"
Set-Location '$FullPath'
Write-Host '[$ServiceName] Starting in: $FullPath' -ForegroundColor Cyan
Write-Host '[$ServiceName] Command: $Command $Args' -ForegroundColor Gray
Write-Host '[$ServiceName] Port: $Port' -ForegroundColor Gray
Write-Host ''
& $Command $Args
Read-Host 'Press Enter to close this window'
"@

    Start-Process PowerShell -ArgumentList "-NoExit", "-Command", $PSCommand
    Write-Host "   [OK] $ServiceName started in new terminal (port $Port)" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

# Start MCP Server (Development Mode)
Start-ServiceInNewTerminal -ServiceName "MCP Server" -WorkingDir "packages/mcp" -Command "pnpm" -Args "dev" -Port 8080

# Start API Server (Development Mode)  
Start-ServiceInNewTerminal -ServiceName "API Server" -WorkingDir "apps/api" -Command "pnpm" -Args "dev" -Port 6367

# Start Dashboard (Development Mode)
Start-ServiceInNewTerminal -ServiceName "Dashboard" -WorkingDir "apps/dashboard" -Command "pnpm" -Args "dev" -Port 6366

Write-Host ""
Write-Host "[*] Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Step 3: Service Health Verification
Write-Host ""
Write-Host "[STEP 3] Verifying Service Health..." -ForegroundColor Blue
Write-Host "====================================" -ForegroundColor Cyan

# Test MCP Server
Write-Host "[*] Testing MCP Server (port 8080)..." -ForegroundColor Yellow
try {
    # MCP servers typically don't have HTTP endpoints, so we check if port is open
    $connection = New-Object System.Net.Sockets.TcpClient
    $connection.ConnectAsync("localhost", 8080).Wait(3000)
    if ($connection.Connected) {
        Write-Host "   [OK] MCP Server: Process running on port 8080" -ForegroundColor Green
        $connection.Close()
    } else {
        Write-Host "   [?] MCP Server: Port check inconclusive" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [?] MCP Server: Port check failed (may be normal for MCP)" -ForegroundColor Yellow
}

# Test API Server
Write-Host "[*] Testing API Server (port 6367)..." -ForegroundColor Yellow
try {
    $apiResponse = Invoke-RestMethod -Uri "http://localhost:6367/health" -TimeoutSec 5
    Write-Host "   [OK] API Server: Ready (http://localhost:6367)" -ForegroundColor Green
} catch {
    Write-Host "   [?] API Server: Not responding yet (may still be starting)" -ForegroundColor Yellow
}

# Test Dashboard
Write-Host "[*] Testing Dashboard (port 6366)..." -ForegroundColor Yellow
try {
    $dashboardResponse = Invoke-WebRequest -Uri "http://localhost:6366" -TimeoutSec 5
    if ($dashboardResponse.StatusCode -eq 200) {
        Write-Host "   [OK] Dashboard: Ready (http://localhost:6366)" -ForegroundColor Green
    } else {
        Write-Host "   [?] Dashboard: Unexpected response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [?] Dashboard: Not responding yet (may still be starting)" -ForegroundColor Yellow
}

# Step 4: Final Status and Instructions
Write-Host ""
Write-Host "[COMPLETE] Development Environment Status" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Infrastructure Services:" -ForegroundColor White
Write-Host "  [*] Qdrant Vector Database: http://localhost:6333" -ForegroundColor Gray
Write-Host "  [*] Redis Cache: localhost:6379" -ForegroundColor Gray
Write-Host "  [*] PostgreSQL Database: localhost:5432" -ForegroundColor Gray
Write-Host ""
Write-Host "Development Services:" -ForegroundColor White
Write-Host "  [*] MCP Server (dev): port 8080" -ForegroundColor Gray
Write-Host "  [*] API Server (dev): http://localhost:6367" -ForegroundColor Gray
Write-Host "  [*] Dashboard (dev): http://localhost:6366" -ForegroundColor Gray
Write-Host ""
Write-Host "Testing URLs:" -ForegroundColor Yellow
Write-Host "  - Dashboard: http://localhost:6366" -ForegroundColor Cyan
Write-Host "  - API Health: http://localhost:6367/health" -ForegroundColor Cyan
Write-Host "  - API Graph: http://localhost:6367/api/graph" -ForegroundColor Cyan
Write-Host "  - Qdrant UI: http://localhost:6333/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment Configuration:" -ForegroundColor Yellow
Write-Host "  - MEMORAI_USE_INMEMORY: false (using Qdrant)" -ForegroundColor Cyan
Write-Host "  - MEMORAI_TIER: ADVANCED (full features)" -ForegroundColor Cyan
Write-Host "  - All services in development mode" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Green
Write-Host "1. Check all service terminals are running without errors" -ForegroundColor White
Write-Host "2. Open Dashboard: http://localhost:6366" -ForegroundColor White
Write-Host "3. Verify live memory data appears (not demo data)" -ForegroundColor White
Write-Host "4. Test MCP tool in VS Code with live persistence" -ForegroundColor White
Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor Red
Write-Host "- If services fail to start, check individual terminal windows" -ForegroundColor White
Write-Host "- If no live data appears, verify Qdrant connection" -ForegroundColor White
Write-Host "- All source code is available for debugging in development mode" -ForegroundColor White
Write-Host ""
Write-Host "[SUCCESS] Development environment ready! [EMOJI]" -ForegroundColor Green
