# =============================================
# Painel de Rotinas — Gerenciar Servicos
# Uso: .\gerenciar-servicos.ps1 start|stop|restart|status
# =============================================

param([string]$Acao = "status")

$NssmPath = "C:\nssm\nssm.exe"
$Servicos  = @("PainelRotinas-Backend", "PainelRotinas-Frontend")

switch ($Acao.ToLower()) {
  "start" {
    Write-Host "Iniciando servicos..." -ForegroundColor Green
    foreach ($s in $Servicos) { & $NssmPath start $s }
  }
  "stop" {
    Write-Host "Parando servicos..." -ForegroundColor Yellow
    foreach ($s in $Servicos) { & $NssmPath stop $s }
  }
  "restart" {
    Write-Host "Reiniciando servicos..." -ForegroundColor Cyan
    foreach ($s in $Servicos) { & $NssmPath restart $s }
  }
  "status" {
    foreach ($s in $Servicos) {
      $status = & $NssmPath status $s 2>&1
      Write-Host "$s`: $status"
    }
  }
  "uninstall" {
    Write-Host "Removendo servicos..." -ForegroundColor Red
    foreach ($s in $Servicos) {
      & $NssmPath stop   $s 2>$null
      & $NssmPath remove $s confirm 2>$null
    }
  }
  default {
    Write-Host "Uso: .\gerenciar-servicos.ps1 [start|stop|restart|status|uninstall]"
  }
}
