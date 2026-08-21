# Script para configurar inicio automático usando el Programador de Tareas de Windows

$taskName = "Stock Screener Server"
$scriptPath = $PSScriptRoot
$nodePath = (Get-Command node).Source
$serverPath = Join-Path $scriptPath "server.js"

# Eliminar tarea existente si existe
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Tarea anterior eliminada" -ForegroundColor Yellow
}

# Crear acción: ejecutar node server.js
$action = New-ScheduledTaskAction -Execute $nodePath -Argument "`"$serverPath`"" -WorkingDirectory $scriptPath

# Crear trigger: al iniciar sesión
$trigger = New-ScheduledTaskTrigger -AtLogOn

# Configuración de la tarea
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

# Registrar la tarea
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Inicia el servidor del Stock Screener Pro automáticamente" -Force

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  INICIO AUTOMATICO CONFIGURADO" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Tarea programada creada: $taskName" -ForegroundColor White
Write-Host "El servidor se iniciara automaticamente cuando:" -ForegroundColor Yellow
Write-Host "  - Enciendas tu PC" -ForegroundColor White
Write-Host "  - Inicies sesion en Windows`n" -ForegroundColor White

Write-Host "Para verificar la tarea:" -ForegroundColor Cyan
Write-Host "  1. Presiona Win + R" -ForegroundColor Gray
Write-Host "  2. Escribe: taskschd.msc" -ForegroundColor Gray
Write-Host "  3. Busca 'Stock Screener Server'`n" -ForegroundColor Gray

Write-Host "Iniciando servidor ahora..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 3

$process = Get-Process -Name node -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "`nServidor INICIADO correctamente!" -ForegroundColor Green
    Write-Host "Accede en: http://localhost:3002`n" -ForegroundColor Cyan
} else {
    Write-Host "`nEsperando que el servidor inicie..." -ForegroundColor Yellow
    Write-Host "Accede en: http://localhost:3002 en unos segundos`n" -ForegroundColor Cyan
}

Write-Host "Para desactivar:" -ForegroundColor White
Write-Host "  .\remove-autostart-task.ps1`n" -ForegroundColor Gray
