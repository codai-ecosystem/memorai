#!/usr/bin/env powershell

<#
.SYNOPSIS
    Unified Memorai MCP Server Management Script
.DESCRIPTION
    This script manages the complete Memorai ecosystem including:
    - Infrastructure services (Qdrant, Redis, PostgreSQL)
    - MCP Server (development or production mode)
    - API Server (for dashboard REST endpoints)
    - Dashboard (Next.js frontend)
    - Demo application
    
    Supports multiple modes:
    - dev: Development mode with in-memory storage (no Docker)
    - production: Production mode with published packages
    - full: Complete system with all services
    - infrastructure: Infrastructure services only
    - stop: Graceful shutdown
.PARAMETER Mode
    Startup mode: dev, production, full, infrastructure, stop
.PARAMETER AgentId
    Agent ID for MCP server
.PARAMETER Force
    Force restart services
.EXAMPLE
    .\start-memorai.ps1 -Mode dev
    .\start-memorai.ps1 -Mode production -AgentId "my-agent"
    .\start-memorai.ps1 -Mode full -Force
    .\start-memorai.ps1 -Mode stop
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "production", "full", "infrastructure", "stop")]
    [string]$Mode,
    
    [string]$AgentId = $env:MEMORAI_AGENT_ID,
    [switch]$Force = $false
)

# Set error handling
$ErrorActionPreference = "Stop"

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = $ScriptDir

Write-Host "[MEMORAI] Unified Memorai Management Script" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "[MODE] $Mode" -ForegroundColor Yellow
Write-Host "[DIR] Project root: $ProjectRoot" -ForegroundColor Yellow
Write-Host "[ID] Agent ID: $AgentId" -ForegroundColor Yellow

# Change to project directory
Set-Location $ProjectRoot

# Function to check if service is running
function Test-ServiceHealth {
    param([string]$Name, [string]$Url, [int]$Port)
    
    try {
        if ($Url) {
            $response = Invoke-RestMethod -Uri $Url -TimeoutSec 2 -ErrorAction SilentlyContinue
            return $true
        } else {
            $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
            return $connection
        }
    } catch {
        return $false
    }
}

