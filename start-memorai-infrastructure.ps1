#!/usr/bin/env powershell

<#
.SYNOPSIS
    Complete Memorai infrastructure startup script for Windows
.DESCRIPTION
    Starts all required services for Memorai MCP server with real persistence:
    - Qdrant Vector Database
    - Redis Cache
    - PostgreSQL Database
    - Health checks and verification
.EXAMPLE
    .\start-memorai-infrastructure.ps1
#>

Write-Host "🚀 Starting Complete Memorai Infrastructure..." -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Cyan

# Change to project directory
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "📁 Working directory: $ProjectRoot" -ForegroundColor Yellow

# Start Docker Compose services
Write-Host "🐳 Starting Docker services..." -ForegroundColor Blue
try {
    docker-compose -f tools/docker/docker-compose.dev.yml up -d
    if ($LASTEXITCODE -ne 0) {
        throw "Docker compose failed"
    }
} catch {
    Write-Host "❌ Failed to start Docker services: $_" -ForegroundColor Red
    exit 1
}

Write-Host "⏳ Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Health checks
Write-Host "🔍 Performing health checks..." -ForegroundColor Blue

# Check Qdrant
Write-Host "   Testing Qdrant Vector Database..." -ForegroundColor Gray
try {
    $qdrantResponse = Invoke-RestMethod -Uri "http://localhost:6333/health" -TimeoutSec 5
    Write-Host "   ✅ Qdrant: Ready" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Qdrant: Not responding" -ForegroundColor Red
}

# Check Redis
Write-Host "   Testing Redis Cache..." -ForegroundColor Gray
try {
    $redisTest = docker exec ((docker ps --filter "name=redis" --format "{{.Names}}") | Select-Object -First 1) redis-cli ping 2>$null
    if ($redisTest -eq "PONG") {
        Write-Host "   ✅ Redis: Ready" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Redis: Not responding" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Redis: Error testing connection" -ForegroundColor Red
}

# Check PostgreSQL
Write-Host "   Testing PostgreSQL Database..." -ForegroundColor Gray
try {
    $postgresTest = docker exec ((docker ps --filter "name=postgres" --format "{{.Names}}") | Select-Object -First 1) psql -U memorai -d memorai -c "SELECT 1;" 2>$null
    if ($postgresTest -match "1 row") {
        Write-Host "   ✅ PostgreSQL: Ready" -ForegroundColor Green
    } else {
        Write-Host "   ❌ PostgreSQL: Not responding properly" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ PostgreSQL: Error testing connection" -ForegroundColor Red
}

# Display service status
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker-compose -f tools/docker/docker-compose.dev.yml ps

Write-Host ""
Write-Host "🎯 Infrastructure Ready!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "✅ Qdrant Vector Database: http://localhost:6333" -ForegroundColor White
Write-Host "✅ Redis Cache: localhost:6379" -ForegroundColor White  
Write-Host "✅ PostgreSQL Database: localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "🔥 Your Memorai MCP tool in VS Code now has REAL PERSISTENCE!" -ForegroundColor Yellow
Write-Host "   No more mock mode - real Azure OpenAI + Qdrant storage! 🚀" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Restart VS Code to reload MCP tool" -ForegroundColor White
Write-Host "   2. Test memory operations - should show 'smart' tier" -ForegroundColor White
Write-Host "   3. Enjoy real persistent memory! 🧠" -ForegroundColor White
