# =============================================
# Painel de Rotinas - Instalar como Servico Windows
# Execute como ADMINISTRADOR no PowerShell
# =============================================

$ProjectDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $ProjectDir "backend"
$FrontendDir = Join-Path $ProjectDir "frontend"
$NssmPath    = "C:\nssm\nssm.exe"
$NodePath    = (Get-Command node).Source

Write-Host "=== Painel de Rotinas - Setup de Servicos ===" -ForegroundColor Cyan
Write-Host "Diretorio: $ProjectDir"

# ----- Verifica NSSM -----
if (-not (Test-Path $NssmPath)) {
    Write-Host "`n[1/4] Baixando NSSM..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "C:\nssm" | Out-Null
    $nssmZip = "$env:TEMP\nssm.zip"
    Invoke-WebRequest -Uri "https://nssm.cc/ci/nssm-2.24-101-g897c7ad.zip" -OutFile $nssmZip
    Expand-Archive -Path $nssmZip -DestinationPath "$env:TEMP\nssm_extract" -Force
    $nssmExe = Get-ChildItem "$env:TEMP\nssm_extract" -Recurse -Filter "nssm.exe" | Where-Object { $_.FullName -like "*win64*" } | Select-Object -First 1
    Copy-Item $nssmExe.FullName $NssmPath
    Remove-Item $nssmZip -Force
    Write-Host "  NSSM instalado." -ForegroundColor Green
} else {
    Write-Host "`n[1/4] NSSM ja instalado." -ForegroundColor Green
}

# ----- Build do frontend -----
Write-Host "`n[2/4] Instalando dependencias e build do frontend..." -ForegroundColor Yellow
Push-Location $FrontendDir
npm install --silent
npm run build
Pop-Location
Write-Host "  Build concluido." -ForegroundColor Green

# ----- Instala serve globalmente -----
Write-Host "`n[3/4] Instalando serve globalmente..." -ForegroundColor Yellow
npm install -g serve --silent
Write-Host "  serve instalado." -ForegroundColor Green

# ----- Instala dependencias do backend -----
Write-Host "`n[4/4] Instalando dependencias do backend..." -ForegroundColor Yellow
Push-Location $BackendDir
npm install --silent
Pop-Location

# ----- Remove servicos antigos -----
Write-Host "`nRemovendo servicos antigos..." -ForegroundColor Yellow
& $NssmPath stop  "PainelRotinas-Backend"  2>$null
& $NssmPath remove "PainelRotinas-Backend" confirm 2>$null
& $NssmPath stop  "PainelRotinas-Frontend" 2>$null
& $NssmPath remove "PainelRotinas-Frontend" confirm 2>$null

# ----- Cria pastas de log -----
New-Item -ItemType Directory -Force -Path "$BackendDir\logs"  | Out-Null
New-Item -ItemType Directory -Force -Path "$FrontendDir\logs" | Out-Null

# ----- Servico Backend -----
Write-Host "`nInstalando servico Backend (porta 3001)..." -ForegroundColor Yellow
& $NssmPath install "PainelRotinas-Backend" $NodePath
& $NssmPath set "PainelRotinas-Backend" AppDirectory  $BackendDir
& $NssmPath set "PainelRotinas-Backend" AppParameters "src\server.js"
& $NssmPath set "PainelRotinas-Backend" DisplayName   "Painel Rotinas - Backend"
& $NssmPath set "PainelRotinas-Backend" Description   "API Node.js do Painel de Rotinas (porta 3001)"
& $NssmPath set "PainelRotinas-Backend" Start         SERVICE_AUTO_START
& $NssmPath set "PainelRotinas-Backend" AppStdout     "$BackendDir\logs\backend.log"
& $NssmPath set "PainelRotinas-Backend" AppStderr     "$BackendDir\logs\backend-error.log"
& $NssmPath set "PainelRotinas-Backend" AppRotateFiles 1
& $NssmPath set "PainelRotinas-Backend" AppRotateBytes 10485760

# ----- Servico Frontend -----
Write-Host "Instalando servico Frontend (porta 3000)..." -ForegroundColor Yellow
& $NssmPath install "PainelRotinas-Frontend" "cmd.exe"
& $NssmPath set "PainelRotinas-Frontend" AppDirectory  $FrontendDir
& $NssmPath set "PainelRotinas-Frontend" AppParameters "/c serve -s dist -l 3000"
& $NssmPath set "PainelRotinas-Frontend" DisplayName   "Painel Rotinas - Frontend"
& $NssmPath set "PainelRotinas-Frontend" Description   "Frontend React do Painel de Rotinas (porta 3000)"
& $NssmPath set "PainelRotinas-Frontend" Start         SERVICE_AUTO_START
& $NssmPath set "PainelRotinas-Frontend" AppStdout     "$FrontendDir\logs\frontend.log"
& $NssmPath set "PainelRotinas-Frontend" AppStderr     "$FrontendDir\logs\frontend-error.log"

# ----- Inicia servicos -----
Write-Host "`nIniciando servicos..." -ForegroundColor Yellow
& $NssmPath start "PainelRotinas-Backend"
Start-Sleep -Seconds 3
& $NssmPath start "PainelRotinas-Frontend"

# ----- Status -----
Write-Host "`n=== Status ===" -ForegroundColor Cyan
& $NssmPath status "PainelRotinas-Backend"
& $NssmPath status "PainelRotinas-Frontend"

Write-Host "`nPronto!" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:3001"
Write-Host "  Frontend: http://localhost:3000"
Write-Host "  Logs: $BackendDir\logs\"
