# Script para configurar inicio automático del Stock Screener Server

$scriptPath = $PSScriptRoot
$batchScript = Join-Path $scriptPath "start-server-background.bat"

# Crear acceso directo en la carpeta de inicio
$startupFolder = [System.Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder "Stock Screener Server.lnk"

# Eliminar acceso directo anterior si existe
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
}

$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $batchScript
$shortcut.WorkingDirectory = $scriptPath
$shortcut.Description = "Stock Screener Pro - Auto-start Server"
$shortcut.IconLocation = "$env:SystemRoot\System32\imageres.dll,1"
$shortcut.WindowStyle = 7  # Minimizado
$shortcut.Save()

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  INICIO AUTOMATICO CONFIGURADO" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Acceso directo creado en:" -ForegroundColor White
Write-Host "  $shortcutPath`n" -ForegroundColor Gray

Write-Host "El servidor se iniciara automaticamente cuando enciendas tu PC`n" -ForegroundColor Yellow

Write-Host "Probando el inicio ahora..." -ForegroundColor White
& $batchScript
Start-Sleep -Seconds 3

$process = Get-Process -Name node -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "`nServidor INICIADO correctamente!" -ForegroundColor Green
    Write-Host "  Proceso ID: $($process.Id)" -ForegroundColor Gray
    Write-Host "`nAccede en: http://localhost:3002" -ForegroundColor Cyan
    Write-Host "`nAbriendo navegador..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3002"
} else {
    Write-Host "`nError: El servidor no inicio correctamente" -ForegroundColor Red
    Write-Host "Intenta ejecutar manualmente:" -ForegroundColor White
    Write-Host "  .\run-server.bat`n" -ForegroundColor Gray
}

Write-Host "`nPara desactivar el inicio automatico:" -ForegroundColor White
Write-Host "  .\remove-autostart.ps1`n" -ForegroundColor Gray
