# Script para crear acceso directo en el escritorio

$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$scriptPath = $PSScriptRoot
$targetPath = "http://localhost:3002"

# Crear archivo URL (acceso directo web)
$urlFile = Join-Path $desktopPath "Stock Screener Pro.url"
$urlContent = @"
[InternetShortcut]
URL=$targetPath
IconIndex=0
IconFile=$env:SystemRoot\System32\SHELL32.dll
IconIndex=220
"@

$urlContent | Out-File -FilePath $urlFile -Encoding ASCII

Write-Host "Acceso directo creado en el escritorio!" -ForegroundColor Green
Write-Host ""
Write-Host "Ubicacion: $urlFile" -ForegroundColor Cyan
Write-Host "URL: $targetPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora puedes hacer doble clic en el icono del escritorio para abrir el Stock Screener" -ForegroundColor Yellow
Write-Host ""
Write-Host "Recuerda: El servidor debe estar corriendo (run-server.bat)" -ForegroundColor Gray
