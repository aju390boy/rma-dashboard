# RMA Dashboard Startup Script
# Run this ONCE at the start of each development session

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  RMA Dashboard - Dev Startup" -ForegroundColor Cyan  
Write-Host "==================================" -ForegroundColor Cyan

$dbPath = "$env:USERPROFILE\mongodb-rma"

# 1) Ensure DB directory exists
New-Item -ItemType Directory -Force -Path $dbPath | Out-Null

# 2) Check if mongod is already running on 27018
$portTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 27018 -InformationLevel Quiet -WarningAction SilentlyContinue 2>$null
if ($portTest) {
    Write-Host "[✅] MongoDB already running on port 27018" -ForegroundColor Green
} else {
    Write-Host "[...] Starting MongoDB replica set on port 27018..." -ForegroundColor Yellow
    Start-Process -FilePath "mongod" -ArgumentList "--replSet rs0 --port 27018 --dbpath `"$dbPath`" --bind_ip 127.0.0.1 --quiet" -WindowStyle Minimized
    Start-Sleep -Seconds 4
    
    # Initialize replica set if needed
    $rsStatus = mongosh --port 27018 --quiet --eval "rs.status().ok" 2>$null
    if ($rsStatus -ne "1") {
        Write-Host "[...] Initializing replica set..." -ForegroundColor Yellow
        mongosh --port 27018 --quiet --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27018' }] })" | Out-Null
        Start-Sleep -Seconds 2
    }
    Write-Host "[✅] MongoDB replica set (rs0) is PRIMARY" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Yellow
Write-Host ""
Write-Host "[SERVER] http://localhost:5000" -ForegroundColor Magenta
Write-Host "[CLIENT] http://localhost:5173" -ForegroundColor Magenta
Write-Host ""
Write-Host "Demo credentials:" -ForegroundColor Cyan
Write-Host "  Admin:   admin@rma.dev   / Admin@123" -ForegroundColor White
Write-Host "  Support: support@rma.dev / Support@123" -ForegroundColor White
Write-Host ""

# Start both servers with concurrently
$serverPath = Join-Path $PSScriptRoot "server"
$clientPath = Join-Path $PSScriptRoot "client"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serverPath'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$clientPath'; npm run dev" -WindowStyle Normal

Write-Host "[✅] Both servers launching in new windows!" -ForegroundColor Green
Write-Host "Opening browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
