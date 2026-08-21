# Script para eliminar la tarea programada del inicio automático

$taskName = "Stock Screener Server"

$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    # Detener el servidor si está corriendo
    $nodeProcess = Get-Process -Name node -ErrorAction SilentlyContinue
    if ($nodeProcess) {
        Write-Host "Deteniendo servidor..." -ForegroundColor Yellow
        Stop-Process -Name node -Force
        Start-Sleep -Seconds 1
    }
    
    # Eliminar la tarea
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "`nInicio automatico DESACTIVADO" -ForegroundColor Green
    Write-Host "La tarea '$taskName' ha sido eliminada`n" -ForegroundColor White
} else {
    Write-Host "`nNo se encontro ninguna tarea de inicio automatico configurada" -ForegroundColor Yellow
}

Write-Host "Para volver a activarlo:" -ForegroundColor Cyan
Write-Host "  .\setup-autostart-task.ps1`n" -ForegroundColor Gray
