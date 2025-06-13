#!/usr/bin/env pwsh
# Bootstrap script for Memorai MCP development environment

Write-Host "🧠 Memorai MCP - Development Environment Setup" -ForegroundColor Blue

# Check Node.js version
$nodeVersion = node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 20+ first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green

# Check pnpm
$pnpmVersion = pnpm --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "📦 Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}

Write-Host "✅ pnpm version: $pnpmVersion" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pnpm install

# Build all packages
Write-Host "🔨 Building packages..." -ForegroundColor Yellow
pnpm build

# Check for required services
Write-Host "🔍 Checking required services..." -ForegroundColor Yellow

# Check Docker for Qdrant and Redis
$dockerVersion = docker --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker available: $dockerVersion" -ForegroundColor Green
    
    # Start development services
    Write-Host "🚀 Starting development services..." -ForegroundColor Yellow
    docker-compose -f tools/docker/docker-compose.dev.yml up -d
} else {
    Write-Host "⚠️ Docker not found. You'll need to manually setup Qdrant and Redis." -ForegroundColor Yellow
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    @"
# Memorai MCP Configuration
NODE_ENV=development

# Server Configuration
PORT=6367
HOST=localhost

# Database Configuration
QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379

# AI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Security
JWT_SECRET=development-secret-change-in-production

# Logging
LOG_LEVEL=debug
LOG_FORMAT=simple
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Created .env file. Please update with your API keys." -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Setup complete! Next steps:" -ForegroundColor Green
Write-Host "   1. Update .env file with your API keys" -ForegroundColor White
Write-Host "   2. Run 'pnpm dev' to start development" -ForegroundColor White
Write-Host "   3. Run 'pnpm demo' to see it in action" -ForegroundColor White
Write-Host ""
