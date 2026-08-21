# Script para remover inicio automático del Stock Screener Server

$startupFolder = [System.Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder "Stock Screener Server.lnk"
$vbsScript = Join-Path $PSScriptRoot "start-hidden.vbs"

if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "✅ Inicio automático desactivado" -ForegroundColor Green
} else {
    Write-Host "⚠️  No se encontró el inicio automático configurado" -ForegroundColor Yellow
}

if (Test-Path $vbsScript) {
    Remove-Item $vbsScript -Force
}

Write-Host ""
Write-Host "El servidor ya no iniciará automáticamente con Windows" -ForegroundColor Gray
Write-Host "Para iniciarlo manualmente, ejecuta: run-server.bat" -ForegroundColor Cyan
