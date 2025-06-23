#!/usr/bin/env powershell

<#
.SYNOPSIS
    Automated Memorai MCP Server with Infrastructure Startup
.DESCRIPTION
    This script automatically starts all required infrastructure services
    and then launches the Memorai MCP server. Designed for seamless
    VS Code integration with zero manual setup.
.NOTES
    Used by VS Code MCP settings for complete automation
#>

param(
    [string]$AgentId = $env:MEMORAI_AGENT_ID,
    [switch]$Force = $false
)

# Set error handling
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Complete Memorai Infrastructure + MCP Server..." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = $ScriptDir

Write-Host "📁 Project root: $ProjectRoot" -ForegroundColor Yellow
Write-Host "🆔 Agent ID: $AgentId" -ForegroundColor Yellow

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
    
    Write-Host "   ⏳ Waiting for $Name..." -ForegroundColor Gray
    
    for ($i = 1; $i -le $MaxWait; $i++) {
        if (Test-ServiceHealth -Name $Name -Url $Url -Port $Port) {
            Write-Host "   ✅ $Name: Ready" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "   ❌ $Name: Timeout after $MaxWait seconds" -ForegroundColor Red
    return $false
}

# Check if infrastructure is already running
Write-Host "🔍 Checking existing infrastructure..." -ForegroundColor Blue

$qdrantRunning = Test-ServiceHealth -Name "Qdrant" -Url "http://localhost:6333/"
$redisRunning = Test-ServiceHealth -Name "Redis" -Port 6379
$postgresRunning = Test-ServiceHealth -Name "PostgreSQL" -Port 5432

if ($qdrantRunning -and $redisRunning -and $postgresRunning -and -not $Force) {
    Write-Host "✅ All infrastructure services are already running!" -ForegroundColor Green
} else {
    Write-Host "🐳 Starting Docker infrastructure services..." -ForegroundColor Blue
    
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
            Write-Host "❌ Failed to start Docker services:" -ForegroundColor Red
            Write-Host $composeOutput -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Docker Compose failed: $_" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "⏳ Waiting for all services to be ready..." -ForegroundColor Yellow
    
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
        Write-Host "❌ Some services failed to start properly" -ForegroundColor Red
        Write-Host "🔍 Checking service logs..." -ForegroundColor Yellow
        docker-compose -f tools/docker/docker-compose.dev.yml logs --tail=10
        exit 1
    }
}

# Verify service status
Write-Host ""
Write-Host "📊 Infrastructure Status:" -ForegroundColor Cyan
try {
    docker-compose -f tools/docker/docker-compose.dev.yml ps
} catch {
    Write-Host "⚠️  Could not get service status" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 All Infrastructure Ready!" -ForegroundColor Green
Write-Host "✅ Qdrant Vector Database: http://localhost:6333" -ForegroundColor White
Write-Host "✅ Redis Cache: localhost:6379" -ForegroundColor White  
Write-Host "✅ PostgreSQL Database: localhost:5432" -ForegroundColor White

Write-Host ""
Write-Host "🚀 Starting Memorai MCP Server..." -ForegroundColor Blue

# Set environment variables for MCP server
$env:MEMORAI_AGENT_ID = $AgentId

# Start the MCP server using the published version
try {
    # Load environment from .env files
    Write-Host "📂 Loading environment configuration..." -ForegroundColor Gray
    
    # Use dotenv-cli to load environment and start MCP server
    & npx -y dotenv-cli -e "E:\GitHub\workspace-ai\.env" -e ".env" -- npx -y "@codai/memorai-mcp@2.0.11"
    
} catch {
    Write-Host "❌ Failed to start MCP server: $_" -ForegroundColor Red
    Write-Host "🛠️  Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "   1. Check if Node.js and npm are installed" -ForegroundColor White
    Write-Host "   2. Verify network connectivity" -ForegroundColor White
    Write-Host "   3. Check environment file exists: E:\GitHub\workspace-ai\.env" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "🎉 Memorai MCP Server with Infrastructure Started Successfully!" -ForegroundColor Green
