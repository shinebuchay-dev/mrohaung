# ============================================
# Docker Environment Check Script
# ============================================
# This script checks if your system is ready for Docker

Write-Host "Docker Environment Check" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: Docker installed
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "Docker installed: $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "Docker is not installed!" -ForegroundColor Red
    Write-Host "   Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    $allGood = $false
}

Write-Host ""

# Check 2: Docker running
Write-Host "Checking if Docker is running..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1 | Select-String "Server Version"
    if ($dockerInfo) {
        Write-Host "Docker is running" -ForegroundColor Green
    }
    else {
        Write-Host "Docker is not running!" -ForegroundColor Red
        Write-Host "   Please start Docker Desktop" -ForegroundColor Yellow
        $allGood = $false
    }
}
catch {
    Write-Host "Docker is not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop" -ForegroundColor Yellow
    $allGood = $false
}

Write-Host ""

# Check 3: Docker Compose installed
Write-Host "Checking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version
    Write-Host "Docker Compose installed: $composeVersion" -ForegroundColor Green
}
catch {
    Write-Host "Docker Compose is not installed!" -ForegroundColor Red
    Write-Host "   Docker Compose should come with Docker Desktop" -ForegroundColor Yellow
    $allGood = $false
}

Write-Host ""

# Check 4: Required files exist
Write-Host "Checking required files..." -ForegroundColor Yellow

$requiredFiles = @(
    "docker-compose.yml",
    "web/Dockerfile",
    "backend/Dockerfile",
    "nginx/default.conf"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "Found: $file" -ForegroundColor Green
    }
    else {
        Write-Host "Missing: $file" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

# Check 5: Environment file
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host ".env file exists" -ForegroundColor Green
}
else {
    Write-Host ".env file not found" -ForegroundColor Yellow
    Write-Host "   Creating from template..." -ForegroundColor Yellow
    if (Test-Path ".env.docker") {
        Copy-Item ".env.docker" ".env"
        Write-Host ".env file created from template" -ForegroundColor Green
        Write-Host "   Please review and update .env with your settings" -ForegroundColor Cyan
    }
    else {
        Write-Host ".env.docker template not found!" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

# Check 6: Port availability
Write-Host "Checking port availability..." -ForegroundColor Yellow

$ports = @(80, 3000, 3306, 5000)
$portsInUse = @()

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "Port $port is in use" -ForegroundColor Yellow
        $portsInUse += $port
    }
    else {
        Write-Host "Port $port is available" -ForegroundColor Green
    }
}

if ($portsInUse.Count -gt 0) {
    Write-Host ""
    Write-Host "Warning: Some ports are in use" -ForegroundColor Yellow
    Write-Host "   You may need to stop other services or change ports in docker-compose.yml" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "All checks passed! You are ready to start Docker." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review .env file and update if needed" -ForegroundColor White
    Write-Host "2. Run: .\docker-start.ps1" -ForegroundColor White
    Write-Host "   OR" -ForegroundColor Yellow
    Write-Host "   Run: docker-compose up -d" -ForegroundColor White
}
else {
    Write-Host "Some checks failed. Please fix the issues above." -ForegroundColor Red
}

Write-Host ""
