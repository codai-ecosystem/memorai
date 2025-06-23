#!/usr/bin/env pwsh

# Memorai Project Cleanup Script - Phase 1: Documentation Cleanup
# This script removes redundant documentation files safely

Write-Host "🧹 Starting Memorai Project Cleanup - Phase 1: Documentation" -ForegroundColor Green

# Define files to remove (redundant status reports)
$FilesToRemove = @(
    "CRITICAL_FIXES_COMPLETION_REPORT.md",
    "FINAL_COMPLETION_REPORT.md", 
    "FINAL_PRODUCTION_READY_REPORT.md",
    "MISSION_ACCOMPLISHED.md",
    "PRODUCTION_READINESS_COMPLETION_REPORT.md",
    "PROJECT_STATUS.md"
)

# Create backup directory
$BackupDir = "cleanup-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
Write-Host "📁 Created backup directory: $BackupDir" -ForegroundColor Yellow

# Backup and remove files
foreach ($file in $FilesToRemove) {
    if (Test-Path $file) {
        Write-Host "🔄 Processing: $file" -ForegroundColor Cyan
        
        # Create backup
        Copy-Item $file -Destination "$BackupDir\$file"
        Write-Host "   ✅ Backed up to: $BackupDir\$file" -ForegroundColor Green
        
        # Remove original
        Remove-Item $file -Force
        Write-Host "   🗑️ Removed: $file" -ForegroundColor Red
    } else {
        Write-Host "   ⚠️ File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "📊 Phase 1 Documentation Cleanup Complete!" -ForegroundColor Green
Write-Host "   - Files backed up to: $BackupDir" -ForegroundColor Gray
Write-Host "   - Redundant documentation removed" -ForegroundColor Gray
