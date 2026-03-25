# Next.js Standalone Packaging Script for Hostinger
# Run this after 'npm run build' inside the 'web' directory

$standalonePath = ".next/standalone"
$targetPath = "dist_standalone"

# Check if standalone directory exists
if (-not (Test-Path $standalonePath)) {
    Write-Host "Error: .next/standalone not found. Ensure 'output: standalone' is in next.config.ts and you ran 'npm run build'." -ForegroundColor Red
    exit
}

Write-Host "Starting packaging for Hostinger..." -ForegroundColor Cyan

# Create a clean distribution folder
if (Test-Path $targetPath) { Remove-Item -Recurse -Force $targetPath }
New-Item -ItemType Directory -Path $targetPath

# 1. Copy the standalone files
Write-Host "Copying standalone core files..."
Copy-Item -Recurse "$standalonePath/*" $targetPath

# 2. Copy the public folder (Next.js does not include this in standalone by default)
Write-Host "Copying public folder..."
if (Test-Path "public") {
    Copy-Item -Recurse "public" "$targetPath/public"
}

# 3. Copy the static assets
Write-Host "Copying static assets..."
if (Test-Path ".next/static") {
    $staticDir = "$targetPath/.next/static"
    New-Item -ItemType Directory -Path $staticDir -Force
    Copy-Item -Recurse ".next/static/*" $staticDir
}

Write-Host "Successfully packaged to /$targetPath" -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "1. Zip the contents of the '$targetPath' folder."
Write-Host "2. Upload and extract to Hostinger's public_html."
Write-Host "3. Set the application startup file to 'server.js' in the Hostinger panel."
