$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$scriptPath = $PSScriptRoot
$managerScript = Join-Path $scriptPath "Stock-Screener-Manager.ps1"

# Crear acceso directo mejorado
$shortcutPath = Join-Path $desktopPath "Stock Screener Manager.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$managerScript`""
$shortcut.WorkingDirectory = $scriptPath
$shortcut.Description = "Administrador del Stock Screener Pro"
$shortcut.IconLocation = "$env:SystemRoot\System32\imageres.dll,1"
$shortcut.Save()

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ACCESO DIRECTO CREADO" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Icono creado en el escritorio:" -ForegroundColor White
Write-Host "  'Stock Screener Manager'`n" -ForegroundColor Yellow

Write-Host "Con este icono puedes:" -ForegroundColor White
Write-Host "  - Ver el estado del servidor (corriendo/detenido)" -ForegroundColor Gray
Write-Host "  - Iniciar el servidor con un clic" -ForegroundColor Gray
Write-Host "  - Detener el servidor" -ForegroundColor Gray
Write-Host "  - Abrir el screener en el navegador" -ForegroundColor Gray
Write-Host "  - Configurar inicio automatico`n" -ForegroundColor Gray

Write-Host "Abriendo ahora..." -ForegroundColor Green
Start-Sleep -Seconds 1

# Ejecutar el manager
powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File $managerScript
