# SupportAI - Start Script (Windows PowerShell)
# Run this script to start both backend and frontend

Write-Host "Starting SupportAI Platform..." -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path "backend/.env")) {
    Write-Host "Creating .env from example..." -ForegroundColor Yellow
    Copy-Item "backend/.env.example" "backend/.env"
    Write-Host "IMPORTANT: Edit backend/.env and add your OPENAI_API_KEY!" -ForegroundColor Red
}

# Start backend
Write-Host "`nStarting Backend (port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\backend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start frontend
Write-Host "Starting Frontend (port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\frontend'; npm run dev" -WindowStyle Normal

Write-Host "`nSupportAI is starting!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "`nDefault credentials:" -ForegroundColor Yellow
Write-Host "  Admin:  admin@supportai.com / Admin@123456" -ForegroundColor White
Write-Host "  Demo:   demo@acme.com / Demo@123456" -ForegroundColor White
Write-Host "`nNote: Run 'npm run seed' in the backend folder to create default accounts" -ForegroundColor Yellow
