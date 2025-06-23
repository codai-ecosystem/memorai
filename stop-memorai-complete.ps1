#!/usr/bin/env powershell

<#
.SYNOPSIS
    Graceful shutdown of Memorai MCP Server and Infrastructure
.DESCRIPTION
    Stops all Memorai infrastructure services cleanly
#>

Write-Host "🛑 Stopping Memorai Infrastructure..." -ForegroundColor Yellow

# Change to project directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

try {
    # Stop Docker services
    docker-compose -f tools/docker/docker-compose.dev.yml down
    Write-Host "✅ Infrastructure stopped successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error stopping infrastructure: $_" -ForegroundColor Yellow
}
