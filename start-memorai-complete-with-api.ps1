#!/usr/bin/env powershell

<#
.SYNOPSIS
    Complete Memorai Infrastructure + MCP Server + API Server
.DESCRIPTION
    This script starts all required services for the complete Memorai system:
    - Infrastructure services (Qdrant, Redis, PostgreSQL)
    - MCP Server (via published package)
    - API Server (for dashboard REST endpoints)
    - Dashboard (Next.js frontend)
.NOTES
    This solves the architecture mismatch where dashboard expects API server
    at port 6367 but only MCP server was running.
#>

param(
    [string]$AgentId = $env:MEMORAI_AGENT_ID,
    [switch]$Force = $false
)

# Set error handling
$ErrorActionPreference = "Stop"

Write-Host "[MEMORAI] Starting Complete Memorai System (Infrastructure + MCP + API + Dashboard)..." -ForegroundColor Green
Write-Host "===================================================================================" -ForegroundColor Cyan

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = $ScriptDir

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

# Function to wait for service
function Wait-ForService {
    param([string]$Name, [string]$Url, [int]$Port, [int]$MaxWait = 30)
    
    Write-Host "   [WAIT] Waiting for $Name..." -ForegroundColor Gray
    
    for ($i = 1; $i -le $MaxWait; $i++) {
        if (Test-ServiceHealth -Name $Name -Url $Url -Port $Port) {
            Write-Host "   [OK] $Name is Ready" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "   [X] $Name timeout after $MaxWait seconds" -ForegroundColor Red
    return $false
}

# 1. CHECK INFRASTRUCTURE
Write-Host "[STEP 1] Checking infrastructure services..." -ForegroundColor Blue

$qdrantRunning = Test-ServiceHealth -Name "Qdrant" -Url "http://localhost:6333/"
$redisRunning = Test-ServiceHealth -Name "Redis" -Port 6379
$postgresRunning = Test-ServiceHealth -Name "PostgreSQL" -Port 5432

if ($qdrantRunning -and $redisRunning -and $postgresRunning -and -not $Force) {
    Write-Host "[SUCCESS] All infrastructure services are already running!" -ForegroundColor Green
} else {
    Write-Host "[DOCKER] Starting Docker infrastructure services..." -ForegroundColor Blue
    
    # Stop any existing services first
    try {
        docker-compose -f tools/docker/docker-compose.dev.yml down --remove-orphans 2>$null
    } catch {
        # Ignore errors if compose file doesn't exist yet
    }
    
    # Start services
    try {
        $composeOutput = docker-compose -f tools/docker/docker-compose.dev.yml up -d 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[X] Failed to start Docker services:" -ForegroundColor Red
            Write-Host $composeOutput -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "[X] Docker Compose failed: $_" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[WAIT] Waiting for infrastructure services..." -ForegroundColor Yellow
    
    # Wait for services with timeout
    $allReady = $true
    
    if (!(Wait-ForService -Name "Qdrant" -Url "http://localhost:6333/" -MaxWait 45)) {
        $allReady = $false
    }
    
    if (!(Wait-ForService -Name "Redis" -Port 6379 -MaxWait 30)) {
        $allReady = $false
    }
    
    if (!(Wait-ForService -Name "PostgreSQL" -Port 5432 -MaxWait 30)) {
        $allReady = $false
    }
    
    if (-not $allReady) {
        Write-Host "[X] Infrastructure services failed to start" -ForegroundColor Red
        exit 1
    }
}

# 2. START API SERVER
Write-Host "[STEP 2] Starting API Server..." -ForegroundColor Blue

$apiRunning = Test-ServiceHealth -Name "API Server" -Port 6367

if ($apiRunning -and -not $Force) {
    Write-Host "[SUCCESS] API Server already running on port 6367" -ForegroundColor Green
} else {
    Write-Host "[API] Starting Memorai API Server..." -ForegroundColor Blue
    
    # Start API server in background
    $apiJob = Start-Job -ScriptBlock {
        param($projectRoot)
        Set-Location $projectRoot
        pnpm --filter @codai/memorai-api run dev
    } -ArgumentList $ProjectRoot
    
    # Wait for API server to be ready
    if (Wait-ForService -Name "API Server" -Port 6367 -MaxWait 30) {
        Write-Host "[SUCCESS] API Server started on port 6367" -ForegroundColor Green
    } else {
        Write-Host "[X] API Server failed to start" -ForegroundColor Red
        Stop-Job $apiJob -Force
        Remove-Job $apiJob -Force
        exit 1
    }
}

# 3. CHECK MCP SERVER (should be managed by VS Code)
Write-Host "[STEP 3] Checking MCP Server..." -ForegroundColor Blue
Write-Host "[INFO] MCP Server is managed by VS Code MCP settings" -ForegroundColor Gray
Write-Host "[INFO] Using published package: @codai/memorai-mcp@2.0.55" -ForegroundColor Gray

# 4. CHECK DASHBOARD
Write-Host "[STEP 4] Checking Dashboard..." -ForegroundColor Blue

$dashboardRunning = Test-ServiceHealth -Name "Dashboard" -Port 6366

if ($dashboardRunning) {
    Write-Host "[SUCCESS] Dashboard already running on port 6366" -ForegroundColor Green
} else {
    Write-Host "[INFO] Dashboard should be started by MCP server" -ForegroundColor Gray
    Write-Host "[INFO] If not running, check MCP server configuration" -ForegroundColor Gray
}

# 5. FINAL STATUS CHECK
Write-Host "[STEP 5] Final System Status Check..." -ForegroundColor Blue

$finalStatus = @{
    "Qdrant (6333)" = Test-ServiceHealth -Name "Qdrant" -Url "http://localhost:6333/"
    "Redis (6379)" = Test-ServiceHealth -Name "Redis" -Port 6379
    "PostgreSQL (5432)" = Test-ServiceHealth -Name "PostgreSQL" -Port 5432
    "API Server (6367)" = Test-ServiceHealth -Name "API Server" -Port 6367
    "Dashboard (6366)" = Test-ServiceHealth -Name "Dashboard" -Port 6366
}

Write-Host ""
Write-Host "=== MEMORAI SYSTEM STATUS ===" -ForegroundColor Cyan
foreach ($service in $finalStatus.GetEnumerator()) {
    $status = if ($service.Value) { "✅ RUNNING" } else { "❌ STOPPED" }
    $color = if ($service.Value) { "Green" } else { "Red" }
    Write-Host "  $($service.Key): $status" -ForegroundColor $color
}

# Check critical services
$criticalServices = @("Qdrant (6333)", "API Server (6367)")
$criticalRunning = $criticalServices | Where-Object { $finalStatus[$_] }

if ($criticalRunning.Count -eq $criticalServices.Count) {
    Write-Host ""
    Write-Host "🚀 MEMORAI SYSTEM READY!" -ForegroundColor Green
    Write-Host "   Dashboard: http://localhost:6366" -ForegroundColor Cyan
    Write-Host "   API: http://localhost:6367" -ForegroundColor Cyan
    Write-Host "   Qdrant: http://localhost:6333" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Dashboard can now connect to API server (no more mock data!)" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ CRITICAL SERVICES NOT RUNNING" -ForegroundColor Red
    $criticalServices | Where-Object { -not $finalStatus[$_] } | ForEach-Object {
        Write-Host "   Missing: $_" -ForegroundColor Red
    }
    exit 1
}