# Function to start infrastructure services
function Start-Infrastructure {
    Write-Host ""
    Write-Host "[INFRASTRUCTURE] Starting Docker services..." -ForegroundColor Blue
    Write-Host "===========================================" -ForegroundColor Cyan
    
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
        $redisTest = Test-ServiceHealth -Name "Redis" -Port 6379
        if ($redisTest) {
            Write-Host "   ✅ Redis: Ready" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Redis: Not responding" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Redis: Not responding" -ForegroundColor Red
    }
    
    # Check PostgreSQL
    Write-Host "   Testing PostgreSQL Database..." -ForegroundColor Gray
    try {
        $pgTest = Test-ServiceHealth -Name "PostgreSQL" -Port 5432
        if ($pgTest) {
            Write-Host "   ✅ PostgreSQL: Ready" -ForegroundColor Green
        } else {
            Write-Host "   ❌ PostgreSQL: Not responding" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ PostgreSQL: Not responding" -ForegroundColor Red
    }
}

# Function to stop infrastructure services
function Stop-Infrastructure {
    Write-Host ""
    Write-Host "[STOP] Stopping Memorai Infrastructure..." -ForegroundColor Yellow
    Write-Host "=======================================" -ForegroundColor Cyan
    
    try {
        # Stop Docker services
        docker-compose -f tools/docker/docker-compose.dev.yml down
        Write-Host "✅ Infrastructure stopped successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Error stopping infrastructure: $_" -ForegroundColor Yellow
    }
}

# Function to start MCP server
function Start-MCPServer {
    param([bool]$DevMode = $false)
    
    Write-Host ""
    Write-Host "[MCP] Starting MCP Server..." -ForegroundColor Blue
    Write-Host "============================" -ForegroundColor Cyan
    
    if ($DevMode) {
        Write-Host "[*] Development mode - using local packages" -ForegroundColor Yellow
        # Start MCP server in development mode
        Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$ProjectRoot'; pnpm --filter @memorai/mcp dev" -WindowStyle Normal
    } else {
        Write-Host "[*] Production mode - using published packages" -ForegroundColor Yellow
        # Start published MCP server
        try {
            npx @memorai/mcp-server --agent-id $AgentId
        } catch {
            Write-Host "⚠️  Note: MCP server typically runs as background service in VS Code" -ForegroundColor Yellow
        }
    }
}

# Function to start API server
function Start-APIServer {
    Write-Host ""
    Write-Host "[API] Starting API Server..." -ForegroundColor Blue
    Write-Host "============================" -ForegroundColor Cyan
    
    Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$ProjectRoot'; pnpm --filter @memorai/api dev" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

# Function to start dashboard
function Start-Dashboard {
    Write-Host ""
    Write-Host "[DASHBOARD] Starting Dashboard..." -ForegroundColor Blue
    Write-Host "=================================" -ForegroundColor Cyan
    
    Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$ProjectRoot'; pnpm --filter @memorai/dashboard dev" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

# Function to start demo
function Start-Demo {
    Write-Host ""
    Write-Host "[DEMO] Starting Demo Application..." -ForegroundColor Blue
    Write-Host "===================================" -ForegroundColor Cyan
    
    Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$ProjectRoot'; pnpm --filter @memorai/demo dev" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

# Function to display service URLs
function Show-ServiceURLs {
    Write-Host ""
    Write-Host "[SERVICES] Available Services:" -ForegroundColor Green
    Write-Host "=============================" -ForegroundColor Cyan
    Write-Host "🔗 Dashboard:     http://localhost:6366" -ForegroundColor White
    Write-Host "🔗 API Server:    http://localhost:6367" -ForegroundColor White
    Write-Host "🔗 MCP Server:    http://localhost:8080" -ForegroundColor White
    Write-Host "🔗 Demo App:      http://localhost:3002" -ForegroundColor White
    Write-Host "🔗 Qdrant:        http://localhost:6333" -ForegroundColor White
    Write-Host "🔗 Redis:         localhost:6379" -ForegroundColor White
    Write-Host "🔗 PostgreSQL:    localhost:5432" -ForegroundColor White
    Write-Host ""
}

# Main execution logic
switch ($Mode) {
    "dev" {
        Write-Host "[*] Starting Development Environment (Docker-free)..." -ForegroundColor Green
        
        # Set environment variables for development
        $env:NODE_ENV = "development"
        $env:MEMORAI_USE_INMEMORY = "true"
        $env:MEMORAI_TIER = "ADVANCED"
        $env:MEMORAI_TENANT_ID = "dev-tenant"
        
        Write-Host "[*] Environment configured for DOCKER-FREE development:" -ForegroundColor Yellow
        Write-Host "   NODE_ENV: $env:NODE_ENV" -ForegroundColor Gray
        Write-Host "   MEMORAI_USE_INMEMORY: $env:MEMORAI_USE_INMEMORY" -ForegroundColor Gray
        Write-Host "   MEMORAI_TIER: $env:MEMORAI_TIER" -ForegroundColor Gray
        Write-Host "   DOCKER-FREE MODE: Using in-memory storage" -ForegroundColor Green
        
        Start-MCPServer -DevMode $true
        Start-APIServer
        Start-Dashboard
        Start-Demo
        Show-ServiceURLs
    }
    
    "production" {
        Write-Host "[*] Starting Production Environment..." -ForegroundColor Green
        
        Start-Infrastructure
        Start-MCPServer -DevMode $false
        Show-ServiceURLs
    }
    
    "full" {
        Write-Host "[*] Starting Complete System..." -ForegroundColor Green
        
        Start-Infrastructure
        Start-MCPServer -DevMode $true
        Start-APIServer
        Start-Dashboard
        Start-Demo
        Show-ServiceURLs
    }
    
    "infrastructure" {
        Write-Host "[*] Starting Infrastructure Only..." -ForegroundColor Green
        
        Start-Infrastructure
        Show-ServiceURLs
    }
    
    "stop" {
        Stop-Infrastructure
    }
}

Write-Host ""
Write-Host "[MEMORAI] Operation completed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
