$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$scriptPath = $PSScriptRoot
$vbsPath = Join-Path $scriptPath "Abrir-Stock-Screener.vbs"

# Crear acceso directo .lnk (más profesional que .url)
$shortcutPath = Join-Path $desktopPath "Stock Screener Pro.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $vbsPath
$shortcut.WorkingDirectory = $scriptPath
$shortcut.Description = "Stock Screener Pro - Análisis de Acciones"
$shortcut.IconLocation = "$env:SystemRoot\System32\imageres.dll,1"
$shortcut.Save()

Write-Host "Acceso directo creado en el escritorio!" -ForegroundColor Green
Write-Host "Ubicacion: $shortcutPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora puedes:" -ForegroundColor Yellow
Write-Host "1. Hacer doble clic en el icono del escritorio" -ForegroundColor White
Write-Host "2. Anclar el acceso directo a la barra de tareas (clic derecho > Anclar)" -ForegroundColor White
Write-Host "3. El servidor iniciara automaticamente cada vez que enciendas tu PC" -ForegroundColor White
